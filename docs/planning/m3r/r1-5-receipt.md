# R1-5 · Shell polish — fix ledger (receipt)

> **Builder:** non-Opus / Claude Code (M3-R model plan — Opus reserved for M4 verify). **Surface:**
> R1-5 shell polish, **pulled forward** to run first (owner order-change 2026-07-04,
> [`m3r-build-task.md`](../m3r-build-task.md) §3 ⤴). **Branch:** `m3` (uncommitted at write time).
> **Cross-cutting — no per-surface manifest** (the shell is root-mounted; it frames every screen).
> **Files touched:** `apps/mobile/src/components/DeviceShell.tsx` ·
> `apps/mobile/src/components/NavBand.tsx` · `apps/mobile/src/components/NavKeycap.tsx` (+ this
> receipt). **Not touched:** `scripts/dev-stack.mjs` (parallel session — left staged-out); the R0
> `NavKeycap` raised-depth shadow/travel styles (consumed unchanged — the regression murr guards).

## Scope — the four owner device-feel notes (S1/S6 frame family)
Source: [`m3-walkthrough-iteration-notes.md`](../m3-walkthrough-iteration-notes.md) Step 1 + Step 6.
Grounded against the canonical device frame in `profile-states.html:48–80` (`.device`/`.top-band`/
`.screen-bezel`/`.nav-band`/above-label `translateY(-8px)`). ¼cm is a **physical** target → built to
sensible px, **final magnitude is the owner's R2 device judgment** (each value flagged R2-tunable).

## Fix ledger — one row per item

| Item | Files:lines | What changed | Self-verified (web, :8082) |
|------|-------------|--------------|----------------------------|
| **S1-a** top bar up ~¼cm | `DeviceShell.tsx:49–55` (`TOP_BAND` 64→56, new `TOP_PAD` 8), `:21` paddingTop, `:28` logo `top` | Top-band fixed-height + centred content → paddingTop alone shifts only ½ the delta; drop `TOP_BAND` **and** `TOP_PAD` together (64→56 · 16→8) → clean ~8px up, centre alignment kept. Logo `top` also → `TOP_PAD` so it stays level with POWER/grille. | Boot-clean render; POWER/logo/grille ride higher, no clipping (48px content box unchanged) |
| **S1-b** nav band down ~¼cm | `NavBand.tsx:40` | `paddingBottom: Math.max(bottomInset, 16)` → `Math.max(bottomInset - 8, 10)`. Band is content-sized + flex-start keys → bottom pad drives key position **1:1**. Subtract ~8 from the home-indicator inset, clamp to a 10px floor. | Web (inset 0): keys 10px from bottom (was 16) → down 6; device (inset ~34): → 26, down 8 — R2 confirms |
| **S1-d** DISCOVER/PROFILE labels a couple px higher | `NavKeycap.tsx:145` | above-label `lblAbove` translateY **-8 → -11** (board floats them -8; owner wants a touch more) | Above-labels sit a few px higher over their caps |
| **S6-b** thinner frame/screen border | `DeviceShell.tsx:111` | bezel `padding` **9 → 6** (the dark `theme.shell.bezel` ring around the Midnight screen; board is 9) | Black frame border visibly thinner; screen grows 3px/side, no overflow |

## "Predicate state-table walk" (recalibration rule b)
**No state predicate changed.** Every edit is a static StyleSheet value; there is no new/changed
boolean/enum driving a pip, count, mode, or guard, and no new hook/effect/JSX-structure change (so
the "rendered more hooks" class is out of scope). The one **computed** value is the S1-b safe-area
clamp — walked here in lieu of a predicate table:

`paddingBottom = Math.max(bottomInset - 8, 10)`
- `bottomInset = 0` (web / no home indicator) → `max(-8, 10)` = **10** (was 16 → keys 6px lower). Floor holds; never negative.
- `bottomInset = 20` (small inset) → `max(12, 10)` = **12** (was 20 → 8 lower). Floor not hit.
- `bottomInset = 34` (typical iPhone home indicator) → `max(26, 10)` = **26** (was 34 → 8 lower). Keys clear the ~13px indicator zone; upholds the 2026-07-01 "keys ride just above the device bottom" ruling.
- large inset → tracks `inset − 8`, monotonic; never overlaps content.
The floor (10) protects the no-inset/small-inset cases from dropping onto the edge; the old code
floored at 16, so the change is a uniform ~8px drop on inset-bearing devices and a 6px drop on web.

## Declared gaps / notes (never silent)
- **¼cm is approximate.** Built px (8 up · 8 down · 3 label · 3 bezel) are device-feel estimates;
  the owner's R2 device look is the calibration gate. All four values are single-constant/one-line
  tunes.
