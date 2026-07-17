# device — screen manifest (from device-states.html, 2026-07-10)

> **Surface:** M4 §3.5 Device editor (the in-frame live edit — decision 0030; the LAST M4 surface).
> **Board:** `docs/design/mockups/device/device-states.html` (D1–D10, converged 2026-06-14 "A in-frame
> live edit"; 972 lines; drafts retired to history). **Authority stack:** design-spec **§2.15** + §1.1
> (the 5 shell colourways + 6 screen themes — full hex tables) + §1.5 Device set · product-spec
> **DEV-01..05** + COSM-01/02 · api-contract §Device (0.27 — `/me/device` + `/me/device/looks`;
> `stickerComposition` shape) · decisions **0030** (OQ-045/062/063/064/065/076 rulings) · **0062**
> (the M4/M5 DEFAULT boundary) · **0063 §5** (device roster deferred TO THIS BUILD) · **0068**
> (all-basic-now precedent) · **0069** (the button convention this surface builds to).
> **Author:** Fable (planner/spec-owner). **Builders:** Opus packet agents (owner directive
> 2026-07-10). **Reviewer:** Fable (this session) + parvati + the owner's gate-5.
>
> **⚠ THE 0062 BOUNDARY GOVERNS THIS BOARD — MORE THAN ANY OTHER.** The board draws the commerce
> path throughout: the header **PIXELS `CountTag`** (27), **price-chips** on premium tiles (SUNSET/
> PINK 6 PX · five themes 4 PX · SATURN/CAT/RAINBOW 3–6 PX), the **`cost-flag`** on-shell badge, the
> **`KeepBar`** (D3/D7/D7b), and the whole **D7 · D7b · D7c premium/cart/`ReconcileSheet` arc**. **ALL
> of it is `EXPECTED(M5 · decision 0062 §2 + COSM-03)`** — drawn, marked, NOT built. Decision 0068
> establishes the posture: **everything ships `tier:'basic'`** until the owner re-tags at M5. So at M4
> every shell/theme/sticker is FREE: no price-chips, no EQUIPPED-vs-owned distinction beyond selection,
> no KeepBar, no ReconcileSheet, no PIXELS header. A pick **applies live + persists immediately**
> (the free path is the ONLY path).
>
> **⚠ ARCH 1 — THE THEME ENGINE (the one real engineering piece).** Today `theme` is a static const;
> ~54 files bake `theme.scr.*` into module-scope `StyleSheet.create` (census 2026-07-10) — no remount
> or reload trick can repaint them (module top-level never re-runs; no sync storage under Expo Go).
> **Ruling (planner): build the real thing** — `themeId`/`shellId` in the redux-persist `prefs` slice ·
> a `useTheme()` hook + a `themedStyles((t) => ({...}))` factory · the ~54 `scr.*` consumers converted
> mechanically · the 4 `shell.*` consumers (DeviceShell · NavKeycap · MiniDevice · PipLight) converted
> by hand · a **custom lint rule** banning `theme.scr`/`theme.shell` inside module-scope
> `StyleSheet.create` so it can never regress. Output is **value-identical by construction** under the
> default Midnight/Teal. M5 premium themes require this infra anyway. **Token mapping:** the §1.1
> palettes map ONTO the code's live token keys (`bg/panel/panelHi/hairline/ink/dim/faint/accent/
> accentInk`; §1.1's `well/tools/head/text/soft/grip/chip` fold into them — the mapping table rides the
> theme module with a comment per key). Do NOT rename the code keys (60-file blast radius for zero
> user value). Skia/card rendering is composition-driven — **zero render-module changes**.
>
> **⚠ ARCH 2 — STICKERS RENDER ON THE REAL SHELL.** The in-frame model means placed stickers live on
> the app-wrapping `DeviceShell` itself (the forehead top-band + the chin nav margins), fed from the
> persisted device state — on EVERY screen, not just the editor. Hard rules, all three enforcement
> layers (DEV-03 is P0, decision 0030): (1) the client refuses out-of-zone placement (the `⊘ SCREEN —
> DISPLAY ONLY` refusal + zone clamping), (2) the **5 nav keycaps z-order ABOVE every sticker** (F-04),
> (3) the **server validates zone + transformed bounds** on every device write. `stickerComposition` =
> `{ version: 1, stickers: [{ id, assetId, zone ∈ "forehead"|"chin", x, y, scale, rotation }] }` —
> x/y normalized [0,1] within the zone rect, scale clamped 0.5–2.0, rotation −180..180 (OQ-062).
> Sticker glyphs are react-native-svg paths (the plastic is RN Views, not skia) — a small
> `deviceStickers.ts` registry; reuse `icons.ts` path data where the glyph overlaps (star · bolt ·
> heart), add the board's five others (rocket · cassette · saturn · cat · rainbow).
>
> **⚠ ARCH 3 — ONE WRITE PIPELINE.** Every editor mutation (shell pick · theme pick · sticker
> place/move/scale/rotate/delete · look apply) funnels through ONE debounced `PATCH /me/device`
> (the styler `patchDraft` grammar — local apply → debounced PATCH → honest save-line). No second
> write path. LOOKS: apply = `PATCH` with the snapshot's three facets (no dedicated endpoint);
> SAVE CURRENT = `POST /me/device/looks` (cap ~12); delete = `DELETE /me/device/looks/:id`;
> **ON NOW is computed client-side** (facets equality vs live device — never a stored flag) (0030/OQ-064).
>
> **⚠ THE 0069/DEV-04 LIGHT-THEME TENSION (flagged, needs the owner's eye at gate-5).** The fresh
> button convention makes `/secondary` **cream** — on the three LIGHT themes (PAPER `#ece5d1` is
> itself cream-adjacent) a cream key on `scr.bg` can lose the DEV-04 contrast floor. The theme palettes
> must carry enough contrast in their mapped tokens (light themes flip ink dark per §1.1), and parvati
> walks the floor per theme; if cream-on-Paper fails the floor, the ruling (cream stays vs a per-theme
> chip token) goes to the owner — NOT silently resolved.
>
> **Copy law (OQ-110):** no spec-ID strings in rendered copy. **CARD-16:** every gesture ships with
> its tap pair — the sticker TransformBox gets the round-5 **stepper-row grammar** (X·Y arrows ·
> scale/rotation ◀ ▶ steppers) as its non-gesture twin; reduce-motion honors 0044.
>
> **Status legend:** as the canvas manifest (OWED · PRE w/ cite · EXPECTED(cite) · ASSUMPTION · GAP).

