# 0081 — The admin console: one external home, three tier-gated sections

**Date:** 2026-07-27 · **Status:** RULED (owner, the walk-4 settlement sitting) · **Owner:** Aiden
**Companion:** the proposal this rules on —
[`m6/p7-admin-console-proposal.md`](../planning/m6/p7-admin-console-proposal.md) (§7's six open
questions are the ones answered below) · the sitting's minutes —
[`m6/walk4-acceptance-notes.md`](../planning/m6/walk4-acceptance-notes.md) §"walk-4 SETTLEMENT
SITTING" · supersedes the **in-app** wording of MOD-04 set by
[0033](0033-moderator-role-lifecycle.md)/[0034](0034-admin-tier-model.md).

---

## 1. The ruling

**ONE console, hosted OUTSIDE the app, with three tier-gated sections built in milestone order.**

| Section | When | What | Tier |
|---|---|---|---|
| **Ops** | **now (M6 P7 v1)** | Spotlight curation · a read-only live-stats dashboard · a read-only reports viewer · **MOD-08 card takedown** | I–IV |
| **Moderation** | M7 | the action verbs (resolve/hide/restore · suspend · merge · the MOD-11..15 remediation set · the MOD-16 edits queue) | I–II |
| **Operator** | when the need arrives | the §10 P3/P4/P5 capabilities (ECON-11 economy adjustments · config/authoring · governance), behind a **sudo re-auth gate** | III–IV |

Two things this changes from the proposal:

1. **The §10 external OPERATOR tool folds IN** as the third section. The proposal recommended two
   surfaces (console + a separate operator tool); the owner ruled one surface with a re-auth gate
   guarding the money/config/governance section. Fewer surfaces to build, host, and secure — and the
   sudo gate, not the hostname, is what actually separates blast radii.
2. **MOD-04's "in-app" wording is re-scoped**, not merely reinterpreted. The phone app keeps only the
   **PROF-09 badge**; an in-app deep-link to the console is an optional later convenience. Admin code
   never enters the shipped bundle.

**The v1 cut** = the proposal's five pre-beta rows **plus** three owner additions: **MOD-08 card
takedown** pulled forward as the beta's one UGC safety valve, a **crude DAU** number, and
**Spotlight moved to the database** so curation is a live write rather than a redeploy.

**Timing:** build against the dev stack now; deploy to Cloudflare Pages when P15/G-C lands.

## 2. The six proposal questions, answered

1. **Console home** — external SPA, primary home for all three sections. MOD-04 re-scoped (above).
2. **How minimal is v1** — the five rows **+ card takedown**. No other M7 verb pulled forward.
3. **A real DAU number** — yes, the crude one: a `users.last_seen_at` column + a throttled stamp.
   True DAU/MAU/retention/funnel stays routed to **PostHog** on the ACH-08 spine; the tile must not
   be mistaken for it.
4. **Spotlight storage** — move it to a `server_settings` kv now. Reading order is
   **DB → the `SPOTLIGHT_IDS` config seed → the newest-N fallback**, so the store is byte-identical
   until an admin writes; the config constant becomes the seed, not the source.
5. **Who is the admin** — the owner self-grants out-of-band (§4). Confirmed: no grant endpoint, in
   the app or the console, ever (decision 0033 stands).
6. **Timing vs P15** — build now against dev; ship to Pages with P15.

## 3. What the build actually added (server half, M6 P7)

- **The auth spine.** `requireAdminTier(n)` (`apps/api/src/auth/admin.ts`) — SYS-08's first real
  reader. Tiers are nested (I ⊂ II ⊂ III ⊂ IV) and every malformed shape fails closed. **The tier is
  read from the user row per request, not from the JWT**: a stateless role claim would keep a revoked
  admin powerful for the rest of the token's TTL, and one primary-key read on a surface with a
  handful of callers is a cheap price for same-request revocation.
- **A new router**, `/api/admin/*`, mounted in `app.ts`.
- **`server_settings`** (global kv) · **`users.last_seen_at`** · **`card_designs.moderation_hidden_at`**
  (migration `0025_eminent_doctor_faustus.sql` — additive).
