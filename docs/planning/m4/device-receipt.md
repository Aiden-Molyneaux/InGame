# device — build receipt (M4 §3.5, 2026-07-10 · Fable plans/reviews · Opus packet-builders)

> **Status: BUILT (P1–P5) · every packet Fable-reviewed with fixes applied · integrated gate GREEN
> (typecheck · lint incl. the new theme rule · 290/290 vitest · 69/69 jest, re-gated after the
> in-walk fixes) · migration 0007 applied to the dev DB + live `GET/PATCH /me/device` smoke-tested ·
> parvati (inline, Fable) walked `:8082` → 2 🚩 found+FIXED in-walk · OQ-144 STOP-and-filed ·
> 1 web-lane limitation runbook'd (native owner-proven) → ⛔ HARD STOP: the owner's gate-5 device
> walk (underway on his phone mid-verification, by the evidence) + the OQ-144 ruling.**
> §3.6 CARD-16 pass NOT started. Nothing committed.

## TL;DR
The last M4 surface, built to [`device-manifest.md`](device-manifest.md) (Fable-planned; the 0062
DEFAULT governs — the board's whole commerce arc D7/D7b/D7c + PIXELS chrome is EXPECTED(M5); every
shell/theme/sticker ships `tier:'basic'`, 0068 posture). Five parallel/sequenced Opus packets on the
committed §3.4 base, each adversarially reviewed by Fable before the next built on it.

## What changed (packets · files · IDs)
- **P1 — the server slice** (from scratch): `device_configs` + `device_looks` (migration **0007**,
  additive; down-file per convention) · shared zod (`packages/shared/src/schemas/device.ts`) with the
  **ONE geometry implementation** `stickerFitsZone` (rotated-AABB, zone-aspect-corrected, ε-tolerant)
  both sides import · `GET/PATCH /me/device` (defaults-on-read, never creates a row; partial upsert;
  per-sticker 422 paths) · `GET/POST/DELETE /me/device/looks` (SAVE CURRENT snapshots server-side;
  cap 12; actor-lock serializes the cap race) · SYS-07 actor-B tests on every mutation · **21 tests**
  (8 unit + 13 integration). **Fable review fix:** the cap is **`409 LOOK_CAP_REACHED`** (the
  `409 PRESET_LIMIT` sibling; the packet directive's 422 was the reviewer's own mis-spec) —
  **api-contract 0.55** pins it. (DEV-01..05 · OQ-062/064 · decision 0030)
- **P2 — the theme engine** (ARCH 1): `SCREEN_THEMES` (6) + `SHELL_PALETTES` (5) with **Midnight/Teal
  as verbatim identity** (test-enforced deep-equal) · `useTheme()` + `themedStyles()` ·
  `prefs.shellId/themeId` (persisted) · the **56-file mechanical sweep** of every `scr.*`/`shell.*`
  consumer · a **custom lint rule** (`rule-theme-tokens`) banning static theme-layer reads outside
  `src/theme/**` — the sweep's completeness is enforced, not asserted. §1.1 palettes mapped by role
  onto the code keys (OQ-143 records the doc-debt). (DEV-02/04 · COSM-02)
- **P3 — the editor surface**: `app/device.tsx` (FlowTakeover; ScreenHead + return-link; live
  edit-readout; the **ONE debounced-PATCH pipeline** with monotonic write-seq last-write-wins, the
  styler save-line grammar, 4xx-stops-retrying) · `DeviceSectionRail` (SectionCards; accent-border
  active, no pip) · SHELL (5 `DeviceItemTile`s + the D2 WAS➔NOW `MiniDevice` beat) · THEME (6 tiles +
  `DevicePreviewStrip` + EXIT-revert + the dynamic floor-note) · RTK Query device+looks endpoints ·
  the Profile **MY DEVICE strip goes pressable + dynamic** · D8/D10 lifecycle. **Fable review fix:**
  the **exit-flush** (a <1.5s pick no longer dies with the debounce timer on unmount).
- **P4 — stickers** (ARCH 2): `deviceStickers.tsx` (8 basic glyphs; star/bolt/heart reuse `icons.ts`
  paths) · `PlacedSticker` · `StickerBandLayer` (per-zone: decals + TransformBox + decal-zone dashes +
  the ⊘/NAV-KEEP-CLEAR refusal grammar + the PanResponder) · `StickerTray` · `StickerSteppers` (the
  round-5 ◀value▶ grammar as the CARD-16 pair + alert-fill DELETE) · `prefs.stickerComposition`
  (optimistic, logout-purged) · `DeviceStickerContext` (the editor publishes its session UP to the
  shell) · **DeviceShell integration with the breakout invariants intact** (`{children}` untouched;
  the chin layer an earlier sibling than ShellNav → F-04 z-order by construction — reviewer-verified
  in the diff) · the joint scale/rotation fit-clamp (unit-proven ≡ the server gate).