---

## Shared chrome (every device-editor state)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| C1 | Entry — Profile's **MY DEVICE strip goes PRESSABLE** → the editor as a `FlowTakeover` (frame + NavBand persist, **PROFILE keycap active**); the strip itself goes DYNAMIC (reads `/me/device`: "«SHELL» · «THEME»" + sticker count) | profile.tsx devRow | board `:337`; §2.15; PRE strip is static "POCKET · TEAL" (`profile.tsx:168–177`, no onPress) | OWED |
| C2 | Head — `ScreenHead`("DEVICE") + **`‹ RETURN TO PROFILE`** return-link. **NO PIXELS `CountTag`** at M4 | flow-head | board `:335–337` draws the gold ccount 27 → **EXPECTED(M5 · 0062 — commerce chrome rides the wallet)** | OWED |
| C3 | **Edit-readout** — dot + "EDITING YOUR DEVICE" + the live sub ("«SHELL» · «THEME» · N STICKERS") | edit-readout | board `:338`; sub mutates per state (D2 switch · D4 live transform readout · D5 ok-dot) | OWED |
| C4 | **`SectionSwitch/rail`** — bottom-docked, 4 `SectionCard`s **SHELL · THEME · STICKERS · LOOKS** (icon in-line + label; active = accent border, **no pip**) | SectionSwitch/rail (0030/OQ-063) | board `:352–357`, CSS `:184` | OWED — the /rail variant exists in the catalog (component-map §5.3) |
| C5 | **Autosave** — every mutation → local apply + ONE debounced `PATCH /me/device` + the honest save-line grammar ("SAVED LIVE" D5 `:563`) | (session) | ARCH 3; the styler save-line/15s-tick precedent (CR-04) | OWED |
| C6 | Suite lifecycle — **D8 Skeleton** (solid fills; chrome renders immediately) · **D9 Offline** (browse owned from cache; SAVE CURRENT gated, SYS-10) · **D10 LoadError** ("SIGNAL LOST" + RETRY; "your device and its current look are safe"; rail dims) | Skeleton/OfflineStrip/LoadError families | board `:835–967`; §1.6. D9's locked premium tiles → EXPECTED(M5) — at M4 offline gates only SAVE CURRENT + the PATCH retry | OWED |

