# R1-2 · Add-game — fix ledger (receipt)

> **Builder:** Opus / Claude Code. **Surface:** R1-2 Add-game (M3-R). **Branch:** `m3` (uncommitted).
> **Manifest:** [`add-game-manifest.md`](add-game-manifest.md) (grounded — zero UNVERIFIED rows).
> **Files touched:** `apps/mobile/app/add-game.tsx` · **new** `apps/mobile/src/components/CardFan.tsx`
> (+ this receipt, the manifest). **Not touched:** `collection.tsx` + R1-1 components (consumed only);
> `scripts/dev-stack.mjs` (parallel session's Metro-spawn fix — out of scope, left staged-out).

## Task 1 — manifest grounding (the recalibration: PRE needs evidence)
Read the full `add-game.tsx` before changing a line; every `UNVERIFIED` row → a code-cited
`PRE` / `OWED` / `GAP`. Key findings recorded in the manifest's grounded baseline: the FlowHeader
rendered a centered title + ✕ + a `CountTag` (wrong per S4-a/e); `SearchMode` was a flat horizontal
`cell` scroll (the S4-c gap); `FocusedMeta` **already had the correct S4-f content** (name-first +
CAT-09 + CAT-05 credit) and was reused; `StatusBeat`/`CreateForm` were PRE (status order backlog-first
→ mirrored; create form had no keyboard handling → R0-follow).

## Fix ledger — one row per R1-2 item

| Item | Files:lines | What changed | Self-verified (web, pre-Metro-death) |
|------|-------------|--------------|--------------------------------------|
| **S4-c (BIG) CardFan** | new `CardFan.tsx`; `add-game.tsx` SearchMode fan | 3-up fan: fore + two neighbours rotated ±4°/translateY (8 entry · 16 results) + `.fan-nav` (‹ dots › SWIPE); replaces the flat `cell` ScrollView. Board geometry `:253–272` | Rendered POPULAR fan with SWIPE + ‹/› ; **Next rotated Destiny 2 → Celeste** (fore + meta updated) |
| **S4-a** FlowHeader | `add-game.tsx:70–83`, styles | LEFT title + **"‹ RETURN TO COLLECTION"** labeled link; ✕ removed; header restyled to a left column | DOM read "ADD GAME · ‹ RETURN TO COLLECTION" |
| **S4-e** no count | `add-game.tsx` (removed `CountTag` + its query) | `CountTag "N IN"` + `useGetCollectionQuery` deleted | DOM: no "N IN" chip |
| **S4-f** fan-meta | `FocusedMeta` reused, now driven by the fore | name-first title · year·studio · genres · CAT-09 presence · CAT-05 "ADDED BY" — shown for the fore, always | DOM: "DESTINY 2 · 2017 · BUNGIE · SHOOTER · IN 2 COLLECTIONS · 0 FRIENDS…" |
| **S4-g** focus-only | `CardFan` (fore = plain View; neighbours/chev/swipe rotate) | tap a neighbour/chev/swipe → rotates fore; the **fore's own tap is inert** (M4 navigate) | rotate verified; fore non-pressable |
| **R0-follow** CREATE keyboard | `add-game.tsx` CreateForm ScrollView | `automaticallyAdjustKeyboardInsets` (frame-correct, unlike the removed KAV); Android adjustResize / web no-op | native — **R2 device pass confirms** (not web-observable) |
| Docked search | (already PRE) | `SearchField` + `KeyboardLift` dock retained (R0-2) | PRE from R1-1 R0 |
| **Rider — STATUSES** | `add-game.tsx:34` | reordered **playing-first** to mirror collection (murr debt: the two rows no longer diverge) | — |
| Rider — ADD icon | (n/a) | the ADD labels carry no literal "+" prefix (board ADD is text) → the icon-prop rider is a no-op; not applied | — |

## Predicate state-table walks (recalibration — every changed/new predicate)

**1. Fore-focus (`safeFore`/`focused`, `add-game.tsx`):** `safeFore = items.length>0 ? min(foreIndex, len-1) : 0`; `focused = items[safeFore] ?? null`.
- items empty → safeFore 0, focused null → no meta, no fan (the `items.length===0` branch renders the NO-MATCHES / empty block), ADD not reached.
- items present, fresh list → reset effect sets foreIndex 0 → fore = items[0], meta + ADD shown (the fore-default decision).
- list shrinks (query narrows) before the reset effect runs → `min` clamps to the last index (no out-of-range read); the effect then resets to 0. No crash window.
- foreIndex mid-list, user rotates → onFocus sets a valid index (CardFan's `step` wraps within `n`).

**2. CardFan neighbour indices (`leftIdx`/`rightIdx`):** wrap only when `n > 2`.
- n=0 → returns null (no fan). n=1 → left=-1, right=-1 → fore only, chevrons disabled. n=2 → fore=0: left=-1,right=1 · fore=1: left=0,right=-1 (never the same card on both sides). n≥3 → full wrap (fore=0 → left=n-1, right=1).

**3. CardFan `step` / rotate guard:** `step` wraps `(foreIndex+dir+n)%n`; chevrons + swipe are `disabled`/early-return when `n < 2`, so a 1-card fan can't rotate onto itself. Swipe threshold ±24px, and only claims the responder past 12px horizontal-dominant travel (won't steal vertical scroll).

**4. ADD disabled (`!focused || focused.inCollection || addState.isLoading`):** null fore → disabled; already-owned fore → "In your collection ✓" disabled + the "detail offers the game page" hint; in-flight → "…" disabled; otherwise enabled, acts on the fore (a visible, meta-shown card).

**5. `variant = querying ? 'results' : 'entry'`:** no query → entry (fore /cell 96×134, POPULAR); query → results (fore 138×193). Fore size tracks the state per board P1 vs P3.

## Declared gaps (never silent)
- **GAP-1 fan-nav dots = one per item.** For a long POPULAR list that is many dots (board examples show 3). Not windowed/capped — flagged for parvati/owner as a possible polish; a cap or a 3-window is the likely refinement.
- **GAP-2 dot shape.** The board `.fdot` is a corner-notched square (clip-path); RN renders a plain 6px square (F-07 square, no notch) — same OQ-127 family (the pixel-step/notch isn't rendered app-wide).
- **GAP-3 fore-focus-by-default is a builder decision** (recorded in the manifest): the board's P1 static frame shows no meta because it isn't mid-interaction; §0.7 says the fore auto-shows details, so the centered card is focused-by-default and immediately addable. If the owner wants the popular rail to require an explicit tap before ADD, that's a small change — flagged.
- **GAP-4 status-beat copy** "ADDED TO YOUR SHELF / SET A STATUS" vs board "IN HAND — SET ITS STATUS" — 🎨 polish, not changed.
- **P8 celebration** absent (the status beat doubles as the landing); **P3b/P7/P7b** community-cards/report → EXPECTED(M4); **P9** lifecycle → GAP-4 family. All declared in the manifest, not built.
- **STATUSES + STATUS_LABEL still duplicated** across collection.tsx + add-game.tsx (order now matches). A shared constant is the clean home; kept mirrored to leave the R1-1 file untouched per the brief. Follow-up cleanup, not this pass.

## Check outputs
- `npm -w @ingame/mobile run typecheck` → clean (exit 0).
- `npm run lint:custom` → 8/8 rules pass, 0 errors/warnings. *(Repo `eslint .` still fails only on the parallel session's `scripts/dev-stack.mjs`.)*
- `npm -w @ingame/mobile run test -- --watchAll=false` → 3 suites / 6 tests pass.

## Self-check + environment
Web loop via the preview harness (launch.json `expo-web`, :8082, standing :4000 API, no `.env.local`).
Verified live before Metro died: FlowHeader (return link, no count), fore-default meta (Destiny 2 +
CAT-09 line), SWIPE + chevrons, **rotate (Destiny 2 → Celeste)**. **Metro instability** (the
`dev-stack.mjs` spawn issue, task `f5628409`) repeatedly killed :8082; the full walk (search →
results fan → create → status) was not completed on web — **parvati's live lane is the authoritative
screenshot pass.** Cleanup: my :8082 orphan reclaimed by PID (expo-web-confirmed); owner's :8081
phone Metro + :4000 untouched; `.env.local` never created.

## STOP — handing to Fable
All R1-2 items built + self-verified to the extent the flaky web loop allowed; manifest grounded;
receipt filed; **uncommitted** on `m3`. Per the brief: **STOP.** The verifier runs the manifest
spot-audit → murr (diff — attack the CardFan focus/rotate/wrap predicates, the PanResponder vs
scroll, the fore-default add-target change, the keyboard-insets fix) → parvati (fresh screenshots vs
the grounded manifest — the fan, the header, the create-keyboard on device at R2).
