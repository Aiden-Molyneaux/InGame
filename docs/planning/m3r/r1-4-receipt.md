# R1-4 · Profile — fix ledger (receipt)

> **Builder:** Opus / Claude Code. **Surface:** R1-4 (M3-R). **Branch:** `m3` (uncommitted at write time).
> **Manifest:** [`profile-manifest.md`](profile-manifest.md) (grounded — zero UNVERIFIED rows).
> **Files touched:** `apps/mobile/app/(tabs)/profile.tsx` (+ manifest, this receipt).
> **Not touched:** `ScreenHead.tsx` (consumed unchanged); the rest of the profile (owner "reference-good").

## Task 1 — manifest grounding
Read `profile.tsx` + the profile board's base artboard (`profile-states.html:477–590`) + `ScreenHead.tsx`
before changing a line. Two grounded findings: (1) **S5-a** — the built profile opens straight into the
`ScrollView`/IdentityBlock with **no `.screen-head` band**; (2) **S5-b** — the built Now Playing section
already has **no inert set-affordance** (display or directional empty-line), matching the board's own
ghost-line + populated strip → nothing to hide.

## Fix ledger

| Item | Files:lines | What changed | Verified |
|------|-------------|--------------|----------|
| **S5-a** PROFILE title band | `profile.tsx` (import `:4`; header JSX `~63–68`; `pad`+`scroll` styles `~181–183`) | mounted the shared `ScreenHead title="Profile"` in a fixed `pad` wrapper above the scroll, mirroring `collection.tsx:258–263` (pad horizontal = body `lg`, so the band aligns with the content). EDIT/SHARE/Settings tools left ⛔ M7. | typecheck/lint/tests green; **live render owed to R2** (auth-gated · web login broken) |
| **S5-b** hide SET-NOW-PLAYING | `profile.tsx:116–128` (unchanged) | **PRE — confirmed.** No inert set-affordance exists: Now Playing renders the `me.nowPlaying` display (thumb/title/hours) or the directional empty-line "Nothing pinned — set it from your Collection" (matches board ghost-line `:804`). The NOW PLAYING **display** still renders (§0.8). Nothing to hide. | code-confirmed |

## Predicate self-check (recalibration rule b)
**No state predicate changed.** S5-a is a pure additive render — a fixed `ScreenHead` re-parenting the
existing scroll; no new hook, no early-return change, no boolean/enum touched. The two early-returns
(loading spinner `:38–44`, SIGNAL-LOST `:45–56`) are **untouched**, so the hook count is identical on
every path (no "rendered more hooks" surface). **Placement decision (recorded):** the band mounts on the
**loaded base view** (the S5-a note's target); the transient loading/error states keep their centered
full-screen treatment — not in S5-a scope.

## Declared gaps / EXPECTED
- Header tools (EDIT · SHARE · Settings) → EXPECTED(M7 · walkthrough S5-a).
- Tap-to-navigate on Pinned/Top3/Now-Playing/Device (board `.chev`/VIEW GAME) → EXPECTED(M4 Game page).
- Profile lifecycle artboards (edit · fresh · friend-view · privacy · skeleton · signal-lost) → EXPECTED(later).
- **Live render of the loaded profile is owed to R2** — the screen is auth-gated and web login is broken
  this session (LAN-IP `POST /auth/login` hangs in-renderer, OPTIONS 200 / no POST; task f5628409). Same
  barrier every auth-gated screen hits on the :8082 dev lane. S5-a is boot-safe by static reasoning +
  murr; the pixel confirmation rides the R2 physical-device pass.

## Check outputs
- `npm -w @ingame/mobile run typecheck` → clean (exit 0).
- `npm run lint:custom` → 8/8 rules pass, 0 errors/warnings.
- `npm -w @ingame/mobile run test -- --watchAll=false` → 3 suites / 6 tests pass.
- **Boot check:** profile is auth-gated + web login is broken (see above) → boot-safety assessed
  **statically** (pure additive JSX + styles · no hook/lifecycle change · ScreenHead is a proven shared
  component already booted on Collection + Add-game). Sign-in shell re-checked clean on :8082 (0 console
  errors); as a side-confirmation the R1-3 top-line auth error ("Something went wrong") rendered correctly
  on the failed login.

## Self-check + environment
Standing dev stack (decision 0060), verified via claude-in-chrome at :8082 (own tab group). Login attempt
`demo@ingame.app` filled the fields (form_input — S2-a enable-on-fill re-confirmed live) and submitted, but
the POST hung (LAN-IP block) → profile unreachable on web. No account/data mutated. Owner's :8081 + :4000
untouched; no `.env.local`.

## Verification lane
- **murr** (diff): **SOUND ✅** — 0 blocker/major/minor/debt. All 5 surfaces held: (1) hook-order —
  all 4 hooks called unconditionally before any return, diff adds zero hooks, `ScreenHead` is
  hook-free → the header appearing only in the loaded return is a benign JSX difference across
  separate returns, no "rendered more hooks" risk on any transition; (2) layout — `scroll:{flex:1}`
  correctly claims the space below the fixed `pad` (mirrors `collection.tsx` token-for-token); (3)
  `ScreenHead` optional `count` guarded (`{count ? … : null}`); (4) loaded body byte-identical, only
  re-parented — no section dropped; (5) S5-b confirmed — no inert set-affordance at the Now-Playing
  section. **🤔 Owner-call (surfaced):** the "PROFILE" band shows on the loaded view but not the
  transient loading/error states — a deliberate, manifest-documented scoping decision (S5-a targets the
  loaded base view); owner blesses or asks for it on all states (small follow-up). *(Doc note: the
  manifest/receipt cite the Now-Playing block at `:116–128`; post-diff it shifted to `:122–134` — a
  cite-offset, not a code defect.)*
- **parvati** (code-confirm + sign-in frame sanity; profile live-render R2-owed): **CLEAN ✅ — 0 🚩.**
  Both S5 items MATCH: **S5-a** CODE-CONFIRMED — `ScreenHead` imported (`:4`) + mounted in a fixed
  `pad` View above the `ScrollView` (`:64–69`), display-21 cream-bold title, no count, M7 tools
  withheld — exact mirror of the Collection pattern; **S5-b** CODE-CONFIRMED — `:122–134` display or
  directional empty-line, no inert set-affordance (matches board ghost-line). **Live (1):** the
  `/sign-in` full-frame shell renders clean — the R1-4 diff did not leak into the root shell. Profile
  live pixels **owed to R2** (auth-gated · login block; no login churn run). **Out-of-scope note (not
  a flag):** a `ReferenceError: Pressable is not defined` fired from `LegalScreen` during a Fast-Refresh
  cycle — verified a **stale-HMR-bundle artifact** (the committed `LegalScreen.tsx` has zero `Pressable`
  references, grep-confirmed; typecheck was green at the R1-3 commit). Not a build defect.

## Outcome
Pipeline: **manifest → build → murr SOUND → parvati CLEAN (0 flags) → done.** S5-a landed (the
`ScreenHead` "PROFILE" band); S5-b confirmed already-satisfied. The only deferrals — the loaded-profile
live pixels (auth/login block) and the band-on-loading/error owner-call — are environmental / a
documented scope choice, both owed to R2. **R1 is complete with this surface** (R1-1/R1-2/R1-3/R1-4/R1-5
all built + murr-SOUND + parvati-CLEAN); only R2 device re-acceptance remains to close M3.
