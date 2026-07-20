# M6 wave — review-coverage trace (2026-07-19)

> Owner asked: has all the last-two-days work met our quality bar (Murr = code audit · Parvati =
> screen parity)? This traces every packet → its Murr + Parvati status → what's owed. Built from the
> `git log --since 2026-07-18` feature commits.

## The two gates
- **Murr** (`shipwright/skills/murr`) — adversarial code audit, runtime-bugs-first. Fresh-context agent over a diff.
- **Parvati** (`.claude/skills/parvati`) — screen parity vs mockup + DoD, from screenshots of the running app.
  Was DARK all session (browser wedge, root-caused + fixed 2026-07-19 — see qa-runbook). Now runnable via
  claude-in-chrome + settle-wait.

> **AUDIT RECONCILE (2026-07-19, next-session integrity pass):** the Murr/Parvati passes below all RAN
> in-session but this doc was written mid-run and left stale. Corrected here. Two verdicts lived only in
> ephemeral agent runs (empty/uncommitted on disk) — cited by agent id + confirmed for the record.

## Coverage matrix — BOTH GATES CLOSED

| Packet | Commits | Murr — done | Parvati — done |
|---|---|---|---|
| **Wave D** adaptive game page + review pass | 934aa5f · 9c8d542 · 5b26ae1 · f9f6bcd | ✅ adversarial workflow (GO) | ✅ batch1 (Game-page OWN); CATALOG/FRIEND postures not re-exercised (validated in the prior consolidated walk) |
| **Round-5** Profile/genres/Game/UpNext | 127ec8f · 55ab96b · d2d77b7 · dfebb37 · 9e00319 | ✅ wave-audit — **2 HIGH, both genres** (`profileApi.ts:45` out-of-order clobber + `:47` error-overlap wipe) → fixed 3fb15d2 | ✅ batch1 (Profile · Collection · Up Next · Game page) |
| **Round-5** dev-copy A/B/C + D-bucket (RATING/adoption/drops) | strip · 1aa5e38 · 3fc5c1d · 57c2a1a | ✅ wave-audit | ✅ batch1 (RATING dossier · Collection) + batch2 (Store buy pages) |
| **W-1** Contributor VIEW ALL | 6b161fb | ✅ wave-audit | ✅ batch2 (Friends → MY CONTRIBUTIONS → VIEW ALL full lists) |
| **W-4** Monogram Forge | 57d6602 · 4c28e70 · 6aa7082 | ✅ wave-audit (found the list-row gap → fixed 6aa7082) | ✅ batch1 (forge UI) + batch2 (list rows) — **CAVEAT: no seeded user has a forged avatarConfig, so the row-monogram COLOUR is unverified (plumbing confirmed)** |
| **Auth epic** P-A/P-B/P-D (server) | e98fec4 · 3805591 · 01fae0e | ✅ wave-audit (found+fixed 2 MED) | n/a — server; client screens = the P-C/P-E row below |
| **Auth epic P-C/P-E (client)** forgot-password · SIWA · choose-username | 3da8ff3 | ✅ fresh-context adversarial (GO — 0 blocker/major · 4 MED found→fixed IN the same commit, each with a fails-pre-fix regression test · 2 owner-calls below) | ✅ dedicated sweep (CLEAN — 0 🚩 · 3 🎨 owner-eye; all beats reached incl. a live code from the stub-email log through S3+seal; full detail in [`m6-review-notes.md`](../m6-review-notes.md)) |
| **W-6** wiki game-editing | 53da735 | ✅ adversarial (GO) + wave-audit quality lens | ✅ batch2 (Add-Game → CATALOG game page → AboutTab EDIT) |
| **Murr fixes** (2 HIGH genres · 2 MED auth · W-6 · W-4) | 3fb15d2 · f8a7e0d · d6a18b8 · 6aa7082 | ✅ **RE-MURR: `all_closed: true`** — each closed with a regression test that fails against pre-fix code; agent **`aab36fc085b8d47d9`** (its on-disk output is empty — the verdict is recorded here + in this session's transcript notification). 2 low residuals → OQ-159. | rides the screen Parvati above |
| **walk2 waves A/B/C** owner-walk fixes | 0d9438d · a5f8794 · bba9774 · f3be7b3 · c9acce2 · 477bfad · a5e4faf · c8f4fe1 · abff0c0 · a49bf8c · 50fd467 · edd9710 · 47d7a36 · 66cd26a · 94ef76b · dc05436 · e4ab962 · 5a3d878 | ✅ **Murr walk2 audit — SOUND** (0 blocker/major; 5 lows → OQ-157/158 filed + OQ-159 residuals); agent **`ac83ae79bfcc75d00`** | owner device-walks were the parity check; the logic-bearing screens are also covered by batch1/2 above |
| pre-compaction overnight M6 build (P1–P13) | (earlier) | §4 privacy cross-audit + gate reviews | ✅ reviewed+parvati'd per m6 receipts (memory) |

## The Parvati sweep — what actually happened (2 agent batches, 8 screens)
- **Batch 1** (agent `a3c596794a3d19e04`): Collection · Game-page OWN · Profile · Up Next. **0 🚩 flags.**
- **Batch 2** (agent `a9fc2bf0288c5b695`): Store · Friends/Feed · Add Game · Device. **1 🚩 flag** (the Profile
  CONTRIBUTIONS teaser count) + ~9 🎨 polish (ADD-colour, "1 FRIEND HAS IT" grammar, nested-`<button>`, BRASS
  truncation, DECAL-ZONE overlap, …). NOT "one finding" — one 🚩 + polish.
- **Fixes shipped** for the flag + owner-ruled polish: `57c7a31` (teaser → `cardsPublished`) + `e92ae60`
  (client: teaser render · ADD→gold [owner ruling, reverses D-4 orange · walk2-notes:295] · grammar ·
  nested-button · BRASS/DECAL polish).
- **Two verification GAPS (owner's eye / a richer seed closes both):** (1) no seeded user has a forged
  avatarConfig → row-monogram colour unverified; (2) no card is adopted-from-another-designer → W-A1
  "You→real designer" is code-confirmed (da51928) but not seen on screen.
- Owner-option items left open: "H" vs "HRS" unit label; the now-playing pin's KEPT `▶ NOW` badge.

## Definitive green at HEAD (re-run 2026-07-19 at `6a1a502`)
**typecheck PASS · unit 270 · mobile 677 · integration 519.** (The handoff prompt's earlier 269/676/518 and
269/677/519 were both stale/mis-transcribed — this is the real count.)

## Auth-epic client pass (2026-07-19 evening, `3da8ff3`) — BOTH GATES CLOSED AT LANDING
- **Murr** (fresh-context adversarial): **GO — 0 blocker/major · 4 MED · 4 LOW.** All 4 MED fixed in the
  landing commit with fails-pre-fix regression tests (email-submit usernamePending fork · Apple double-tap
  in-flight ref, finally-released · S3→S2 back clears the consumed code · choose-username envelope-code
  routing). 2 LOW fixed (unused imports · S1 field-error routing); 1 LOW covered (Android gate-leg test);
  1 LOW filed below (timer hygiene). Probed clean with independent double-probes: nonce bind (code trace +
  test inversion) · proof non-persistence (read RTK's installed source — no originalArgs retained, reset()
  really evicts).
- **Parvati** (dedicated sweep): **CLEAN — 0 🚩 · 3 🎨** (CLAIM-enabled-on-taken = by-design AUTH-11 ·
  disabled-primary reads brown at 30% dim, token-level · lime AVAILABLE advisory matches sign-in). All
  beats REACHED (S2→S3→seal walked with a real code fished from the stub-email log; claim verified
  server-side). Capture caveat: web frame renders landscape — phone-column proportion rides the
  owner-device walk, structural parity fully assessed.
- **Definitive green at `3da8ff3`:** typecheck PASS · lint 0 err · **unit 270 · integration 519 ·
  mobile 105 suites/715**.
- **Owner-calls — RULED same evening (2026-07-19):** (1) NON-401 /me failure fail-open → **BLESSED**
  (offline-first; the misleading "never wander" comment fixed to match); (2) gate scope → **FLIPPED:
  gate every entry** — the wall now ALSO stands in the (tabs) layout (walls only on KNOWN-pending;
  the fail-open unknown posture stays index.tsx's), +3 gate tests; (3) Parvati's CLAIM-on-taken
  owner-eye → **advisory-only BLESSED** (matches sign-in; zero change).
- **Follow-ups:** repo-wide pre-existing leaked-real-timer jest warnings (reproduced on the untouched
  baseline — not this epic's debt; hygiene pass candidate) · Parvati's throwaway mock-SIWA user
  `parvati_walk_1` (id e22b9c58…, dev DB) safe to delete · prod reset-code redaction CONFIRMED clean
  (ResendProvider logs nothing; Sentry catch carries transport error only — answered in m6-review-notes).
- **Still deferred, recorded not claimed:** SIWA on-device E2E → first P16 EAS build · owner App-ID
  capability toggle (§6.5) · sending domain (§6.3, the P15 sitting).

## Operational actions this pass (disk/DB state, not git — recorded here so they're not lost)
- **Dev-DB durability net** (committed `b9e72a2`): `npm -w @ingame/api run db:backup` + `db:reset`
  auto-backs-up first. Backups in `~/ingame-db-backups/` (3 taken 2026-07-19; keeps 20). Permanent fix =
  managed PG (G-C). Owner's real cards (ADawg: Minecraft/Hollow Knight/Destiny 2) captured + intact.
- **Seed scrub (dev DB, soft-delete):** 5 junk catalog games hidden (`deleted_at` set) — `hentai sniper
  wwII`, `P6 Smoke Game 1784274921`, `Smoke Odyssey Delta`, `ban`, `min`. All their stray cards/entries
  belonged to demo/smoke/walk TEST users, none to the owner's real account. Follow-up: check whether smoke
  tests writing to the dev DB re-create such junk (unverified).

## Recipe for Parvati captures (qa-runbook)
API healthy (`dev-stack up` + `doctor` green) → claude-in-chrome at `http://localhost:8082` → login
`demo@ingame.app` / `InGameDemo1!` → **wait ~3–4s per screen to settle** → screenshot. NOT the Claude_Browser preview pane.
