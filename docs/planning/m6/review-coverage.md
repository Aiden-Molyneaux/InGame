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

## W-5 Ultimate colour-cosmetics (2026-07-20, `bf9dce2`) — BOTH GATES CLOSED AT LANDING
- **Murr ×2 (fresh-context, both NO-GO → every finding fixed+tested in the landing commit):**
  - *Server pass:* 0 blocker · 3 HIGH-class (1 was the P2-roster pin, fixed by P2 itself) — the
    CURATED-INK flatten floor (off-list ink under a non-flagged font = the SCRIPT-ULTIMATE
    entitlement shipping un-bought → forces to CREAM; +5 unit tests incl. the free-font attack) ·
    reflatten re-forces registry colours (the ops-path bypass) · fail-loud registry completeness
    assert · probed clean: pricing integrity (registry diff purely additive), backstop trust
    boundary, ramp legacy-identity, cross-user surface.
  - *Client pass:* 1 HIGH — ink-RESTORE on leaving an ultimate font (published card ≠ approved
    preview; fixed + 2 harness tests) · 3 MED (validated-resolver mount gates · case-insensitive
    mirror compare · suite timeout) · 2 LOW (roster plateSeed invariant test · VoiceOver flat
    labels) — all fixed. Probed clean: client↔server explicit-id mirror provably price-equal,
    preset colour-carry trust boundary, render mirrors byte-identical, merchandising strictness.
- **Parvati (dedicated sweep): CLEAN — 0 🚩 · 3 🎨 owner-eye** (saturated-hue eyeball on the live
  marquee · optional featured-slot swap · base-vs-ultimate aisle co-listing first-timer read). 9/10
  beats REACHED live, zero data created (wallet untouched, no publishes). **NOT REACHED (seed gap #3):**
  the adopt-sheet ultimate row — no published card wears an unowned ultimate yet; joins the two
  existing seed gaps (forged avatarConfig · adopted-from-another-designer) for the richer-seed pass.
- **Definitive green at `bf9dce2`:** typecheck · lint 0 err · **unit 297 · integration 527 ·
  mobile 107/762**. /health 🟢.
- **Owner-calls parked for the next sitting:** (1) Murr server MED — the owner-DRAFT share-image path
  exempts by flag not entitlement (unowned ultimate colour freedom exfiltratable via draft share;
  pre-existing M5 P9 class, W-5 widens it — bless or gate); (2) HueStrip's 5 minted spectrum literals
  (CosmeticSwatch precedent — bless consciously); (3) the 3 Parvati 🎨 above.
- **Debt recorded:** BRASS_RAMP + CURATED_INK_COLORS duplicated api↔mobile (shared-lift candidate,
  both sides tested) · the F-17 "additive" wording vs `.strict()` clients (documented in 0.77).

## Owner walk-3 fix wave (2026-07-20, `3a4dcb7`) — BOTH GATES CLOSED AT LANDING
- **Scope:** 17 owner walk findings, 6 surfaces (game · collection · friend profile · store · device
  editor · styler), 8 builder lanes + a Murr-fix round. Per-finding ledger: [`walk3-notes.md`](walk3-notes.md).
- **Murr (full-diff, fresh-context): NO-GO → fixed.** 1 MAJOR (community avgHours counted WISHLIST
  rows as owners — status-filtered per statsOf/0058 + 2 attack tests) · 2 debt (a theater test
  strengthened with the not-a-scroll-descendant discriminator · a lying spotlight comment) · 3
  owner-calls ledgered (walk3 W3-C/E + the edit-posture split). Probed clean: SOC-11 on both friend-
  shape additions · aggregate denominators · client↔server styler pricing (kind+colour collision
  hunt) · all cross-agent merged-state seams · layout stretch in all 5 header consumers.
- **Parvati (opus, all six surfaces): CLEAN — 0 🚩 · 1 🎨** (readout label parity — FIXED in the
  landing commit). Pixel-measured proofs: header keycaps h=26 identical · flip-hint dismiss moved 0
  of 35 cards · device status block held 35.2px through the drag cycle. NOT-REACHED (seed-shaped,
  code+test-covered): the AVG RATING star (no rated seed game) · a FRIEND's pinned favourite (no
  seeded friend pin). Full section in [`m6-review-notes.md`](../m6-review-notes.md).
