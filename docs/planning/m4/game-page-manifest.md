# game-page — screen manifest (from game-page-states.html, 2026-07-05)

> **Surface:** M4 §3.1 Game page hub shell (**THE FIRST ARTICLE** — the CARD-23 NAVIGATE target + the
> M3-deferred per-game host). **Board:** `docs/design/mockups/game-page/game-page-states.html`
> (flat/2D "Inset Recess" + Scanline Energize, Teal shell · Midnight screen).
> **Code:** `apps/mobile/app/game/[id].tsx` + `src/components/game/{DualFaceHero,StatsBack,PlayDossier,
> CardSwitcher,CardDetailSheet,GameTabDock,ConfirmSheet}` + existing `src/components/{GameCard,
> ScreenButton,ScreenHead,PulledSheet,SectionSwitch,StateMark,TextField,GenreTag,TertiaryLink}`.
>
> **⚠ MILESTONE ≠ BOARD-STATE LABEL.** The board labels its artboards **M1–M8** as *ownership/lifecycle
> STATES*, NOT milestones. The **M4 build scope** = board-states **M1 PLAY · M2 EDIT-STATS · M3
> CARDS-switcher (own cards) + CardDetail INSPECT + L1/L2/L3 lifecycle**. Board-state **M4** (community
> gallery + adopt) → `EXPECTED(M5)`; board **M5 ABOUT → M5 · M6 neutral → M6 · M7 friend → M7 · M8
> upcoming → M8 · L4 moderation → M6/M7**.
>
> **⚠ SUBSTRATE REALITY (OQ-133 — the headline first-article finding).** Decision 0062 / the M4 brief
> assume the CARDS-switcher endpoints (`GET /me/collection/:entryId/cards`, `/me/style-presets`,
> `activeCardDesignId`) "already exist (api-contract 0.51)" — they exist **only in the contract doc**.
> The server has **no** `card_designs`/`style_presets`/`platforms` tables and **none** of those routes
> (decision 0058 §7 deferred them "to M4 with their substrates"; that backend has not been built — this
> is the first M4 surface, and user cards are only *created* in the Styler §3.2). **Live (M3-built)
> reads/writes this surface uses:** `GET /me/collection` (the shelf, entry resolved client-side by
> `gameId`), `PATCH /me/collection/:entryId {status,hours,percentComplete,ownedSince,rating,notes}`,
> `DELETE /me/collection/:entryId` (COL-01), `PUT /me/now-playing {gameId|null}` (WTP-03). **Not built
> → `EXPECTED`:** `GET /catalog/games/:id` (owned states source catalog facts from the entry instead),
> the `card_designs` switcher-feed (the switcher renders the one **CARD-18 default card** client-derived
> from `entry.card`), `activeCardDesignId`/SET-AS-MAIN, `platformIds` (COL-04), all `/cards/*` mutations,
> and the composed CARD-15 card FACE (renders the CARD-18 placeholder per decision 0058 §6).
>
> **Scope filter: M4.** Later-milestone elements are listed + `EXPECTED(<milestone> · <ID/cite>)` —
> parvati must not flag them, the builder must not build them. Every row cites board evidence as
> `game-page-states.html:<line>` (abbreviated `:<line>`).
>
> **Status legend:** `OWED` = built + verified this pass · `PRE` = pre-existing shared component/chrome,
> correct (code cite or screenshot, else `UNVERIFIED`) · `EXPECTED(…)` = later-milestone/blocked
> substrate, not built · `ASSUMPTION(OQ-xxx)` = a recorded interim the owner may re-rule · `GAP` =
> declared divergence from the board.

---

## Route + data model (the NAVIGATE target)

- **Route:** `app/game/[id].tsx`, `id` = **`gameId`** (the canonical game identity, CARD-07's universal
  handle; matches the eventual `GET /catalog/games/:id`). Rendered as a root-level Stack screen (like
  `add-game.tsx`) inside the persistent `DeviceShell`; NavBand stays with **COLLECTION active** (§0.11).
