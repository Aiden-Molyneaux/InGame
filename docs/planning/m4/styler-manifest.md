# styler — screen manifest (from styler-states.html, 2026-07-05)

> **Surface:** M4 §3.2 Styler (the in-frame card editor — decision 0014 stage 2). **Board:**
> `docs/design/mockups/styler/styler-states.html` (P1–P11, carousel ruling 2026-06-12; flat chips).
> **Authority stack:** design-spec **§2.5** (the formalized composition + state matrix) · product-spec
> CARD-12/14/16/18/24 · decisions **0062** (free/private boundary) · **0063** (the COSM-02 free roster)
> · **0064** (render module / composition schema) · **0066** (draft document · save-private posture ·
> equip semantics). **Code:** `apps/mobile/app/styler/[gameId].tsx` (+`?cardId=` resume) +
> `src/components/styler/{BaseRail,AttributeSection,SectionChips,IntensitySlider,KeepBeat}` +
> the render module (`src/render/`) + existing `{ScreenButton,PulledSheet,ConfirmSheet,TertiaryLink,
> GameCard}`.
>
> **⚠ THE 0062 BOUNDARY GOVERNS THIS BOARD.** The board draws the premium preview-then-acquire economy
> throughout (price-chips · PREVIEW flag · cost-stack · the P3/P4/P5 premium-picks header · **P6
> ReconcileSheet + funded fragment** · the ccount PX header counter · the P7 "17 PX SPENT" line).
> **ALL of it is `EXPECTED(M5 · CARD-13/COSM-03/ECON, decision 0062 §2)`** — drawn, marked, NOT built.
> The M4 Styler is the **free/private path**: free assets (0063) → live compose → **KEEP (save-private
> + equip)** / **SAVE PRIVATE** / **draft autosave**. The received-base (adopt-then-edit) P1 fragment is
> likewise `EXPECTED(M5 · adopt)`. **No publish** (canvas-tier, 0014) — that's not even on this board.
>
> **⚠ CLOSED ATTRIBUTES = RENDER-MODULE TOKENS AT M4 (0064/0066).** The five closed attributes are not
> DB entities yet — they ride the composition's `.passthrough()` envelope and render via the 0064
> module. **This build is where the free roster becomes real render kinds** (the module today draws
> `effect: none|scanline` — the 0063 free effects land as skia overlay kinds here; additive, no
> schemaVersion bump). The roster ships as a **client constants module** (`src/styler/roster.ts`)
> mapping roster ids → composition patches, content per **decision 0063** (frames ·
> effects (+NONE) · finishes (+STANDARD) · nameplates SLAB/RIBBON/BEVEL · fonts + free inks — read 0063
> for the exact list; SYS-08-tunable seed, the pre-launch design pass may re-skin it).
> **Contract-deviation-by-deferral (recorded, 0058-style):** `GET /games/:gameId/card-bases` +
> `/surprise` stay **unimplemented at M4** — the BaseRail's system bases + Surprise-me compose
> **client-side from the free roster** (static free compositions; Surprise-me = a client deal). The
> server routes become load-bearing with the curated/premium roster (M5 / the 0063 design pass).
>
> **Data seams (0066, all live once the substrate batch lands):** `POST /cards` (create draft) ·
> `PATCH /cards/:id` (debounced autosave; name + composition) · `POST /cards/:id/save-private` ·
> `DELETE /cards/:id` (draft discard; 0040 ConfirmSheet; 409 CARD_EQUIPPED unreachable for drafts) ·
> `GET /me/style-presets` (CARD-24b BaseRail merge) + `POST` (save a preset, cap-30 → 409
> PRESET_LIMIT) · equip = `PATCH /me/collection/:entryId { activeCardDesignId }` (private|published
> only — **a draft is not equippable**, 0066 §5).
>
> **Copy law (OQ-110, folded):** NO spec-ID strings in rendered copy — the board's annotation hints
> ("CARD-16: NEVER A BLANK CANVAS", "(OQ-048)") are board-notes, not UI copy. Screen palette =
> `theme.scr.*` Midnight (the app token, not the board's local bg) — same ruling as §3.1.
>
> **Status legend:** as game-page-manifest (OWED · PRE · EXPECTED(…) · ASSUMPTION · GAP).

---

## Shared chrome (every state)

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| C1 | DeviceShell + NavBand, COLLECTION active + LIVE (FlowTakeover of the Game page — same ShellNav context as `/game`) | DeviceShell·NavBand | — | frame | — | PRE; `/styler` joins ShellNav's Collection context (mirrors `/game`, §3.1) |
| C2 | Flow head — **◂ back** keycap · "STYLER" (display 21) | flow-head (add-game FlowHeader pattern) | display 21 | head | "STYLER" | OWED (`:496`) — ◂ = quiet exit, draft autosaved (see state-walk 6); flips to **✕** on the KeepBeat (`:1038`) |
| C3 | PX wallet counter (ccount "5") | — | — | head right | — | **EXPECTED(M5 · wallet/ECON-07, 0062)** (`:496`) — no wallet at M4 |
| C4 | **CARD-24a save-state line** — "EDITING «name» · SAVED 12s AGO / SAVING…" + **SAVE AS NEW** | micro line under head + overflow action | micro 9 | under head | live save state | OWED **(spec-driven — CARD-24a P0; the board predates the ruling, no artboard line — cite product-spec CARD-24(a), decision 0062 §8)**; SAVE AS NEW = `POST /cards` w/ current composition (0066 §6) |
| C5 | Game context line — "DESTINY · LIVE — EVERY PICK REDRAWS THE CARD" | hint micro | micro 9, dim | scroll top | game name · mode | OWED (`:575`) — copy cleaned per OQ-110 |

## P1 — Entry / start-from (BaseRail — never blank, CARD-16) (board `:484–559`)

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| 1 | "START FROM — SYSTEM BASES" section head | sec | micro 9 | scroll | — | OWED (`:499`) |
| 2 | **BaseRail** — 3-up fan: fore (pick-size 138×193) + 2 neighbours (pick-nb), CardFan grammar (swipe/chevron rotate; fore = the live start choice) | `BaseRail` (composes the CardFan pattern) | fan | body | — | OWED (`:500–514`) — sources: **DEFAULT (CARD-18 face) · free templates · free preset kits (face + frame/effect bundle, 0063) · [CARD-24b] my saved STYLE PRESETS** (merged client-side from `GET /me/style-presets`, api 0.51/0.53) |
| 3 | Fan dots + ‹ › + SWIPE label + the base label line ("NEBULA TEMPLATE · **DEFAULT — FOREFRONT** · ARCADE KIT") | sdots + base-lbl | micro 9 | under fan | names the 3 visible | OWED (`:515–516`) |
| 4 | Templates-vs-kits hint | hint | micro 9 | under | "Templates are single faces · preset kits arrive wearing a frame + effect bundle" | OWED (`:517`) — no spec-IDs (OQ-110) |
| 5 | **⯒ SURPRISE ME — DEAL A START** (secondary mini) | `ScreenButton` secondary | mini | CTA stack | "SURPRISE ME — DEAL A START" | OWED (`:519`) — **client-side deal** from the free roster (ASSUMPTION: `/card-bases/surprise` deferred, see banner); non-idempotent re-deal per tap |
| 6 | **START WITH THIS** (primary) | `ScreenButton` primary | — | CTA stack | "START WITH THIS" | OWED (`:520`) — `POST /cards {gameId, composition}` → the P2 surface on the new draft |
| 7 | Adopt-door hint ("community faces live in Add Game / the gallery — not here") | hint | micro 9 | under CTA | — | OWED copy (`:521`) — gallery itself M5 |
| 8 | Received-base fragment (adopt-then-edit; rail collapsed → "CHANGE BASE") | — | — | — | — | **EXPECTED(M5 · adopt/ECON-03 · `:534–547`)** |
| 9 | Resume path — opened with `?cardId=` (Game-page EDIT IN STYLER / a DRAFT tile) skips P1 → P2 on that document | route logic | — | — | — | OWED **(CARD-24a/0066 §6; the board's P1 is the NEW-card entry only)** |

## P2 — The editing surface (the carousel: fixed hero + 5 sections + the Canvas chip) (board `:561–639`)

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| 1 | **Fixed hero** — the live card (styler-size ~200×279, fluid 63:88) rendered from the DRAFT composition via the 0064 module (`CardComposition` skia `<Canvas>`), **redrawn on every pick**, effect overlay LIVE | hero (render module) | styler-size | top, centered | — | OWED (`:576–581`) — THE load-bearing element; skia on web = verify at BOOT |
| 2 | **SectionChips** — FRAME · EFFECT · FINISH · PLATE · TITLE + the **⤢ CANVAS sixth chip (orange, always present)** | `SectionChips` (SectionSwitch/chips kin) | chips row | under hero | 5 names + "⤢ CANVAS" | OWED (`:582–589`); active = accent + pip; **chips are TAP-navigable (the non-gesture baseline)**; CANVAS chip present-but-disabled → **EXPECTED(§3.4 Canvas)** with a quiet "arrives with the Canvas" note |
| 3 | Section dots + ‹ › + "SWIPE SECTIONS" | sdots | micro | under chips | — | OWED (`:590`) — swipe AND chip-tap both switch (CARD-16 baseline) |
| 4 | **AttributeSection carousel** — pages slide under the fixed hero (mid-swipe drawn `:592–610`); each page: section head + **attr-rail** of `atile`s (cell-size sample card wearing JUST that attribute + name + FREE tag; selected = accent border + at-pip, F-09) | `AttributeSection` + atile rail | h-scroll rail | body | per-section | OWED — **M4 rails = the 0063 FREE roster only**; price-chips/PREVIEW/cost-stack/owned-tags → **EXPECTED(M5 · `:596–599` etc.)**; "ALL N ›" full browser → **EXPECTED(CARD-17 at-scale)** — the free roster fits the rail |
| 5 | **Pinned outcome bar** — SAVE PRIVATE (quiet tert) · spacer · **KEEP — EQUIP IT** (gold, F-02 step, ◆ icon) | tools bar (`TertiaryLink` + `ScreenButton/add`) | pinned above nav | bottom | "SAVE PRIVATE" · "KEEP — EQUIP IT" | OWED (`:612–616`) — OQ-108 labels: KEEP = "equips it everywhere"; SAVE PRIVATE = "kept in this game's switcher, not equipped" (subcopy/toast) |

## P3–P5b — The five sections (each = P2's grammar + its roster) (board `:641–935`)

| # | Section | Page content beyond the rail | Status |
|---|---------|------------------------------|--------|
| 1 | **FRAME** (`:643–706`) | free frames incl. the DEFAULT/none + named free set (0063); pick redraws hero frame | OWED — premium rows (STEP GILT/SCANLINE price-chips, PREVIEW flag, cost chips) **EXPECTED(M5)** |
| 2 | **EFFECT** (`:713–786`) | **one-at-a-time** (CARD-12 — picking another SWAPS, one at-pip ever) + **`IntensitySlider`** (flat track F-09 · accent fill · cream thumb · % value) — **intensity persists in the composition** (OQ-048/CARD-12) and drives the live overlay | OWED — the free effects (0063) implemented as render-module overlay kinds (banner); NONE row first; swap-hint copy cleaned |
| 3 | **FINISH** (`:788–860`) | **stacks over the effect** (separate layer, CARD-12) — STANDARD/none + the free finishes (0063); both live on the hero simultaneously | OWED — premium finishes (HOLO/CINDER chips) **EXPECTED(M5)** |
| 4 | **PLATE / NAMEPLATE** (`:863–935`) | the plate OBJECT — **SLAB (default) · RIBBON · BEVEL** (free, 0063); the hero's plate re-shapes live; "the name always renders" (curated shapes) | OWED — HOLO PLATE material **EXPECTED(M5)**; plate shapes = nameplate field in the composition envelope |
| 5 | **TITLE** (`:831–836`, on the P5 page) | font swatches ("Aa" tiles — CHAKRA default + the free fonts, 0063) + **ink** row (free ink palette) | OWED — premium fonts (PIXELLA chip) **EXPECTED(M5)** |

## P6 — ReconcileSheet (KEEP with premium debt) (board `:942–1024`)

**EXPECTED(M5 · CARD-13/ECON, decision 0062 §2) — the whole state.** At M4 KEEP never owes a
reconcile (free-only). The `ReconcileSheet` + funded/short-by-N bridge build with the M5 economy.

## P7 — Outcomes: KEEP → KeepBeat · SAVE PRIVATE · the Canvas door (board `:1026–1090`)

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| 1 | **KeepBeat** — the finished card centered + ONE gold edge-pulse (the 0015 light tier — deliberately no ritual) + the ✓ ok-strip | `KeepBeat` | — | body | "EQUIPPED FOR <GAME>" · "YOUR SHELF WEARS IT NOW" | OWED (`:1040–1052`) — the PX-spent ledger line **EXPECTED(M5)**; **reduce-motion: the pulse respects the OS setting** (0044 baseline — skip animation, keep the strip) |
| 2 | KeepBeat clout strip (aggregate — CARD-05/decision 0036) | stats line | micro | under strip | "N CARDS DESIGNED · 0 ADOPTIONS" | OWED **honest-real** — `/me.stats.cardsDesigned` is real once card_designs lands; adoptions honest-0 until M5 (never per-card) |
| 3 | Header ◂ flips to **✕** on the beat | flow-head | — | head | — | OWED (`:1038`) |
| 4 | **⤢ EDIT ART — the Canvas door** | canvas-door line | — | under beat | "EDIT ART — reopen in the Canvas" | present-but-disabled → **EXPECTED(§3.4)** (`:1055`) |
| 5 | **DONE — BACK TO THE GAME** (primary) | `ScreenButton` | — | CTA | "DONE — BACK TO THE GAME" | OWED (`:1056`) — returns to `/game/:gameId` (the switcher now lists + wears the card) |
| 6 | SAVE PRIVATE outcome (fragment) — the QUIET exit: no beat; toast/inline "saved to <game>'s card switcher — not equipped" → back | toast + nav | — | — | OQ-108 label | OWED (`:1069–1081`) |

## P8 — The closed set exhibit (board `:1092–1133`)
A design-side taxonomy record (five in, OVERLAY cut) — **no build obligation** beyond the five
sections existing (they do, P2–P5b). Not a screen state.

## P9–P11 — Lifecycle (board `:1137–1316`)

| # | State | Status |
|---|-------|--------|
| 1 | **P9 loading Skeleton** — solid fills in the surface's shapes (hero + chips + rail), §1.6 grammar (`:1142–`) | OWED — shown while the draft/roster/presets load |
| 2 | **P10 LoadError** — SIGNAL LOST + RETRY, **draft-safe copy** ("your draft is saved" — CARD-14) (`:1201–`) | OWED — the §1.8 family (same components as §3.1) |
| 3 | **P11 Offline** — draft-safe · writes gated (SYS-10) (`:1244–`) | **EXPECTED(SYS-10 — no offline infra at M4; same stance as §3.1 L3)**. **In scope regardless:** autosave FAILURE-TOLERANCE — a failed `PATCH` must fail SOFT (keep the local draft state + retry + the C4 save-state line shows "NOT SAVED — RETRYING", never silent loss). murr's autosave lane. |

---

## State-table walks (binding rule (b))

1. **Entry (`mode: pick | edit | kept`)** — no `cardId` param → `pick` (P1, the BaseRail); START WITH THIS
   / SURPRISE-ME-then-START → `POST /cards` → `edit` (P2) on the new draft. `?cardId=` → fetch + `edit`
   directly (resume — Game-page EDIT IN STYLER / a DRAFT tile). KEEP success → `kept` (P7 beat).
2. **Section (`section ∈ frame|effect|finish|plate|title`)** — swipe OR chip-tap; hero + chips + dots
   fixed, only the page slides; the active chip wears accent+pip; one section active at a time.
3. **Draft mutation → autosave** — every pick patches the local composition (hero redraws
   synchronously from local state) and schedules the debounced `PATCH /cards/:id` (~1–2s); the C4 line
   tracks `saving | saved <t> ago | not saved — retrying` (failure-tolerance, P11 note). The
   Styler↔(future Canvas) posture switch rides the SAME row (0066 §6).
4. **EFFECT one-at-a-time** — picking effect B replaces A (single at-pip); NONE clears; the
   IntensitySlider binds to the current effect's intensity, writes into the composition (OQ-048), hidden
   when NONE.
5. **KEEP** — `POST /cards/:id/save-private` → `PATCH /me/collection/:entryId {activeCardDesignId}` →
   `kept` (KeepBeat; invalidate Collection so the shelf wears it). Failure at either step: surface the
   error inline (the §3.1 murr lesson — never a silent swallow); the draft is still autosaved.
6. **Exit (`◂` / hardware back)** — QUIET: the draft is autosaved; navigate back (it lists as DRAFT in
   the switcher + /me/cards). If the document is a **never-kept new draft with zero user edits**,
   delete it silently (no orphan rows). An explicit **DISCARD DRAFT** action (overflow/exit) →
   0040 `ConfirmSheet` → `DELETE /cards/:id` → back. (OQ-108's CANCEL-ALL, reconciled with autosave.)
7. **SAVE PRIVATE** — save-private WITHOUT equip → quiet toast + back (state-walk 6's landing); the
   card appears in the switcher as PRIVATE (the §3.1 CardSwitcher now renders it — its multi-card
   grid goes live with this batch).
8. **Lifecycle** — `isLoading` → P9 skeleton; draft/roster fetch error → P10 (draft-safe copy);
   offline → EXPECTED (P11 note).

## Component reuse (map §8a — compose, don't fork)
`BaseRail` (CardFan grammar) · `AttributeSection` · `SectionChips` (SectionSwitch/chips kin; the map
alias) · `IntensitySlider` (NEW §1.5 piece) · `KeepBeat` — all named in component-map §8a/design-spec
0.13. Reused: `ScreenButton` (primary/secondary/add), `TertiaryLink`, `PulledSheet`/`ConfirmSheet`
(discard), `GameCard` (atile samples MAY use the placeholder face wearing single attributes — or small
`CardComposition` renders if perf allows; judgment at build, note which), the 0064 render module for
the hero (MANDATORY — the hero is the real composition, not a mock). `KeepBeat`≠`KeepBar` (device
cart) — never co-located (map 15b).

## Declared assumptions / gaps
- **ASSUMPTION(card-bases client-side):** `GET /games/:gameId/card-bases` + `/surprise` deferred; the
  BaseRail composes system bases + the Surprise deal from the client roster module (banner). Recorded
  0058-style; the routes land with the curated roster.
- **ASSUMPTION(roster = client constants):** the 0063 free roster ships as `src/styler/roster.ts`
  mapping ids → composition patches + render kinds; SYS-08 seed formalization rides the pre-launch
  design pass.
- **GAP(CARD-16 full a11y):** never-blank ✓ + Surprise ✓ + chip-tap non-gesture section nav ✓ + SR
  labels ✓ + KeepBeat reduce-motion ✓ at this build; the complete non-gesture path + coachmarks +
  the a11y board ride §3.6 (decision 0062 §4 — design-first; launch gate, not skipped).
- **Game-page integration goes live:** DESIGN NEW → `/styler/:gameId` (new); EDIT IN STYLER →
  `/styler/:gameId?cardId=` (enabled for own draft/private designs); the CardSwitcher renders the real
  multi-card list from `GET /me/collection/:entryId/cards` (replacing the §3.1 default-only interim) —
  update the game-page manifest rows CARDS-2/3/6/7/8 statuses at this pass.

## Browser BOOT check (binding rule (c))
Login → Game page → DESIGN NEW → the BaseRail MOUNTS (P1); START WITH THIS → the P2 surface mounts
with the **skia hero rendering the draft on web** (the render module's first in-app web appearance —
if canvaskit/web breaks, that is a BOOT-check failure to surface, not to paper over); exercise chips ·
swipe · a pick per section · intensity · SAVE PRIVATE · KEEP→KeepBeat→DONE (lands on the Game page
wearing the card) · resume via EDIT IN STYLER · discard via ConfirmSheet. parvati captures per-state
shots at ~390×844.