- **S1-c is NOT re-done here** — the R0 pass already gave `NavKeycap` real native shadow depth; this
  pass leaves those styles untouched. murr's #1 attack surface is confirming no regression to them.
- **S1-e Welcome hero content** is design-owed (§5) — not this build.
- **S6-a not-yet nav tabs** — owner ruled "leave as-is" (§0.9) — untouched.

## Check outputs
- `npm -w @ingame/mobile run typecheck` → clean (exit 0).
- `npm run lint:custom` → 8/8 rules pass, 0 errors/warnings.
- `npm -w @ingame/mobile run test -- --watchAll=false` → 3 suites / 6 tests pass.
- **Browser BOOT check (mandatory, recalibration rule c):** app booted clean to `/sign-in` on the
  standing Metro (:8082); **zero console errors/exceptions**; full device frame renders with all four
  changes present. (Pure-style diff → no hook-order crash surface, confirmed live.)

## Self-check + environment
Standing dev stack (decision 0060): `node scripts/dev-stack.mjs status` → all up (db/api/metro,
web :8082). Verified via the claude-in-chrome tools at `http://localhost:8082` (the standing Metro —
`preview_start` can't attach; not touched). Windows Chrome clamped the 412px resize (min-width), so
the self-check ran at desktop width — the **vertical** frame geometry I changed reads correctly there,
and the authoritative phone-viewport (~390×844) enumeration is parvati's lane. Owner's :8081 phone
Metro + :4000 API untouched; no `.env.local`; my browser tab is in its own MCP tab group (isolated
from the concurrent R1-2-iteration session). Note: my shell edits are live in the **shared** Metro
bundle, so the concurrent session's add-game screenshots carry the new frame (harmless to its content
check).

## Verification lane
- **murr** (fresh general-purpose agent, `shipwright/skills/murr/SKILL.md`, over the 3-file diff,
  named attack surfaces incl. the R0 keycap-depth regression): **SOUND ✅** — 0 blocker/major/minor
  runtime defects. All five attack surfaces probed clean: R0 keycap shadow/travel provably isolated
  from the `lblAbove` edit; the `Math.max(bottomInset-8,10)` clamp walked at insets {0,20,34,44} =
  {10,12,26,36} (never negative/edge, upholds the "keys ride just above the bottom" ruling); 48px
  top-band content box invariant (no clipping); bezel 6px clears both radii; `TOP_PAD` module-const
  TDZ-safe. **One 🧹:** stale inline `nav-band (128px)` comment (`DeviceShell.tsx:43`) — **fixed** to
  "content-sized". murr's second note (NavBand.tsx:8 "128 well" rationale) kept as deliberate history.
- **parvati** (fresh agent, `.claude/skills/parvati/SKILL.md`, frame spot-check; verdict appended to
  [`m3-review-notes.md`](../m3-review-notes.md)): **CLEAN ✅ — 0 🚩 flags · 1 🎨 (pre-existing).** All
  four changes DOM-confirmed on the `/sign-in` frame: S1-a logo top y=17 / grille y=20 (rides high);
  S1-b `paddingBottom` measured 10px, caps flush-low; S1-d above-labels `translateY(-11)` at y=456 vs
  below-labels y=550; S6-b `padding:6` thin clean ring. **R0 regression guard INTACT** — all 5 caps
  still carry `boxShadow rgb(10,43,40) 0 4px 0` (the raised drop-edge), not flattened.
  **Not exercised:** the signed-in active/sunk keycap + lit pink pip — web login failed 3× (the known
  LAN-IP renderer failure, task `f5628409`; `.env.local` forbidden). Code-verified (`NavKeycap.tsx:167–174`);
  the felt sink + true-cm magnitudes are the **R2 device pass's** to own. The frame is root-mounted +
  identical on every screen, so all four changes + the depth guard were fully evaluable on sign-in.

## Discovered → filed (no scope creep)
- **OQ-132** (new): `theme.shell.bezel` = `#0b0a13` diverges from the mockup `--bezel` = `#14122a`
  (parvati measured the composited ring ~`rgb(20,18,31)`). **Pre-existing, possibly intentional** (the
  token comment rationalises "darker than `scr.bg` so the screen reads inset") — and **unrelated to
  S6-b**, which changed the bezel *thickness* (padding 9→6), not its colour. Surfaced, not touched;
  owner/design lane rules which value wins.

## Outcome
Pipeline (cross-cutting, no manifest): **build → murr SOUND → parvati CLEAN (0 flags) → done.** The
four owner notes (S1-a/b/d · S6-b) are built + independently verified on the frame; the R0 keycap
depth is confirmed un-regressed. The only deferrals (active-cap live feel · exact ¼cm magnitudes) are
native/device behaviours the R2 physical-iPhone pass owns by design. R1-5 slot **completed early**.