- **Entry resolution:** `GET /me/collection` is unpaginated (decision 0058 §5) and already loaded — the
  screen finds the entry by `gameId` client-side. For an owned game the entry supplies title · developer
  · publisher · releaseYear · genres · hours · percentComplete · status · ownedSince · rating · notes ·
  nowPlaying · card. **Not-owned (no entry)** = board M6 neutral → `EXPECTED(M6)`.
- **CARD-23 NAVIGATE realization (closes the M3 S4-g deferral):** Collection list-row chevron `›` + the
  card tap → `router.push('/game/'+gameId)`. Minimal Collection wiring only (the navigate handle); no
  other Collection changes.

---

## Shared chrome (every state — the DeviceShell frame, board `:40–64`, `:508–514`)

`DeviceShell` + `NavBand` + `NavKeycap` render one layer up (root `_layout`), COLLECTION the active tab
(pressed keycap + pink `PipLight`). Not re-verified except where the game page mounts inside it.

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| C1 | Device frame + screws + top-band (POWER/logo/grille) | DeviceShell | teal | wraps screen | INGAME | PRE (`:40–64`) |
| C2 | Nav band (5 keycaps, COLLECTION active) | NavBand·NavKeycap | active=pressed+PipLight | below screen | STORE·DISCOVER·COLLECTION·PROFILE·FRIENDS | PRE (`:508–514`) |
| C3 | ScreenHead "GAME" (display 21) + `▸ NOW PLAYING` now-tag (accent) when this game is the pin + `⋯` overflow keycap | `ScreenHead` + now-tag + `ovf-key` | display 21 / micro 9 | head | "GAME" · "▸ NOW PLAYING" | OWED (`:460`) — now-tag conditional on `entry.nowPlaying` |
| C4 | Return-link "‹ RETURN TO COLLECTION" (accent) | `TertiaryLink` back | body 11, accent | scroll top | "‹ RETURN TO COLLECTION" | OWED (`:462`) — `router.back()`/`/collection` |
| C5 | Bottom section dock — PLAY · CARDS · ABOUT (icon+label; accent border + on-state on active; NOT a pressed keycap) | `SectionSwitch` (tabdock) | 3-up, scr.tools bed | above nav band | PLAY·CARDS·ABOUT | OWED (`:499–505`) — ABOUT tab present but its panel = `EXPECTED(M5)` |

> **Screen palette:** build to the app theme `theme.scr.*` (Midnight `#14121f`), NOT the board's local
> `--scr-bg #232045`. Every M2/M3 screen uses `theme.scr.*`; one screen palette across the app. The
> board's lighter indigo is a board-local variance — a 🎨 token note, not a build target (verified on
> the live sign-in/collection frame, 2026-07-05).

---

## State: PLAY — board-state M1 (the owned card + stats readout) (board `:452–523`)