## D1 — The landing: SHELL (board `:326–374`)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| 1 | SHELL section — title + sub ("Your colourway — one handheld, five wraps") + **5 `ItemTile`s: TEAL ★ · GRAPE · SUNSET · PINK · CARBON** (swatch = a mini device render in that shell) | ItemTile row | board `:339–347`; §1.1 hex tables (full) | OWED — **all 5 FREE at M4** (0068 posture); the board's EQUIPPED pill → the selected tile IS the equipped one (`.sel`) |
| 2 | Picking a shell **re-wraps the LIVE frame instantly** (the frame above IS the subject) + persists (C5) | theme engine (shellId) | board `:349` hint; DEV-02 | OWED — ARCH 1 (the 4 shell.* files) |
| 3 | The free default (Teal) **always renders** — no broken shell ever | — | DEV-03 | OWED — absent/unknown shellId → Teal |

## D2 — Shell-switch (board `:376–427`)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| 1 | On switch: readout flips ("SWITCHED — «CARBON» WRAP · SAME POCKET · STICKERS + THEME RIDE ALONG") + a **before→after `MiniDevice` pair** ("WAS · TEAL ➔ NOW · CARBON") | pstage + MiniDevice ×2 | board `:388–403`; OQ-042 one-body | OWED — MiniDevice gains a `shellId` prop (PRE: static teal, `MiniDevice.tsx`) |
| 2 | Stickers + theme **ride along** across the swap (visible on the frame + the minis) | — | DEV-02/03 | OWED — falls out of ARCH 2 (state-fed shell layer) |

## D3 — THEME: the whole page previews (board `:429–478`)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| 1 | THEME section — **6 `ItemTile`s: MIDNIGHT ★ · DEEP SEA · BERRY · PAPER · MINT · LILAC** (swatch = stacked bg/well/accent bars) | ItemTile row | board `:445–452`; §1.1 hex tables | OWED — **all 6 FREE at M4**; the board's 4 PX chips → EXPECTED(M5) |
| 2 | Picking a theme **re-themes the WHOLE live screen** (wells · accents · tools) + a **`PreviewStrip`** banner ("◆ PREVIEWING — «DEEP SEA»" + EXIT ✕) while the pick differs from the saved theme; EXIT reverts | PreviewStrip + theme engine | board `:437–441`; DEV-04 | OWED — ARCH 1. **At M4 free: pick = apply+persist**, so the strip shows during the same-session try-on beat (pick ≠ last-saved → strip + EXIT reverts to saved; a second confirm-free beat matches the board without commerce) — **ASSUMPTION(free-path preview read), owner may simplify to instant-apply-no-strip** |
| 3 | **`floor-note`** — "LEGIBILITY FLOOR HELD · THE SHELL STAYS «TEAL» PLASTIC" (the theme dresses the screen, never the body/nav) | floor-note | board `:453`; DEV-04/F-04 | OWED — the light-theme/0069 tension flagged in the banner rides here |
| 4 | KeepBar ("DEEP SEA — PREMIUM, IN PREVIEW · KEEP ›") | — | board `:456` | **EXPECTED(M5 · COSM-03/0062)** |

## D4 — STICKERS: place / scale / rotate (board `:485–542`)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| 1 | STICKERS section — the **`StickerTray`**: **8 glyph tiles** (ROCKET · STAR · HEART · BOLT · CASSETTE · SATURN · NEON CAT · RAINBOW), react-native-svg | StickerTray | board `:506–515`; 0063 §5 defers the roster HERE | OWED — **ASSUMPTION(roster): ship the board's 8, all `tier:'basic'`** (0068 precedent; the 3 drawn price-chips → EXPECTED(M5); the D4-vs-D7 CAT 4-vs-6 PX price discrepancy recorded, moot at M4) |
| 2 | Tapping a tray glyph **places it in the forehead zone** as the selected sticker; **`decal-zone`** dashed outlines mark the two legal regions while STICKERS is active | StickerStage + decal-zone | board `:490–492` | OWED |
| 3 | **`TransformBox`** on the selected sticker — accent ring + 4 cream corner handles + a **rotation stem** (the Canvas sel-ring kin); drag = move (zone-clamped) · corner = scale (0.5–2.0) · stem = rotate; the readout mirrors live ("PLACING — ROCKET (124% · −9°)") | TransformBox | board `:493`, CSS `:134–139`; OQ-062 | OWED — **CARD-16 pair: the round-5 stepper-row grammar** (X·Y arrows + scale/rotation ◀ ▶ rows) docks under the tray when a sticker is selected |
| 4 | **Refusal** — a drag toward the screen ghosts + "**⊘ SCREEN — DISPLAY ONLY**"; the nav band wears "**NAV — KEEP CLEAR**" while dragging | ghost + block-tag + nav-protect | board `:495–496`, `:527` | OWED — client layer 1 of the DEV-03 triple |
| 5 | Sticker ops — **delete** (the selected sticker; undo-free at M4 → a `ConfirmSheet`? NO — deletion is re-addable, cheap: no confirm, 0040 reserves confirms for non-undoable destroys) + a sticker COUNT sanity cap (the zone is small; cap ~6/zone) | — | 0040; OQ-062 | OWED — **ASSUMPTION(per-zone cap ~6, server-enforced)** — not drawn; filed to open-questions if the owner wants a different number |
| 6 | Every transform persists via C5 (debounced PATCH; the server re-validates zone + bounds) | — | ARCH 2/3 | OWED |