- **P5 — LOOKS + offline**: `SavedLook`/`LooksGrid` (3-col; MiniDevice-in-look; the shell·theme
  identity; ON NOW **computed** via the unit-tested canonical `isOnNow`; no × on the current look) ·
  apply = the ONE pipeline · SAVE CURRENT (409-aware cap line + pre-dim) · × → `ConfirmSheet` ·
  `OfflineStrip` driven honestly off the pipeline's transient-error state (SAVE CURRENT gates, SYS-10).
- **Fable in-walk fixes (the parvati round):** **`DeviceHydrator`** (`_layout.tsx`) — the device now
  **follows the ACCOUNT**: auth-gated hydrate of the three facets once per session (logout still
  purges; a fresh login/second device wears the server truth immediately — re-verified live) · a
  `StickerBandLayer` mount-measure fallback (gBCR-first) for the web lane · stale-422 comments fixed.
- **Docs:** component-map **0.10** (the §11 code mapping: `StickerBandLayer` subsumes
  StickerStage+TransformBox per-zone; `DeviceSectionRail` hosts SectionCards; KeepBar M5) ·
  api-contract **0.55** · **OQ-142** (per-zone cap ~6) · **OQ-143** (token mapping doc-debt) ·
  **OQ-144** (cream×DEV-04 → owner) · qa-runbook +4 lessons · the manifest + this receipt ·
  review-notes (the full parvati verdict).

## The load-bearing decisions (the owner's eyes at the stop)
1. **The theme engine is real infrastructure** — 56 files converted, lint-enforced, value-identical
   under defaults. M5 premium themes ride it for free. The five non-default theme + four non-default
   shell palettes are **role-translations of §1.1 into the code's drifted value-space** — hex tables
   in the P2 report; two §1.1-faithful quirks (deepsea/berry `panelHi` darker than `panel`; the silk
   semantics) are flagged for your taste, not silently normalized.
2. **OQ-144 (STOP-and-filed):** cream `/secondary` ≈ **1.1:1** against PAPER — §1.1's `scr.chip`
   (cream-on-dark/white-on-light) is the designed fix, but it amends your 0069 "secondary = cream"
   ruling → yours to rule.
3. **The device follows the account** (the hydrator) — DEV-01 semantics across logins/devices; the
   walk caught it because a logout mid-walk silently reverted the frame to defaults.
4. **ASSUMPTIONS standing** (manifest): the board's 8 stickers all-basic (roster deferred to this
   build by 0063 §5) · per-zone cap ~6 (OQ-142) · re-zone-on-drop · the ~1.5s free-path PreviewStrip
   (EXIT is near-vestigial — simplify or lengthen, your call).

## Verification trail (builder ≠ verifier: Fable reviewed every packet + ran parvati inline, per your directive)
- **Per-packet Fable reviews:** P1 (geometry/authz/migration read line-level; 1 fix: 409) · P2
  (collection.tsx truncation-incident diff audited clean; engine core read; palettes identity
  test-enforced) · P3 (pipeline seq/preview-revert predicates read; 1 fix: exit-flush) · P4
  (DeviceShell breakout-invariant diff verified directly) · P5 (isOnNow read; stale comments fixed).
- **Integrated gate:** typecheck · lint (incl. `rule-theme-tokens` over the whole tree) · **290/290
  vitest** (24 files; the 21 new device tests incl.) · **69/69 jest** — re-gated green after the
  in-walk fixes (mobile-only).
- **Live env:** migration 0007 applied to `local_ingame`; `GET`(defaults, no row created)/`PATCH`
  (upsert, round-trip) smoke-tested on `:4000`; the walk observed hydrate→debounce→PATCH-200→
  invalidation per pick, server truth byte-exact.
- **parvati:** the full verdict in [`m4-review-notes.md`](../m4-review-notes.md) — 2 🚩 fixed in-walk,
  OQ-144 filed, the RN-web decal-size limitation runbook'd (**native proven by your own live
  edits mid-walk** — the dragged cat), 3 🎨, the rest MATCHES.
- **Workflow lessons captured** (qa-runbook): the Metro rapid-edit transform-cache wedge · the
  RN-web native-setter+PointerEvent automation recipes · the RN-web band-decal 0-size quirk.
  Memory: builder packets carry the **no-subdelegation rail** (your poll-loop catch).

## Gate-5 iteration (owner device walk, 2026-07-10 — 4 notes, built directly on Opus)
The owner walked the built editor and returned 4 notes ("it's actually how I wanted it to look"):
1. **Nav keycaps → CREAM on every shell except Carbon (grey).** The keycap face borrowed `shell.silk`,
   whose §1.1 tone is dark on grape/sunset/pink → dark keycaps. Added a **`shell.cap`** token
   (cream / Carbon grey); `NavKeycap` reads it. (design-spec 0.58 · palettes + static `theme.shell`
   both carry `cap` so the value-identity test still holds.)