Default tab. Dual-face hero (your FACE + the standardized stats BACK, no flip) over the catalog facts +
the YOUR PLAY dossier readout + an action row; the section dock sits at the bottom.

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| 1 | Hero title (game name) | Text | display 21 | scroll, centered | e.g. "Elden Ring" | OWED (`:463`) — from `entry.title` |
| 2 | Facts line (dev · year · genre) | Text | micro 9, dim | under title | "FROMSOFTWARE · 2022 · SOULSLIKE" | OWED (`:464`) — from `entry` (NOT `/catalog/games/:id`, EXPECTED) |
| 3 | Dual-face hero — FACE (left) + label "THE FACE" | `DualFaceHero` → `GameCard` face (fluid 63:88) | 2-up | hero row | — | OWED (`:465–469`); the **composed CARD-15 custom face → `EXPECTED`** (renders the CARD-18 default placeholder, decision 0058 §6) |
| 4 | Dual-face hero — STATS BACK (right, `.flipy`) + label "YOUR STATS" (accent) | `StatsBack` (CARD-01) | 2-up | hero row | HOURS·COMPLETE·STATUS·SINCE + "CARD ARTIST" | OWED (`:470–484`) — composed client-side from `entry`; CARD ARTIST = "DEFAULT" for the CARD-18 stub (real designer arrives with card_designs). Name rendered gold per the board `.cb-prov .p-name` (card-content provenance, not chrome — burt/owner call) |
| 5 | Hero tap → enlarge `CardDetail` (CARD-23 INSPECT) | tap handle | — | on hero | — | OWED (`:519` caption; CARD-23/0048) — see CardDetail state |
| 6 | "YOUR PLAY" section head | `ScreenHead`/sec | micro 9, dim | below hero | "YOUR PLAY" | OWED (`:486`) |
| 7 | Dossier readout — PLATFORMS | `PlayDossier` row | — | dossier | "PC · PS" | **EXPECTED(COL-04 · decision 0058 §7 — no `platformIds` substrate)** (`:488`) — row omitted/deferred, not fabricated |
| 8 | Dossier readout — RATING (stars) | `PlayDossier` row + stars | — | dossier | "PENDING (OQ-058)" | OWED as **PENDING** display (`:489`) — `entry.rating` exists but the board marks it PENDING(OQ-058); render greyed/non-interactive |
| 9 | Dossier readout — NOTES | `PlayDossier` notes row + pen glyph | body 11 | dossier | the note text | **EXPECTED(OQ-134 — `CollectionItem` response omits `notes`)** (`:490`) — unreadable at M4; shown as "—/add a note", not fabricated |
| 10 | Action row — EDIT STATS | `ScreenButton` primary mini + edit icon | mini | below dossier | "EDIT STATS" | OWED (`:493`) — flips PLAY→EDIT |
| 11 | Action row — SWITCH CARD | `ScreenButton` cream mini + switch icon | mini | action row | "SWITCH CARD" | OWED (`:494`) — jumps to the CARDS tab |
| 12 | Action row — SHARE | `ScreenButton` cream mini + share icon | mini | action row | "SHARE" | **EXPECTED(CARD-21 · M5 · `/cards/:id/share-image`)** (`:495`) — present-but-disabled or omitted; the flattened share is M5 |
| 13 | Set-now-playing affordance (WTP-03) when this game is NOT the pin | `ScreenButton`/action + `PUT /me/now-playing` | mini | header/action | "SET NOW PLAYING" | OWED (WTP-03) — the board draws only the *pinned* PLAY (now-tag shown); the unpinned set-action realizes the M3-deferred S5-b |

## State: EDIT-STATS — board-state M2 (the readout becomes a form) (board `:525–597`)