## D5 — The on-shell preview (OQ-045) (board `:544–591`)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| 1 | **"◉ ON-SHELL PREVIEW — HOW IT WEARS"** accent strip + **handles/controls hide** — the true wear-preview; "EDIT ◅" returns | PreviewStrip/accent | board `:554–560` | OWED — a `previewing` boolean; the ok-dot readout ("YOUR DEVICE — AS IT WEARS · 3 STICKERS · «TEAL» · «MIDNIGHT»") |
| 2 | Bottom row — "SAVED LIVE" + **◅ KEEP EDITING** (primary) + **DONE** (secondary → back to Profile) | ScreenButton pair | board `:562–567`; **0069:** DONE = cream `/secondary` | OWED |
| 3 | Nav keycaps legible beneath every decal — the F-04 proof state | — | DEV-03; board floor-note `:559` | OWED — parvati walks it per shell × theme |

## D6 — LOOKS (board `:593–659`)

| # | Element | Component | Notes | Status |
|---|---------|-----------|-------|--------|
| 1 | LOOKS section — the **`LooksGrid`** (3-col): each **`SavedLook`** = a `MiniDevice` in that look's shell + a theme-tinted mini-screen + a mini-sticker + the **shell·theme identity label** ("CARBON / DEEP SEA" — **no custom name**) | LooksGrid + SavedLook | board `:609–631`; DEV-05/OQ-064 | OWED |
| 2 | The **ON NOW** badge on the current look — **computed** (facets == live device), never stored | on-tag | board `:611`; 0030 | OWED |
| 3 | **Tap a look → wear it instantly** (PATCH the snapshot's three facets — no apply endpoint) | — | board `:632` hint | OWED |
| 4 | **× delete** per saved tile (ConfirmSheet §1.8 — a look is NOT re-derivable); the **ON NOW look carries no ×** (switch first — the card-switcher can't-delete-while-equipped kin, OQ-061) | lk-del + ConfirmSheet | board `:615–626`, caption `:650–658` | OWED |
| 5 | **+ SAVE CURRENT** save-tile — snapshots the live combo; **cap ~12** (server-enforced, `LOOK_CAP_REACHED`); the save-tile dims at cap | save-tile | board `:627–630`; api 0.27 | OWED |

## D7 · D7b · D7c — Premium / cart / reconcile (board `:666–833`)

**EXPECTED(M5 · decision 0062 §2 + COSM-03/ECON-07) — the whole row.** The KeepBar, the cost-flag,
the cross-section cart, the `ReconcileSheet` (+ short-by-N bridge + PackTiles + HOLD TO ACQUIRE),
and `POST /cosmetics/acquire-batch` all ride the M5 economy. At M4 nothing is premium (0068), so the
trigger condition (≥1 unowned item in preview) is unreachable by construction. The 0030/OQ-065 cart
rulings stand recorded for the M5 build. *(Board discrepancy recorded: NEON CAT 4 PX in D4 vs 6 PX
in D7 — resolve when premium prices are set.)*

## D8 · D9 · D10 — Lifecycle (board `:835–967`)

Per C6. D9 note: at M4 the offline gate covers **SAVE CURRENT + the device PATCH retry** (the
soft-fail save-line grammar, SYS-10); the board's locked premium tiles are the M5 half. D10's copy
("your device and its current look are safe") is the CARD-14 draft-safe kin — the device state is
server-truth, the editor reopens clean on RETRY.

---

## State-table walks (binding)

1. **Section (`section: shell | theme | stickers | looks`)** — the rail switches; **selection/preview
   state carries across switches** (D7b's cart-carry is M5, but the free try-on equivalent — an
   unsaved theme preview surviving a section hop — holds at M4). Default landing: SHELL.
2. **Mutation → one pipeline** — every change: local apply (redux `prefs`/device state) → debounced
   `PATCH /me/device` → save-line. Failure = the styler grammar (soft retry + "NOT SAVED — RETRYING";
   4xx surfaces inline, no retry loop).
3. **Sticker select (`selectedStickerId: string | null`)** — tray-tap places+selects; stage-tap
   selects; tap-out/preview deselects. TransformBox + the stepper rows render only while selected.
   Drag clamps to the zone rect live; a cross-zone drag re-zones the sticker (forehead↔chin) when it
   lands wholly inside the other zone — **ASSUMPTION(re-zone-on-drop)**, else clamp-to-origin-zone.
4. **Theme preview (`previewTheme: id | null`)** — pick ≠ saved → strip shows, screen re-themes;
   EXIT ✕ reverts to saved; navigating away or DONE commits the pick (it already persisted via the
   pipeline — EXIT is the one un-commit door). Reduce-motion: no cross-fade, instant swap.
5. **Look apply** — PATCH `{activeShellId, screenThemeId, stickerComposition}` from the snapshot →
   the three facets swap in one commit; ON NOW recomputes; the editor sections reflect immediately.
6. **Exit** — RETURN TO PROFILE / DONE: the device state is already persisted (no two-door model here
   — there is no draft document; the device IS live truth, the styler's exit machinery does NOT
   apply). The only confirm on this surface is look-delete (D6·4).

## Component reuse (map §11 — compose, don't fork)

NEW (all §1.5-named, 0030): `SectionCard` (rides `SectionSwitch/rail`) · `StickerStage` ·
`TransformBox` · `PlacedSticker` · `StickerTray` · `SavedLook` · `LooksGrid`. NOT built at M4:
`KeepBar` (M5, above). REUSED: `MiniDevice` (gains `shellId`/`themeId`/mini-sticker props) ·
`ItemTile` · `PreviewStrip` · `ScreenButton`/`ToolButton` (0069 convention) · `ConfirmSheet` ·
`Skeleton`/`OfflineStrip`/`LoadError` families · the round-5 stepper-row grammar (CARD-16 pair).
NEW infra: the **theme engine** (ARCH 1 — `useTheme`/`themedStyles` + palettes + lint rule) ·
`deviceStickers.ts` (svg path registry) · the `device_configs`/`device_looks` server slice.

## Declared assumptions / gaps (none silent)

- **ASSUMPTION(roster-all-basic):** the board's 8 stickers + 5 shells + 6 themes ship `tier:'basic'`
  (0068 precedent; 0063 §5 deferred the device roster to this build). The owner re-tags at M5.
- **ASSUMPTION(free-path preview read)** — D3·2 above; owner may simplify to instant-apply.
- **ASSUMPTION(per-zone sticker cap ~6, server-enforced)** — D4·5; number is the owner's.
- **ASSUMPTION(re-zone-on-drop)** — walk 3.
- **GAP(token-name drift):** design-spec §1.1 token names vs the code's live keys (`well/tools/head/…`
  vs `panel/panelHi/…`) — reconciled by a mapping table in the theme module, NOT a rename. Filed to
  open-questions as a doc-debt item (the §1.1 table should eventually note the code keys).
- **FLAG(0069 × DEV-04):** cream `/secondary` on the three light themes — the banner tension; owner
  eyes at gate-5, parvati walks the floor per theme.
- **The dev-time premium-unlock note (0063 §6)** is MOOT at M4 (everything basic).

## Browser BOOT check (binding)

Login → Profile → **MY DEVICE strip (now live) → the editor mounts in-frame** (PROFILE keycap active,
rail on SHELL) → pick GRAPE (frame re-wraps live, minis flip WAS/NOW) → THEME → pick DEEP SEA (whole
screen re-themes, strip + floor-note; EXIT reverts; re-pick) → STICKERS → place ROCKET (lands in the
forehead zone, TransformBox + steppers) → drag toward the screen (⊘ refusal + NAV KEEP CLEAR) →
scale/rotate (readout ticks) → ON-SHELL PREVIEW (handles hide) → EDIT ◅ → LOOKS → SAVE CURRENT (tile
appears, ON NOW) → apply a different look (facets swap) → × a non-current look (ConfirmSheet) →
RETURN TO PROFILE (strip reads the new shell·theme) → **cold reload → the shell/theme/stickers
persist on every screen** (the ARCH 2 proof). Autosave PATCHes observed per mutation batch; zero
console errors; nav keycaps legible in every combination walked.
