# Game page (4.2) — design-track kickoff (the editor-arc keystone)

The **adaptive Game page** — the shared catalog hub that adapts to how you arrived (neutral · owned ·
friend-view), hosts the **card-object/flip**, the **community gallery + adopt**, and the **card
switcher** (the OQ-056 "customizations" view), and is the screen the Styler/Canvas **launch from and
return to**. Owner-initiated 2026-06-13 ("start drafting Game page"); 3 distinct treatments → owner
gate in this session → converge. Design-side only — §4.2 behavior is already specified; flag, don't edit.

## Read first (done — grounding)
- `ui-design-requirements.md` §4.2 (the adaptive states · shared vs owned vs friend-view · the flip
  lives here · viewing never edits art) + §1.1 art-direction split.
- `product-spec.md` §5.6 **CARD-01** (the card front/back: back = auto-stats + provenance, designer +
  adoption count) · **CARD-22** (the **equipped readout** — base · effect(+intensity) · finish · frame ·
  nameplate · font — display metadata, NOT the composition; CARD-15 still flattens to one image) ·
  CARD-04/07/18/21 · COL-03/06 (selected card + switcher) · ECON-03/04 (adopt: free / 1 PX) ·
  **SOC-11** (friend-view detail + **opt-in** compare + **atomic adopt** — no "adopt just the canvas") ·
  CAT-02/05/09 (contributor credit · presence stats) · WTP-02/03 · MOD-01.
- `decisions/0014` — the junction component **doubles as the Game-page card switcher (COL-06) —
  designed once**; the Styler receives *(game, optional preselected base)* from here.
- `open-questions.md` **OQ-056** — the customizations view = the Game-page card switcher (per-game:
  my cards + adopted/downloaded + design-new → Styler) + the global My Designs shelf (`/me/cards`);
  the card stays the atomic save/equip/publish/adopt unit; SAVE AS NEW + reusable style presets are
  the editor's, not this page's.
- `api-contract.md`: `GET /catalog/games/:id` (shared page source) · `GET /me/collection/:entryId`
  (owned inline-edit fields) · `GET /me/collection/:entryId/cards` (the switcher: mine + adopted +
  create-link) · `GET /games/:gameId/cards` (the gallery; every card carries the **CARD-22 `equipped`**
  readout) · `POST /cards/:id/adopt` · `GET /users/:id/collection` (friend-view + SOC-11 detail).
- Sibling boards for grammar: `collection-states.html` (device shell + the shelf/stat grammar + the
  card-flip if any) · `add-game-states.html` (the `CardFan`, `CardDetail`, `EquipReadout`, the report
  drawer) · `styler-states.html` / `canvas-states.html` (the editor entry/return seams; the GameCard
  size ladder) · `store-states.html` (the adopt PriceChip + `ic-pix`).

## The three models (genuinely distinct ORGANIZATION; §4.2 behavior is fixed)
The page is dense (a shared page + your owned-state + a friend-view + a gallery + a switcher). The
divergence is *how you organize that*:
- **A "Card-led scroll"** — the **card object is the hero** (tap-flips front↔back); one prioritized
  vertical scroll of all modules beneath it; the **adaptive state changes the band right under the
  card** (owned → your inline-edit stats; friend → their readout + ADOPT; neutral → ADD TO
  COLLECTION). Card-centric, everything-visible — the InGame-native pole. `game-page-draft-a-cardled.html`
- **B "Tabbed dossier"** — a top **section switcher** (a chip-row; aligns with the forthcoming
  `SegmentedKeycap` — flag it, don't depend on its ruling) chunks the density into **PLAY** (your
  card + stats + edit) · **CARDS** (gallery + switcher + design-new) · **ABOUT** (canonical facts +
  presence + friends-who-own + suggest-edit/report). The conventional-legible pole; the state sets
  the default tab. `game-page-draft-b-dossier.html`