EDIT STATS flips the YOUR PLAY readout into a field form (edited in a form, NOT on the card); the stats
back updates live; a pinned save bar (DONE / CANCEL) seats above the section dock.

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| 1 | Dual-face hero stays above; stats back reflects edits live (HOURS→211) + "↻ UPDATES LIVE" label (accent) | `DualFaceHero`/`StatsBack` | 2-up | hero | "↻ UPDATES LIVE" | OWED (`:536–556`) — back recomputes from the in-progress form |
| 2 | "EDIT YOUR PLAY — THE FORM" section head | sec | micro 9 | below hero | "EDIT YOUR PLAY — THE FORM" | OWED (`:557`) |
| 3 | HOURS field (editing state) | `PlayDossier` field (`field-inline` + caret) | title 15 | form | numeric | OWED (`:559`) — `PATCH hours` |
| 4 | COMPLETE % field | field-inline + `%` | title 15 | form | "68%" | OWED (`:560`) — `PATCH percentComplete` |
| 5 | STATUS chips (stacked, wrap) — **5 chips; WISHLIST excluded** | `GenreTag` row | selected=accent | form | PLAYING·BACKLOG·BEATEN·COMPLETED·DROPPED | OWED (`:561`) — `PATCH status`; the owned editor offers **`OWNED_STATUSES`** = the storage enum (0058 §4) **minus `wishlist`** (the unowned/WTP-02 state — an owned entry is never settable to it) per **OQ-070 · decision 0025**; the board M2 draws 5 chips |
| 6 | PLATFORMS chips (PC·PS·XB) | chip row | selected=accent | form | PC·PS·XB | **EXPECTED(COL-04 · decision 0058 §7)** (`:562`) — no `platformIds` substrate |
| 7 | OWNED SINCE field | field-inline | title 15 | form | "SEP 2014" | OWED (`:563`) — `PATCH ownedSince` |
| 8 | RATING (stars) | stars, dimmed | — | form | "PENDING (OQ-058)" | OWED as PENDING display (`:564`) — non-interactive |
| 9 | NOTES field (multiline) | `TextField` area / `note-field` | body 11 | form | the note | OWED **write-only** (`:565`) — `PATCH notes` works; **no pre-fill** (OQ-134 — response omits `notes`), starts blank |
| 10 | Edit bar — DONE EDITING (block) + CANCEL | `edit-bar` (`ScreenButton` block + cream) | — | above dock | "✓ DONE EDITING" · "CANCEL" | OWED (`:569–572`) — DONE writes the entry (`PATCH /me/collection/:entryId`), CANCEL discards |
| 11 | COL-01 remove-from-collection (destructive) | `ScreenButton` danger → `ConfirmSheet` (0040) | — | edit/overflow | "REMOVE FROM COLLECTION" | OWED (COL-01 · `DELETE /me/collection/:entryId` · decision 0040 ConfirmSheet) — the board routes remove via the `⋯` overflow (`:460`); realized here |

## State: CARDS switcher — board-state M3 (your cards for this game, OQ-056/CARD-24) (board `:599–659`)

