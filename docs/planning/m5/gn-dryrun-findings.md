# G-N DRY-RUN — AUTH-07 deletion-ripple against the M5 tables (2026-07-13)

> **Gate:** G-N (M5 build-task §5 · road-to-market §11) — *"AUTH-07 deletion-ripple walked against the
> NEW M5 tables on a scratch DB — no orphaned adopters, no retained PII; findings feed the M8 gate,
> nothing ships broken."*
> **This is an INVESTIGATION, not a build.** No product code changed. The walk ran on a throwaway
> Testcontainers Postgres (migrations 0000→0012), seeded a full cross-user scenario, exercised the two
> candidate deletion primitives, and audited every table + the gallery read against AUTH-07's intent.
> **Authority:** product-spec **AUTH-07** (the deletion ripple) · **MOD-08** (adopters keep their
> flattened card + grant) · **CAT-05** (contributor credit anonymized) · schema `apps/api/src/db/schema.ts`.

## Headline (read this first)

1. **There is NO account-deletion path today.** No `DELETE /me` / deactivate route exists; nothing in the
   codebase ever SETS `users.deletedAt`. The column + the read-side plumbing (`authorShapeFor`,
   auth-service `deletedAt` rejection, GET /users/:id → NotFound) were built in M2 anticipating AUTH-07,
   but the **write side is entirely unbuilt**. AUTH-07 is a Settings surface → **M6+/M8 work**. So this
   dry-run's primary product is the **inventory + trap-map below**, which IS the M8 implementation checklist.
2. **Nothing is broken for a normal user TODAY** — because no user can reach any deletion path. No 500 is
   reachable. The soft-delete tombstone, even if set manually, does not 500 the gallery (verified: 200).
3. **The single biggest M8 landmine: `authorShapeFor` is dead code.** It was built + unit-tested to
   anonymize a deleted author's username, but it is wired into **ZERO** read paths — every designer-
   attribution site (gallery, trending, my-cards, share-image compositor) reads `users.username` **raw**
   from a join, and `publishedOnly` filters only on `status='published'`, never on `users.deletedAt`.

## The scenario (what the scratch DB was seeded with)

User **A** = the deletee. **B** = adopter of A's card + a designer A adopted from. **C** = a user A blocked.
- A contributed catalog game **G** (CAT-05) and **published card CA** (flattened to disk).
- B added G, **adopted CA, and EQUIPPED it** (`collection_entries.active_card_design_id = CA`).
- B published card **CB**; A added G and **adopted CB**.
- A **blocked C**.
- A seeded with: wallet (balance 42), 2 currency-ledger rows, 1 IAP receipt, 1 entitlement, 1 refresh token.

## Findings table (behavior observed vs AUTH-07 intent · severity)

| # | Probe / table | Behavior OBSERVED on the scratch DB | AUTH-07 intent | Severity |
|---|---|---|---|---|
| 0 | **Deletion path** | No route sets `deletedAt`; no delete endpoint. Full scenario build → 0 tombstoned rows. | Deletion available in Settings | **M8-work** (build it) |
| 1 | **B's adoption of CA + equipped face** (MOD-08) | Naive "delete the deletee's cards" (`DELETE card_designs WHERE id=CA`) **CASCADES**: B's adoption `1→0`, B's `active_card_design_id` **SET NULL** (face silently lost). `card_adoptions.card_design_id` is `ON DELETE CASCADE`. | B **keeps** flattened card + grant | **M8-blocker** (trap to avoid) |
| 2 | **A's published card — attribution** | P-SOFT tombstone: gallery returns **200**, CA **still listed** (tombstone doesn't unpublish), `designer.username` = **A's REAL username**. `authorShapeFor` not wired; `publishedOnly` ignores `deletedAt`. | Card **unpublished**; attribution **anonymized** | **M8-blocker** (leak + un-unpublish) |
| 3 | **Raw `DELETE FROM users`** | **REJECTED** — pg `23503` on `games_created_by_users_id_fk` (non-cascading FK). Catalog contribution physically **blocks** a hard delete. | Community contributions persist anonymized | **fine-as-is** (proves anonymize-not-delete is mandatory) |
| 4 | **A's adoptions of B's cards** (`card_adoptions` adopter side) | `adopter_id` FK is `ON DELETE CASCADE` → a hard delete would silently **drop** A's rows, dropping B's **all-time** adoption count. But the M5 `revokedAt` design says a revoked row **stays** in the count. Tension. | Deletee's private grant removed **without** dishonoring B's clout | **M8-work** (revoke, don't hard-delete A's adoptions) |
| 5 | **A's blocks** (`user_blocks`) | Soft tombstone leaves A→C block **orphaned** (C stays filtered by a ghost). Hard delete cascades them clean. | Not explicitly named in the kept-set | **M8-work** (minor — clear A's outgoing blocks) |
| 6 | **Share-image cache** | A's flattened `cards/<CA>/full.png` remains on disk **orphaned** after the card row is deleted (no storage cleanup hook). | (implicit — no retained artifacts) | **M8-work** (delete flattened media) |
| 7 | **Login/auth artifacts** | auth-service already rejects login/refresh when `deletedAt` set (a tombstone kills sessions functionally). `refresh_tokens` rows are **not** explicitly `revokedAt`-stamped, but are unusable. | Sessions invalidated | **fine-as-is** (M8 nicety: explicit family revoke) |
| 8 | **PII / financial "kept set"** | wallet, currency_ledger, iap_receipts, user_entitlements all `ON DELETE CASCADE` on `user_id` → a hard delete nukes financial records; a soft tombstone **retains all PII** untouched. | Wallet is in the **hard-delete** set; but financial/receipt records are typically **retained** for audit/tax | **M8-work** (owner privacy ruling needed — see below) |
| 9 | **Gallery mid-ripple 500?** | No. P-SOFT gallery = 200; post-card-delete the gallery simply omits CA (no row) and B's switcher degrades to the CARD-18 default face. No crash anywhere. | — | **fine-as-is** |