- **C "Pinned card + drawer depth"** — the **card stays pinned** at the top with its primary action
  always present (equip/edit · adopt · add); the body is a lean summary; the **heavy content** (the
  full community gallery · the switcher · friends-who-own · the flip-back provenance) opens as
  **bottom-sheet drawers** (the app's one drawer grammar). Card always in view, depth on demand — the
  sheet-family pole. `game-page-draft-c-pinned.html`

## Locked component names (FORM is each draft's; names fixed)
`CardHero` (the flippable card-object: front = art+title, back = auto-stats + provenance) · `PlayStats`
(the owned-state inline-edit block: hours/%/status/owned-since/rating/notes) · `CardSwitcher` (the
customizations gallery — my cards + adopted, COL-06/OQ-056) · `CommunityGallery` (the adopt gallery) ·
`EquipReadout` (CARD-22 — reuse the Add Game form) · `FriendContext` (SOC-11) · `CompareStrip` (opt-in
compare) · `PresenceStats` (CAT-09 in-N-collections · friends-have-it). Reuse from the catalog:
`GameCard` (all sizes), the **sheet/drawer** family, `StatTile`, `PriceChip`/adopt chip, `ReportSheet`,
the nav band + device shell. A genuinely needed extra: build it, flag at the gate.

## Panel contract (each draft renders P1–P7; the rest deferred WITH a caption note)
P1 **Neutral (not-owned)** — the shared catalog page (facts + contributor credit + `PresenceStats` +
`CommunityGallery` + ADD TO COLLECTION / Up Next + design-a-card) — THE model thesis · P2 **Owned
state** — `CardHero` + `PlayStats` inline-edit + Now Playing + share + the switcher entry ·
P3 **The card flip** — front (art+title) ↔ back (auto-stats + provenance: designer + adoption count,
CARD-01) · P4 **The card switcher / customizations view** (OQ-056 + COL-06) — your cards for this game
(draft · private · published · **adopted** · equipped states) + DESIGN NEW (→ Styler) + the SAVE-AS-NEW
note + adopted/downloaded cards · P5 **`CommunityGallery` + adopt** — community cards, each with its
`EquipReadout` (CARD-22) + designer credit + adoption count + ADOPT (free / 1 PX) · P6 **Friend-view**
(SOC-11) — their card + `EquipReadout` + `FriendContext` (hours/status/owned-since, privacy-gated) +
ADOPT (atomic) + the opt-in **COMPARE** affordance + the **don't-own-it** variant · P7 **Upcoming →
NOTIFY ME** (DISC-01/NOTIF-01) + **no-cards-yet (be-first)** — the cold-start/upcoming states.
Deferred to converge: soft-hidden/reported (MOD-02/08/09) · loading skeleton · offline.

## Hard rules (the law — carried from prior tracks)
- Compose from the §1.5 catalog + the locked names; tokens verbatim (Teal shell + Midnight); standalone
  HTML; Google Fonts via the `media="print" onload` pattern; built-in SVG; `ic-pix` from
  `store-states.html` for PX. Sample data: **Destiny (210 hrs)** the working game (the gilt · ember 70% ·
  holo · ribbon card); **Maverick = self · Riko / Vanta = friends**; adoption/presence numbers
  caption-marked illustrative (OQ-002/011).
- **HTML only — no PNG artifacts.** Verify each draft via headless Edge, read it, walk every panel,
  iterate — then **DELETE every screenshot before the turn ends**.
- Behavior questions → APPEND one-liners to `open-questions.md` (the only shared doc). Do **not** edit
  product-spec / api-contract / design-spec / catalog / other tracks' files / SCREEN-STATUS rows other
  than **4.2**. `git pull --rebase` before EVERY push (parallel sessions are live).

## Process
1. This brief → commit (`docs: game-page track brief`) → push; SCREEN-STATUS 4.2 → in-pass.
2. Per draft: verify headless (delete shots) · append a README row · commit (`design: Game page
   draft A (<model>) — P1-P7 (game-page track)` + Co-Authored-By) · `git pull --rebase` · push.
3. **Owner gate in THIS session:** model summaries + judgment calls (esp. how the adaptive states +
   the card switcher/OQ-056 read) — the owner opens the HTML directly; no gate PNGs. Append the
   ruling verbatim+dated here.
4. Converge per the ruling → `game-page/game-page-states.html` (full matrix incl. the deferred
   states) → SCREEN-STATUS (row + UP NEXT) → STOP. Behavior finds → the inbox.

## Gate ruling (owner, 2026-06-13)
**A "Card-led scroll" wins** — *"moving forward with A definitely going to have some changes though."*
B "Tabbed dossier" + C "Pinned card + drawer depth" retired (kept for history). Owner change requests
applied to `game-page-draft-a-cardled.html` (**rev 4**):
1. **Add an owned-landing panel** — what you see the instant you tap an owned game in your collection
   (the resting state, drawer closed): card hero + the collapsed `YOUR PLAY` peek + the `CardSwitcher`
   rail. → new **P2** (the prior owned/stats panel becomes **P2b**, the drawer open).
2. **The ⋮ overflow opens a drawer** (was a dropdown menu) — bottom-sheet `GAME OPTIONS` (suggest edit ·
   share · report). Shown in P2's fragment.
3. **COMPARE opens a drawer** (was inline) — the `CompareStrip` rises as a bottom-sheet over the dimmed
   friend page (P6). Mirrors C's treatment; same opt-in (SOC-11) + privacy gate (PROF-03).
Net: every heavy surface on the page now shares the one bottom-sheet grammar. **Next:** any further A
tweaks from the owner, then converge → `game-page-states.html` (+ the deferred lifecycle states:
soft-hidden/reported · loading · offline).

## Re-brainstorm (owner, 2026-06-14) — "card as trophy"
The owner paused the rev-4 line and asked to **go back to brainstorming** the best mobile UI/UX for
showing *all* the §4.2 information, from first principles (not bound to A/B/C or the A×B mix), on the
existing design system. Used the **brainstorming skill**. Outcome:
- **Priority ruling:** on the owned state (the richest/most-visited), the page's primary job is the
  **card as a trophy** — the equipped card is the unquestioned star; every other piece of the inventory
  gets a calm, clearly-subordinate home. (The earlier "incoherence" was diagnosed as too many elements
  sharing equal weight.)
- **3 fresh takes** built → `game-page-trophy-takes.html` (owner: *"draft all three"*), each a distinct
  interaction model for the same trophy, owned-state shown (neutral/friend-view reuse each spine):
  - **A "Collapsing Trophy"** *(my recommendation)* — card opens large + alive, then **collapses into a
    slim sticky header** as you scroll; tap=flip · swipe=riffle your cards · long-press=peek; calm
    prioritized sections below (Your Play · Your Cards+delete · Community · Friends/About). The proven
    iOS large-title / Wallet pattern; the most direct cure for the incoherence.
  - **B "Card in Hand"** — near full-bleed gesture-operated card; all info in one pull-up dossier sheet
    with the bottom `SegmentedKeycap`. Most tactile; leans on gesture discoverability.
  - **C "Trophy Dashboard"** — card at the heart of a glanceable module-tile board, each tapping out to
    a sheet. Most at-a-glance; highest discipline to stay uncluttered.
- All three use the design system verbatim (GameCard · SegmentedKeycap · sheet grammar · KeycapButton ·
  C5) and include the **delete** affordance (trash · equipped-locked · destructive `ConfirmSheet`, OQ-061).
- **Owner picked A** (Collapsing Trophy) and asked for a **high-fidelity** build enforcing all conventions
  → `game-page-trophy-collapsing.html` (2026-06-14). Owner notes applied: the **"your card" tag removed**;
  the **full owned field set** incl. **platforms** + **date acquired** (`ownedSince`) — the few I'd missed;
  **Your Cards** larger + **unobstructed** (state reads *below* the card; the MAIN card carries the F-09
  selection — accent outline + pink `ChipPip`; no overlay on the art, F-01) with a **hold → options
  drawer** (SET AS MAIN · EDIT · DUPLICATE · SHARE · DELETE→`ConfirmSheet`); **Community = one link** when
  owned vs a **listed gallery** when not. Convention corrections enforced: **`KeycapButton/primary` = orange
  `scr.accent`** (gold+2/4-step reserved for card-creating ADD/DESIGN, F-02) · `shadow.key` 0 3px 0 · C5
  steps · F-09 flat planes + accent-border selection · F-06 scale. Panels A1 trophy · A2 collapsed+inventory
  · A3 flip · A4 options drawer + delete confirm · A5 full PlayStats editor · A6 neutral (community listed)
  · A7 friend-view (SOC-11). The trophy-takes A/B/C remain for history.
- **Iteration → `game-page-trophy-dualface.html` (owner notes, 2026-06-14):** the **hero now shows both
  sides of the card at once** — the face + the stats back **side-by-side** (no flip), with **EDIT STATS**
  under the stats side · **EDIT enlarges the stats card and the values become fields directly on the back**
  (on-card editing; provenance stays auto) · **game facts as a meta line** · **Your Cards: no hold-drawer** — **tap
  to select** (orange outline + pip) and the options (**SET AS MAIN · EDIT · DELETE**) render **inline on
  the screen**; DELETE still routes to the `ConfirmSheet` · **Share Card Image removed from the per-card
  options** — the **only share spot is a docked footer at the bottom of the screen** (owned only; self-share,
  decision 0019). Panels A1 dual-face hero · A2 on-card stat edit · A3 scrolled (select+inline-options +
  bottom share + delete confirm) · A4 friend dual-face (gated back). Conventions held.
  **Refined (owner, 2026-06-14):** screen title → **"GAME"** (the game name is the hero); **game facts as a
  plain meta line under the game title** (the boxed chips reverted); the **stats card's frame is mirrored on the Y axis** (the C5 step on the
  opposite corners — reads as the card turned over to its back); **EDIT is now inline** (same GAME screen,
  no separate mode) and shows the **stats card as the only card** while editing; **Your Cards selection = a
  thin orange border** (pip dropped).
  **Further (owner, 2026-06-14):** the **collapsed header drops the cosmetic/styler readout** — shows play
  stats only (210 HRS · 68% · PLAYING · SINCE 2014); the **card-back credit is now "CARD ART DESIGNED BY" +
  the account name** (prominent), with the tiny adoption-count + cosmetics line removed. *Flag for converge:*
  this drops the **adoption count** from the card-back (CARD-01 names back-provenance = designer + adoption
  count) — it still shows in the gallery/`AdoptCount`; reconcile the CARD-01 card-back wording at converge.