The CARDS tab leads with your cards for this game (COL-06), each state-tagged, tap-to-select with inline
options; scrolls into the community link. **Substrate-limited (OQ-133):** with no `card_designs` feed,
the grid renders the **one CARD-18 default card** (client-derived from `entry.card`, EQUIPPED) + the
**DESIGN NEW** tile. The multi-card behaviors are structure-present, behavior-`EXPECTED`.

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| 1 | "YOUR CARDS FOR <GAME> — N" section head + SORT | sec + `TertiaryLink` | micro 9 | scroll | "YOUR CARDS FOR ELDEN RING — 1" | OWED (`:610`) — N from the client-derived list (1 default at M4); SORT inert while N=1 |
| 2 | Switcher grid — the cards (3-up `/cell`) with state-tags | `CardSwitcher` → `GameCard/cell` + `state-tag` | 3-col grid | scroll | tags: EQUIPPED·PUBLISHED·PRIVATE·DRAFT·ADOPTED | OWED **structure**; renders **1 EQUIPPED default card** — multi-card roster + PUBLISHED/PRIVATE/DRAFT/ADOPTED tags **EXPECTED(card-pipeline · Styler §3.2)** (`:611–616`) |
| 3 | DESIGN NEW tile (gold dashed, card-creating F-02) | `newtile` | grid cell | grid | "＋ DESIGN NEW" | OWED (`:617`) — navigates toward the Styler route; **Styler screen `EXPECTED(§3.2)`** (interim: routes to a not-yet-built target / disabled-with-note) |
| 4 | Tap-select ring (orange stepped moat) on the selected card | `CardSwitcher` sel | accent stepped ring | on card | — | OWED (`:614`, `:207–209`) — CARD-23 ACT-IN-PLACE (plain tap selects, no navigate) |
| 5 | Inline card-opts panel — title + EquipReadout (CARD-22) | `card-opts` + `equip` chips | — | under grid | "Your <state> <game> card" · FRAME·FX·PLATE | OWED **structure** (`:619–621`); the EquipReadout values come from the card's closed attributes — for the default card these are the default's (or "—") |
| 6 | card-opts — SET AS MAIN (equip, CARD-07/COL-06) | `ScreenButton` cream mini + equip icon | mini | co-acts | "SET AS MAIN" | **EXPECTED(`activeCardDesignId` · decision 0058 §7 / Styler §3.2)** (`:623`) — no equip substrate; the lone default is already MAIN |
| 7 | card-opts — EDIT IN STYLER | `ScreenButton` cream mini + edit icon | mini | co-acts | "EDIT IN STYLER" | OWED **affordance**; target **Styler `EXPECTED(§3.2)`** (`:624`) |
| 8 | card-opts — DELETE (destructive → ConfirmSheet, 0040/OQ-061; MAIN can't be deleted) | `ScreenButton` danger mini → `ConfirmSheet` | mini | co-acts | "DELETE" | **EXPECTED(`/cards/:id` · decision 0058 §7 / 0040)** (`:625`) — no card-delete substrate; the default/equipped card is non-deletable anyway |
| 9 | "BROWSE THE COMMUNITY — N" section + link row | sec + `lrow` | — | scroll | "COMMUNITY CARDS · N faces" | **EXPECTED(M5 · community gallery, decision 0062)** (`:629–630`) — the link + the whole gallery→adopt (board-state M4) are M5 |

## State: CardDetail INSPECT — the hero enlarge (CARD-23 mode 3, own card) (board `:519` caption · sheet grammar `:689–706`)

Tapping the PLAY hero enlarges the card into the one bottom-sheet drawer grammar: card large + designer
credit + the `EquipReadout` (CARD-22); for **your** card the actions are share/edit (a friend's M7 →
adopt). The board draws the sheet for a *community* card (adopt); the owned variant reuses the structure.

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| 1 | Scrim + bottom sheet + grab handle | `CardDetailSheet` (`PulledSheet`) | overlay | over screen | — | OWED (`:688–690`) |
| 2 | Sheet head — "YOUR CARD — <game>" + ✕ close | sh-h | micro 9 | sheet top | "YOUR ELDEN RING CARD" | OWED (`:691`) — owned variant copy (board shows "COMMUNITY CARD — RIKO'S…") |
| 3 | Enlarged card (`pick` 138×193) | `GameCard/pick` face | 138×193 | sheet | — | OWED (`:692–694`) — default face placeholder (composed face `EXPECTED`) |
| 4 | Designer credit line (CARD ARTIST) | credit-line | micro 9 | under card | "DESIGNED BY <artist>" | OWED (`:695`) — default card → "—"/omit (no designer); adoption count `EXPECTED(M5·CARD-05)` |
| 5 | EquipReadout (CARD-22) — FRAME·FX·FIN·PLATE·NAMEPLATE·FONT | `equip` chips | — | sheet | closed attributes | OWED **structure** (`:696–698`) — default values (or "—") |
| 6 | Actions — SHARE / EDIT (own card) | `ScreenButton` row | — | sheet foot | "SHARE" · "EDIT" | SHARE **EXPECTED(CARD-21·M5)**; EDIT **affordance OWED**, Styler target `EXPECTED(§3.2)` (`:519` caption) |
| — | Adopt bar (community card) | `adoptbar` | — | — | "ADOPT · 1 PX" | **EXPECTED(M5 · board-state M4 · ECON-03/04)** (`:699–704`) — not the owned variant |

## State: L1 — Loading skeleton (board `:1013–1062`)

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| 1 | Skeleton — title bar + facts bar + dual `sk-mini` pair + dossier rows (solid `scr.panel` fills, stepped, never dashed); ScreenHead + section dock stay put | `game/Skeleton` (`sk-bar`/`sk-mini`) | — | body | — | OWED (`:1024–1036`) — solid fills in the exact PLAY shapes; no reflow when data lands |

## State: L2 — Load error "SIGNAL LOST" + RETRY (board `:1064–1108`)

| # | Element | Component | Variant/size | Docks | Copy | Status |
|---|---------|-----------|--------------|-------|------|--------|
| 1 | Error card (dashed stepped silhouette + accent "!") | `LoadError` card | — | body | "!" | OWED (`:1076`) |
| 2 | Eyebrow · title · sub | Text | micro/title/body | body | "COULDN'T LOAD THIS GAME" · "SIGNAL LOST" · sub | OWED (`:1077–1079`) |
| 3 | RETRY (orange) + GO BACK (dim) | `ScreenButton` primary + `TertiaryLink` | — | body | "RETRY" · "‹ GO BACK" | OWED (`:1080–1081`) — retryable fetch failure only; offline is L3 |

## State: L3 — Offline, browse from cache, writes gated (SYS-10) (board `:1110–1185`)

**EXPECTED(SYS-10) — not built at M4.** The app has **no offline-detection / cache infra** today: the M3
Collection explicitly deferred offline (`m3r/collection-manifest.md` "Offline … EXPECTED(later · SYS-10)").
Building L3 would need a new NetInfo/`navigator.onLine` signal + redux-persist read-through + a write-gate
+ the offline Toast — a shared SYS-10 pass, not a per-screen build. Listed so it's tracked, not built here.

| # | Element | Component | Status |
|---|---------|-----------|--------|
| 1 | OfflineStrip + cache render + gated writes + offline Toast | `OfflineStrip`/`Toast` | **EXPECTED(SYS-10 · no offline infra yet)** (`:1110–1185`) |

---

## State-table walks (binding rule (b) — every changed state predicate)

1. **Section tab (`section ∈ {play, cards, about}`)** — default `play`. PLAY renders the hero+dossier+actions;
   CARDS renders the switcher; ABOUT → `EXPECTED(M5)` placeholder ("catalog facts arrive in M5"). Tapping a
   dock card sets `section`; the active card gets the accent border + on-state (NOT a pressed keycap). The
   dock + ScreenHead are fixed; only the scroll body swaps (no NavBand change — still COLLECTION).
2. **PLAY ↔ EDIT (`editing: boolean`)** — `editing=false` shows the YOUR PLAY readout + action row; EDIT STATS
   sets `editing=true` → the dossier rows become fields, the action row is replaced by the pinned edit-bar,
   the stats back recomputes live from the draft. DONE `PATCH`es + `editing=false` (+ refetch/invalidate
   Collection); CANCEL discards the draft + `editing=false`. Guard: an empty required field blocks DONE
   (reference-good save-guard, mirrors log-hours).
3. **Card select (`selectedCardId`)** — CARDS tab; a plain tap sets `selectedCardId` (CARD-23 ACT-IN-PLACE,
   no navigate) → the orange ring + the inline card-opts for that card. At M4 there is exactly one selectable
   card (the default), selected by default; the panel shows its EquipReadout + the (mostly EXPECTED) actions.
4. **CardDetail sheet (`inspectOpen: boolean`)** — tapping the PLAY hero (CARD-23 INSPECT) sets
   `inspectOpen=true` → scrim + `PulledSheet` with the enlarged card; ✕/scrim/back closes. Inert underneath
   (the page doesn't scroll while open).
5. **ConfirmSheet (`confirm: {kind} | null`)** — DELETE (card) / REMOVE (collection) set `confirm` → the 0040
   destructive `ConfirmSheet` (cancel default, destructive action explicit). At M4 only REMOVE
   (`DELETE /me/collection/:entryId`) actually fires; card-DELETE is `EXPECTED` (no substrate) so its button
   is disabled/absent.
6. **Now-playing (`entry.nowPlaying`)** — true → the ScreenHead `▸ NOW PLAYING` tag shows; false → the SET
   NOW PLAYING action shows. Toggling `PUT /me/now-playing {gameId}` (or `{null}` to unpin) + invalidates
   Collection. WTP-03 = a single pin distinct from the `playing` status (decision 0011/OQ-003).
7. **Lifecycle (`isLoading | isError | offline`)** — `isLoading` → L1 skeleton; `isError` (fetch fail) → L2
   SIGNAL LOST + RETRY; `offline` → L3 (cache render + gated writes + write-attempt Toast). Mutually exclusive;
   the ScreenHead + dock persist through L1 so nothing reflows.

---

## Later-milestone states — listed, EXPECTED, NOT built (parvati: do not flag)

| State | Board | Owned by | Mark |
|-------|-------|----------|------|
| Board-state **M4** — CARDS community gallery → `CardDetail` → atomic ADOPT | `:667–728` | M5 (ECON-03/04, decision 0062 §2) | EXPECTED(M5 · community/adopt) |
| Board-state **M5** — ABOUT (catalog facts · PresenceStats CAT-09 · friends-who-own) | `:730–789` | M5 | EXPECTED(M5 · `GET /catalog/games/:id`, CAT-09) |
| Board-state **M6** — Neutral / not-owned (ABOUT default, PLAY locked) | `:793–855` | M6 | EXPECTED(M6 · not-owned) |
| Board-state **M7** — Friend-view (their dual-face, privacy-gated + compare) | `:856–943` | M7 | EXPECTED(M7 · SOC-11, PROF-03) |
| Board-state **M8** — Upcoming → NOTIFY + be-first | `:944–1008` | M8 | EXPECTED(M8 · upcoming/notify) |
| **L4** — Soft-hidden / reported / moderation-pulled (MOD-02/08/09) | `:1193–1250` | M6/M7 | EXPECTED(M6/M7 · MOD-02/08/09) |
| Composed CARD-15 custom card FACE (frame/fx/finish real render) | throughout | card-pipeline (real `card_designs`) | EXPECTED — renders CARD-18 default (decision 0058 §6) |

---

## Component reuse (compose from the map only — §2 build rule)

- **New game components** (map §9 names): `DualFaceHero` · `PlayStats`→built as `PlayDossier` (the readout/
  form; `PlayStats` in the map = the dossier) · `CardSwitcher` · `CardDetail`→`CardDetailSheet`. Plus the
  CARD-01 `StatsBack` (the standardized stats layout — a client-composed face, not a §1.5 catalog entity),
  the `GameTabDock` (a `SectionSwitch` styling), and `ConfirmSheet` (the decision-0040 destructive confirm —
  **if not already a shared component, built here from `PulledSheet` + `ScreenButton/danger`**; it is owed
  app-wide: card delete, collection remove, SOC block/unfriend).
- **Reused** (existing): `GameCard` (face `cell`/`pick`/fluid), `ScreenButton` (primary/cream/danger/add/
  mini), `ScreenHead`, `PulledSheet` (sheets), `SectionSwitch`, `StateMark` (select ring kin), `TextField`
  (notes), `GenreTag`/chips (status/platforms), `TertiaryLink` (return/links), the OQ-127 `steppedPath`
  helper (card + tags). No bespoke near-dupes.
- **RTK Query:** no new endpoints for the M4 scope — `useGetCollectionQuery`, `useUpdateEntryMutation`,
  `useRemoveEntryMutation`, `useSetNowPlayingMutation` already exist. The switcher's card list is derived
  client-side from `entry.card` (no `getCardsForGame` hook until the `card_designs` substrate lands).

---

## Declared assumptions / divergences (parvati reads these as reconciled)

- **ASSUMPTION(OQ-133):** the CARDS switcher renders the one default card + DESIGN-NEW; SET-AS-MAIN / DELETE /
  EDIT-IN-STYLER / multi-card roster / community gallery are `EXPECTED` pending the card-pipeline (Styler §3.2 /
  M5). Owner may re-rule to build the `card_designs` backend at §3.1 (the first-article stop is the place).
- **ASSUMPTION(catalog facts from the entry):** owned states source title/dev/year/genre from the collection
  entry, since `GET /catalog/games/:id` is unbuilt; identical fields, so no visible divergence.
- **GAP(PLATFORMS):** the PLATFORMS row (PLAY readout + EDIT chips) is omitted — no `platformIds` substrate
  (decision 0058 §7). Not fabricated. Lands with COL-04.
- **Screen palette:** `theme.scr.*` Midnight, not the board's `--scr-bg #232045` (see chrome note). 🎨-level.

---

## ADDENDUM — the OQ-133 substrate LANDED (2026-07-05, decision 0066; commits `926c36f`/`55a0386`/`e9138ce`)

The SUBSTRATE-REALITY banner above is now HISTORY, kept for the record. Status flips vs the tables:
- **CARDS row 2 (switcher grid): LIVE multi-card** — the real `GET /me/collection/:entryId/cards` feed;
  the DEFAULT face rides the roster as the CARD-18 un-equip target; state tags real (EQUIPPED/DRAFT/
  PRIVATE); custom faces render LIVE via `CardFace` (0066 §2).
- **CARDS rows 3/6/7/8: LIVE** — DESIGN NEW → `/styler/:gameId`; SET AS MAIN = the COL-06 equip PATCH
  (drafts + already-equipped disabled); EDIT IN STYLER → `/styler/:gameId?cardId=`; DELETE = the 0040
  `ConfirmSheet` → `DELETE /cards/:id` (equipped disabled client-side + 409 CARD_EQUIPPED server-side).
- **PLAY row 3 + CardDetail rows 3/6: LIVE** — the hero/detail render the equipped composition
  (skia; web via the lazy CanvasKit gate); CardDetail EDIT resumes the design in the Styler. The
  EquipReadout derives real labels from the composition. SHARE stays EXPECTED(CARD-21·M5).
- **PLAY row 9 (NOTES readback) + EDIT row 8 (RATING): OQ-134 resolved server-side** (notes/rating on
  the item, api 0.53) — the dossier readout upgrade is a small client follow-up on this page.
- CARDS row 9 (community gallery) unchanged — **EXPECTED(M5)**.

## Browser BOOT check (binding rule (c) — mandatory)

Route `/game/:gameId` must be reached via a real login (web pipeline now unblocked, 2026-07-05) and a
Collection card/chevron tap (CARD-23 NAVIGATE) — verify it MOUNTS without a hook-placement / early-return
crash (the class of bug static + screenshot lanes miss), then exercise PLAY · EDIT · CARDS · CardDetail ·
the tab dock, and confirm the NavBand stays COLLECTION-active throughout. parvati captures her own
390×844 web screenshots per state.

## GATE-5 AMENDMENTS (owner rulings, 2026-07-06 — `gate5-notes.md` is the ledger; these override the rows above)
- **EDIT-STATS is retired as a form state:** every stat (hours · completion · status · owned-since ·
  notes, + the deferred platforms/rating rows) displays under YOUR PLAY and edits INDIVIDUALLY in
  place (per-field PATCH; a status chip saves on tap; no layout shift of sibling rows). The pinned
  DONE/CANCEL bar and the EDIT STATS action are gone (B.8).
- **The blank default face is IMPLICIT (C.10):** never a switcher tile, never counted in "YOUR CARDS
  — N"; zero designs → the design-nudge empty state. UNEQUIP on the worn card (options row) returns
  to it; DELETE of the worn card stays refused until unequipped. The equipped marker is the orange
  ◆ glyph chip beside the status tag, not a word (C.11).
- **The dual-face hero renders at /grid 161×225** (one size up, B.5); title · facts · hero group
  tight. CardDetail: sheet titled CARD DETAIL, card at 189×264, credit reads YOUR DESIGN (C.14).
- **The card-delete 0040 confirm mounts at the PAGE root** (in-app bottom dock, D.27).
- Every card face app-wide is display-only (`pointerEvents`) inside a full-card Pressable; Shelf /
  Grid / Top faces navigate (A.3/C.12); the skia renderer preloads behind the shell (A.1).