- **Definitive green at `3a4dcb7`:** typecheck · lint 0 err · **unit 300 · integration 532 ·
  mobile 109 suites/796+** (the catalog slice grew +2 wishlist attack tests post-verify).
- **Watch item:** forgot-password/choose-username jest suites flake on timeouts ONLY under
  multi-suite parallel contention (never in clean runs) — hygiene candidate, not shipped-flaky.
- **Companion artifacts this walk:** [`cosmetic-inventory.md`](cosmetic-inventory.md) (design-round
  sitting doc; the STICKER-PACKS ghost aisle is the headline) · [`load-harness-notes.md`](load-harness-notes.md)
  (4 confirmed scaling cliffs: unpaginated /me/collection · unvirtualized shelf ScrollView ·
  max-age=0 thumbs · full-shelf refetch per mutation) · the walkseed_* demo data (3 verification
  gaps CLOSED: forged avatarConfig · adopted-from-another-designer · ultimate-worn card — all three
  owner-walked this session).

## Walk-3 stash-3 wave (2026-07-21, `6408da7` + `7d435a7`) — BOTH GATES CLOSED AT LANDING
- **Scope:** the mechanical trio (search-status anchor · row-body nav · InlineBanner conform) + two
  owner-approved proposal builds (the add-game CARD FORK + ranked/paged community cards, spec 0.66 /
  api 0.81 · the structural styler rebuild, attempt three). Ledger: [`walk3-notes.md`](walk3-notes.md) §Stash 3.
- **Murr (fable, full diff since 93542f4): NEEDS-FIXES → every finding closed same-day** with the
  demanded regression tests: 2 MAJOR (numeric-overflow cursor reaching SQL as a 500 — `Number.isInteger(1e21)`
  is true; fixed via the shared `decodeOffsetCursor` keeping the silent-page-1 grammar, deduped into
  users-service · the sort-flip loadMore race — generation guard in useContributorPaging) · 1 MINOR
  (`.strict()` GET query → ledger-precedent strip) · the tones-follow-base approved-design gap ·
  3 debt. 5 owner-calls ledgered (W3-G..J + the tones intent, resolved by the fix). Probed clean:
  the empty-blocklist notInArray fence · three-key order totality · total/page filter parity ·
  additive-param guarantee on all 4 mounts · the fork state machine · contract-0.81 honesty ·
  styler zone tests proven to check REAL built bboxes.