- **Merge → `game-page-dual-dossier.html` (owner directive, 2026-06-15) — candidate B:** *"merge this draft
  with the dossier draft; move the dossier buttons to the bottom of the screen and use the style from
  `device-switcher-takes.html`; keep the dual card view but edit via a form like in the dossier; capture all
  functionality."* Built: the dossier's **section switcher (PLAY · CARDS · ABOUT)** — *the "dossier buttons"* —
  **docked at the bottom** of the screen as the **`SectionSwitch` Section Rail** (icon-card + label; F-09
  selection = `scr.accent` border + pink `ChipPip`; from `device/device-switcher-takes.html` Take 2). **PLAY
  keeps the dual-face hero**; **stats edited via a dossier form** — EDIT STATS flips the readout to fields
  (`field-inline`/`schip`/`stars`; HOURS·%·STATUS·PLATFORMS·OWNED-SINCE·NOTES), the **stats back updating
  live**, with a **pinned DONE/CANCEL bar** above the dock (so the on-card editing of `trophy-dualface` is
  gone). Buttons corrected to convention (orange `/primary`; **gold = card-creating only**, F-02 — fixing
  draft-B's gold ADD/ADOPT/EDIT). **8 artboards = full functionality:** M1 PLAY · M2 EDIT (form) · M3 CARDS
  switcher (OQ-056) · M4 community gallery → atomic-adopt `CardDetail` sheet + confirm toast · M5 ABOUT (facts
  + `PresenceStats` + friends-who-own) · M6 neutral (PLAY locked) · M7 friend dual-face (privacy-gated +
  compare) · M8 upcoming/be-first. Carries OQ-058 (rating) · OQ-061 (delete/`ConfirmSheet`); the CARD-01
  card-back adoption-count reconcile is still pending at converge.
- **PICKED + refined → B wins (owner, 2026-06-15):** *"the dossier take looks better."* Owner chose **B
  (`dual-dossier`)** over A (`trophy-dualface`) and asked for 3 refinements, now applied: **(1)** the bottom
  **`SectionSwitch` buttons are one-line** (icon inline with the label) — and the **pink pip is dropped**
  (matches the converged device-editor rail + the on-screen-marker audit; active = `scr.accent` border +
  orange icon; locked PLAY shows an inline padlock instead of a badge). **(2)** the **CARDS switcher adopts
  the dual-face draft's tap-select** — the selected card gets a **thin orange ring with a small gap** (a
  responsive moat: an orange stepped `::before` + a screen-bg `::after`, so it works on the grid cells). **(3)**
  the selected card's **options surface inline** (no drawer) — its `EquipReadout` loadout + **SET AS MAIN ·
  EDIT IN STYLER · DELETE** (red `/destructive`; DELETE → the `ConfirmSheet`, OQ-061). M3's caption + hint
  updated to the tap-select model.
- **Follow-ups (owner, 2026-06-15):** **PLATFORMS now reads in the YOUR PLAY readout** (M1 — as `PC` / `PS`
  chips beside RATING/NOTES, with a per-row edit pencil); it had only been expressed inside the edit form. It
  was briefly placed on the card back, but the owner kept the **standardized card back clean** (HOURS · % ·
  STATUS · SINCE only — provenance below, CARD-01); platforms live on the Play screen, not the trophy.
  Still **privacy-gated off the friend card** (M7 — notes/rating/platforms owner-only, COL-04/05). The
  redundant **orange EDIT STATS button was removed** from the PLAY action row — the **EDIT STATS link in the
  YOUR PLAY header** is now the single edit affordance (SWITCH CARD · SHARE remain).
- **Next:** **converge B (`dual-dossier`)** → `game-page-states.html` (full matrix + deferred lifecycle:
  soft-hidden · loading · offline), then Design-spec (formalize the `SectionSwitch` reuse + the dossier-form
  `PlayStats` edit) + API page-audit. Reconcile the **CARD-01 card-back adoption-count** at converge. (A
  `trophy-dualface` + the earlier trophy/draft-A files retired, kept for history.)