2. **Unify the Game-page dock + the Device rail — "essentially the same component."** They were built
   twice with the same active grammar, different layouts. Extracted **`SectionDock`** (the shared
   stacked switcher, component-map §5.3 0.11); `GameTabDock` (§9) + `DeviceSectionRail` (§11) are now
   thin adapters over it (each owns its glyphs). Realizes decision 0030/OQ-063's one-grammar intent.
   **⚠ this restyled the SIGNED game-page dock** (beside-label → stacked, the only layout that scales
   to both 3 and 4 items) — flagged for the owner's eye; trivial to revert if the direction's wrong.
3. **DEVICE head spacing** — the head had `paddingHorizontal` only, so the title sat flush to the
   screen top, jammed against the return-link. Added `paddingTop` + a gap (the game-page pattern).
4. **Light-theme legibility (DEV-04)** — the owner agrees on the cream-on-paper problem and adds:
   **anything yellow/gold** is hard to read on the light bgs too. Expanded **OQ-144** into the full
   light-theme legibility pass (cream `/secondary` → `scr.chip`; fixed-brand gold on light; the
   `SectionDock` active tint → theme-accent-derived; Carbon nav-label ink) — **owner-ruled, not built.**

Suite after: typecheck ✓ · lint ✓ (incl. `rule-theme-tokens`) · **69/69 jest** (value-identity held).
Doc ripple: design-spec **0.58** · component-map **0.11** · OQ-144 expanded · `/health` 🟢. Web-visual
re-check owed on device (the RN-web decal-size + capture limits stand; notes 1–3 are shell/layout, not
decal — verifiable on the `:8082` DOM, done).

## OQ-144 RESOLVED — light-theme legibility, "adapt the hue" (decision 0070, owner 2026-07-10)
The owner ruled **adapt the hue**. Built the M4-live half: four themed tokens (`scr.key` cream→white,
`scr.value` bright→deep gold, `scr.valueInk`, `scr.isLight`) + `withAlpha`, applied to `ScreenButton`
secondary (key + a `scr.dim` border on light — a flat light key can't self-contrast) / add
(value/valueInk), the DESIGN NEW tile (gold text → value), and the `SectionDock` active tint (theme-
accent-derived). **Verified live on the owner's Paper theme:** SIGN OUT = white face + a **3.03:1**
border (reads; was invisible cream); DESIGN NEW = deep gold **#8a6d0a at 3.91:1** (reads; still gold).
Midnight/Teal byte-identical (value-identity test). typecheck/lint/**69 jest** ✓ · design-spec **0.59** ·
decision 0070 · `/health` 🟢 · zero console errors. **Deferred to M5** (inherits the tokens): the gold
surfaces that don't exist yet — wallet · PIXELS CountTag · price chips · published-card tags ·
ReconcileSheet. **Owed (CARD-16 / light-theme parvati pass):** the full ≥4.5:1/≥3:1 floor sweep across
every signed surface on all 3 light themes + the Carbon nav-label check.

## Gate-5 iteration round 2 — sticker editor (owner device walk, 2026-07-12)
Four sticker notes, all presentation/flow (design-spec 0.60 · §2.15):
1. **Placed-decal rail** (`StickerRail`) — the "slips" manager: a tile per on-shell decal, tap to
   select. It's the visible + screen-reader-reachable selection path, and **replaced the transparent
   a11y select-targets** from the CARD-16 pass (cleaner + kills murr m4's iOS overlap edge).
2. **Chin OFF** — `CHIN_ENABLED=false` (decals crowded the nav keycaps). The chin code/schema/server
   support is retained; the editor is **forehead-only** for now (no re-zone button, no chin drop-target,
   the chin band stays passive). One flag flips it back.
3. **POSITION → 4 directional arrows** (◀▶▲▼ inline + X·Y read-out) — mirrors the Canvas TransformDrawer,
   not two ◀ value ▶ rows.
4. **Spacing** — the panel read too crowded; `stickerBody` gives the tray/rail/steppers/preview clear gaps.
Suite: typecheck ✓ · lint ✓ (both a11y + theme rules) · 69/69 jest ✓ · /health 🟢. **Owed on device:**
the sticker place/select/transform feel + the D5 preview — the RN-web decal lane can't render decals.

## ⛔ The stop
**Owner:** gate-5 taste on the Device editor **on device** (the decal visuals + drag/refusal/re-zone +
stepper cadence + the D5 preview + LOOKS apply/delete — the lanes web can't drive), the **OQ-144
ruling** (chip-token vs cream-everywhere), the **palette-derivation taste** (P2's hex tables), and the
standing ASSUMPTIONS above. Your device state (carbon/paper/2 stickers) was left untouched — it's your
session. **Commit only when you ask. §3.6 (CARD-16) does not start until you say so.**