- **Parvati (opus): CLEAN — 0 🚩 · 2 🎨** (a dense TAG+MONOGRAM+BADGE deal combo · SEE-ALL/LOAD-MORE
  seams undemoable at seed scale — richer-seed customers #4/#5). Walked END-TO-END: both fork cases
  (populated + empty, no silent skip), the full-list TOP/NEW/terminal/adopt-gating, the structural
  fan (TASTE: PASS) with the base-re-derive fix verified live across all 15 thumbnails, DEAL ×4
  zone-clean, row-body nav + flip, the InlineBanner disclaimer. Every mutation reversed (incl.
  restoring a borrowed soft-deleted game's exact deleted_at).
- **Definitive green at `7d435a7`:** typecheck · lint 0 err · **unit 303 · integration 539 ·
  mobile 111/828**. /health 🟢. Spec ripple: product-spec **0.66** (the add-flow completion row) ·
  api-contract **0.81** (sort/cursor/limit + nextCursor/total, additive).

## Walk-4 Batch 1 — the P1 bug fixes (2026-07-26, `dbb45ca`) — MURR CLOSED · FRESH-EYES REVIEW CLOSED · PARVATI PENDING
- **Scope:** the owner's three reproduced bugs — P1-a (server flatten rendered EVERY non-default font
  as chakra-petch; the full typeface registry now mirrors mobile, `pacifico-ultimate` alias included;
  dev-DB reflatten run 45/45, backup `local_ingame_2026-07-26T16-22-20.sql` first) · P1-b (marquee
  track parameterized from `frame.color`, registry gold → legacy `#6b5c28` pixel-identically) ·
  P1-c (+bis) achievements identity threading. Opus builder; ledger: walk4-acceptance-notes §P1.
- **Murr (fable, fresh-context): NEEDS-FIXES → fix round CLOSED.** The MAJOR: `marqueeTrackColor(undefined)`
  TypeError → publish/share 500 on a hand-crafted composition omitting `frame.color` (the `.passthrough()`
  envelope; the colour-force backstop deliberately skips colour-customizable designs) — guarded in BOTH
  buildCard copies + the same-class pre-existing `brassPlateRamp` hole (`nameplate.plate` omissible the
  same way) guarded identically, all with attack tests. 1 minor deferred owner-eye (the live MarqueeChase
  light stays warm-gold by design). Fix-round provenance: the four guard edits + P1-c-bis were implemented
  by the ORCHESTRATOR per Murr's prescription (recorded honestly in the wave receipt §3) — specifically
  re-verified by the takeover session's fresh-eyes review below.
- **Fresh-eyes takeover review (fable, 2026-07-26 — receipt §7 Job 1): ALL CLAIMS VERIFIED.**
  (a) the 4 orchestrator guards correct + api↔mobile parity exact; (b) pixel-identity PROVEN incl. the
  inference path — a smuggled base-marquee colour still resolves to base `marquee` → colour-forced to
  registry → legacy track (the raw-composition live-preview smuggle is the pre-existing accepted W-5
  posture, no new hole); (c) reflatten spot-checked by EYE — the demo_curator_m3 Hollow Knight PNG
  renders Pacifico + custom ink `#efb20a` per its composition; (d) the IdentityBlock call-site sweep
  found the assumed THIRD site: the FRIENDS-tab RequestsBanner dropped the `avatarConfig` its payload
  carries → **P1-c-ter fixed in the landing commit** + 3 tests. ALSO surfaced (recorded, NOT fixed here):
  `inviteSenderSchema` · `blockedPersonSchema` · `friendWhoOwnsSchema` never carried `avatarConfig` at
  all (server-side W-4 completion gap, `.strict()` shapes) → queued as a Batch-2 lane.
- **Definitive green at `dbb45ca`:** typecheck PASS · lint 0 err · **unit 316/316 (36 files) ·
  mobile 112 suites/835 counted · integration 539/539 (27 files)** — integration witnessed on this tree
  at `9c13b69` (serial run post-VM-suspension; the two earlier 26/27 parallel failures were machine CPU
  starvation — see the qa-runbook machine-load entry); the only code delta after the witness is
  mobile-client (friends.tsx + jest), outside the integration surface.
- **Parvati (takeover session, 2026-07-26): RAN — CLEAN, 0 🚩 · 0 🎨.** claude-in-chrome came back this
  session (NOT dark). Sweep per the receipt §7 Job 2, hidden-tab lane (CDP clicks no-op'd → the F-17
  synthetic-pointer recipe drove everything; captures intermittently froze → runbook class, hits++):
  (1) friend achievements `walkseed_avatar` — the FORGED monogram (pink bg / cyan `W4` / ring) +
  MEMBER SINCE JUL 2026 render, SCREENSHOT — the owner's P1-c repro fixed on screen; (2) self
  achievements — `DE` default monogram (demo has no forge config — correct) + MEMBER SINCE + full
  summary, text-verified (capture froze); (3) the teal marquee ultimate (walkseed Stardew) — the
  SERVER full.png shows the track dimmed to teal (≈`#086b63`, not the legacy gold-brown) AND the
  game-page community drawer's LIVE mobile render shows the same teal track, SCREENSHOT (readout:
  FRAME · MARQUEE ULTIMATE; components list ✓ OWNED); (4) the re-flattened Hollow Knight share
  image — Pacifico face + `#efb20a` ink verified by eye on the PNG; served 200 `image/png` at the
  identical byte size. Zero mutations (navigational taps only). Batch-1 gates are now BOTH closed.

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