- **Two audited writes** — `spotlight.update` and `card.takedown`/`card.restore`. These are the first
  callers of the MOD-10 `ctx.audit` seam, which has been built and unused since M2.
- **MOD-08 semantics.** `moderation_hidden_at` is deliberately **separate from `status`** so a restore
  returns the card to exactly the lifecycle state its designer left it in. Two read seams honour it:
  `publishedOnly()` (every public/gallery/adopt/share read) and the adopter-facing card reads — so an
  adopter's equipped card **falls back per CARD-18**, which is MOD-08's own stated exception, while
  their grant and entitlements are untouched.
- **The restore verb was minted here**, not drawn earlier. The api-contract drew `takedown` alone; the
  MOD-02 `hide`/`restore` pair establishes the grammar, and a one-way pull whose only correction is a
  hand-written UPDATE is a trap. Recorded as an addition, not an inference.

## 4. The self-grant (the runbook line)

Role/tier assignment is **out-of-band** — there is no endpoint, by decision 0033. To make an account
an Admin IV, run this against the target database:

```sql
UPDATE users SET role = 'admin', admin_tier = 4 WHERE email = 'you@example.com';
```

To revoke: `UPDATE users SET role = 'user', admin_tier = NULL WHERE email = '…';` — it takes effect on
the account's **next request** (the gate re-reads the row every time). Tier values are `1..4`
(I Content · II Catalog · III Support · IV Platform).

## 5. The fifth door (the one thing that wants the owner's eye)

SYS-01 has four sanctioned cross-user read doors (public-read, friend-read, auth-lookup,
community-aggregate). The admin console needs a fifth, and unlike the others **it admits a write**
(the takedown) and **carries no row predicate** — no SQL clause can express "the caller is a tier-N
admin".

The trade, made explicit:

- a `// SYS-01-ADMIN-OP` marker was added to the rule-2 scoping lint, honoured **only inside
  `repositories/admin-repo.ts`** — the same confinement pattern as `SYS-01-AUTH-LOOKUP`, with a
  misuse fixture and unit tests proving it fails closed anywhere else;
- that file is deliberately tiny and reviewable in one sitting;
- everything reaching it is behind `requireAdminTier(n)`, covered by a **standing admin-class authz
  sweep** (every route probed as a plain user → 403 and unauthenticated → 401 — reads included);
- every write through it also writes a MOD-10 audit row in the same transaction.

This is an **auth/SYS-01-class change** (CONVENTIONS' owner-approval list). It is inside the ruling's
approved scope — the console cannot exist without a cross-user read class — but the owner should know
the fifth door exists and where its walls are, rather than discovering it in a diff.

## 6. Known gaps, recorded not hidden

- **SYS-11 feedback capture does not exist** (no table, no route, no code — grep-confirmed). The
  viewer is therefore scoped to **reports only**; `GET /admin/feedback` is NOT built. Building the
  capture is its own piece of work and was explicitly out of this lane.
- ~~No SPA yet~~ **The SPA landed in the same wave** — `apps/admin` (`@ingame/admin`, Vite/React):
  the Ops section live (Stats · Reports+takedown · Spotlight) with the Moderation/Operator sections
  stubbed in the shell per the three-section ruling. Dev origin `http://localhost:5173` admitted in
  `DEV_CORS_ORIGINS`; deploys to Cloudflare Pages when P15/G-C lands.
- **The owner's own surfaces still show a taken-down card** on their My Designs shelf (it is their
  row; the MOD-13 "here is why" notice is an M7 verb). Public reads, adopter reads, and share are all
  closed.
- **No rate-limit buckets** on `/admin/*`: the limiter is IP-keyed and the surface is tier-gated, so a
  bucket would throttle the console's own dashboard refreshes without adding real protection.

**Consumed by:** the P7 client half (the external SPA) · M7's moderation console phase (same router,
same gate, same audit seam).