## Per-table M8 checklist (what the AUTH-07 implementation must touch)

**HARD-DELETE (private) set** — `collection_entries`, `gamertags`, `friendships` (both dirs),
`device_configs`, `device_looks`, `style_presets`, `refresh_tokens` (+ explicit family revoke),
`auth_tokens`, `auth_identities`, push tokens (when they land). All already `ON DELETE CASCADE` — a
`users` soft-tombstone will NOT trigger these; M8 must delete them explicitly (or the tombstone leaves
them all resident).

**ANONYMIZE-AND-KEEP (community) set** —
- `games.created_by` → keep pointing at the tombstoned `users` row (the RESTRICT FK forces this); the
  read path must resolve the author via `authorShapeFor` (CAT-05). **`games_created_by_users_id_fk` is
  why a raw user-delete is impossible — the tombstone approach is mandated by the schema.**
- `card_designs` (published) → **flip status off `published`** (so `publishedOnly` drops it from the
  gallery) but **do NOT delete the row** (deleting it cascades B's adoption — finding #1). Adopters keep
  their grant because the row survives; attribution must anonymize (finding #2).
- `card_adoptions` where A is the **adopter** → set `revokedAt`, do **not** hard-delete (keeps B's
  all-time count honest — finding #4).

**RETAIN-OR-RULE (financial) set** — `wallets`, `currency_ledger`, `iap_receipts`,
`user_entitlements`. AUTH-07 lists "wallet" in the hard-delete set, but IAP receipts + the ledger are
the audit/refund/tax trail. **Flag for the M8 privacy ruling:** hard-delete the balance/entitlements but
retain (or anonymize-in-place) the receipt/ledger financial records? Needs an owner decision.

**MEDIA** — the flattened share-image + thumb on the StorageProvider must be swept when a card row is
removed (finding #6 — no cleanup hook exists today).

## The single most important M8 item

**Wire `authorShapeFor` (or an equivalent `users.deletedAt IS NULL` guard) into the four designer-
attribution read paths, and make AUTH-07 flip published cards to a non-`published` status rather than
delete them.** These two together are the whole "adopters keep their card + designer anonymized"
(MOD-08/CAT-05) contract. Today the anonymization seam exists but guards nothing, and the only way the
schema lets you remove a card (a hard delete) is exactly the operation that destroys the adopters'
grants. Get these two right and findings #1 + #2 both close.

## Reproduction

The scenario script is preserved at:
- session scratchpad: `…/scratchpad/gn-dryrun-scratch.test.ts`
- full source embedded in the **Appendix** below.

To re-run (needs Docker for Testcontainers):
```
# copy the appendix script to apps/api/test/integration/gn-dryrun-scratch.test.ts, then:
npx vitest run --project integration gn-dryrun-scratch
```
Observed result: **4 passed** — INVENTORY (no deletion service), P-SOFT (gallery 200 + username leak),
P-HARD-1 (`DELETE FROM users` rejected by `games_created_by_users_id_fk`, pg 23503), P-HARD-2 (card
delete cascades B's adoption `1→0` + nulls the equip + orphans the share-image). No product code was
modified; the scratch test file was deleted from the repo after the run (this doc is the record).

## Appendix — the scenario script (verbatim)

```ts
// apps/api/test/integration/gn-dryrun-scratch.test.ts  (throwaway — deleted after the run)
// See the session scratchpad for the runnable copy. Key mechanics:
//   beforeAll: PostgreSqlContainer('postgres:16-alpine') → DATABASE_URL → runMigrations() → createApp()
//   beforeEach: resetDb() + resetRateLimitStore() + clearRuleOverrides()
//   buildScenario(): register A/B/C · seedGame(A) · publish CA(A) · B adopt+equip CA ·
//                    publish CB(B) · A adopt CB · A block C ·
//                    direct-insert A's wallet/2×ledger/iap_receipt/entitlement.
//
// it('INVENTORY') — asserts 0 rows with deleted_at after a full build (no deletion path sets it).
// it('P-SOFT')    — UPDATE users SET deleted_at=now() WHERE id=A;
//                   GET /api/games/:g/cards as B → 200, CA present, designer.username === A's real name.
// it('P-HARD-1')  — DELETE FROM users WHERE id=A → throws; pg code 23503,
//                   constraint 'games_created_by_users_id_fk'.
// it('P-HARD-2')  — DELETE FROM card_designs WHERE id=CA →
//                   adoptionsOfCard(CA) 1→0 · collection_entries.active_card_design_id → null ·
//                   flattened cards/<CA>/full.png still on disk (orphaned).
```
