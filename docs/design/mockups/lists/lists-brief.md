# Lists / Top-5 editor (§4.7) — design-track kickoff: TWO drafts → gate → converge

The **§4.7 Lists / Top-5 editor** design track — the surface where you **curate your Top-5** (`SOC-04`):
pick ≤ 5 games **from your collection**, **order** them, share. **v2 = Top-5 only** (general lists
parked, §10). This file is the plan; the gate ruling is appended at the bottom once the owner picks.
Self-brief sources: product-spec §5.10 (`SOC-04` · `PROF-05` · `CARD-07`/`COL-06` · the `lists` +
`list_items` data model, §6) · ui-design-req §4.7 (+ §3.5 Profile parent / Top-5 showcase seam,
`PROF-05`) · api-contract `/me/lists` (+`/:id/items`) · road-to-market **M6 Social** (the milestone
§4.7 serves; **M0** design-close-out gates the 4.7 row) · SCREEN-STATUS row 4.7 (⬜ → 🔶 in-pass this
pass). Per the design-iteration rule this is a **novel interaction** with no single screen to extend,
so it kicks off as **TWO distinct organizing models** → owner gate → converge (do **not** converge in
this pass).

**Design-side only.** §5.10 behavior (`SOC-04`) is specified; the drafts render the **page**, never the
behavior. Any shape/behavior gap → an append to `docs/open-questions.md` (2 logged this pass —
**OQ-083** the dedicated-screen-vs-inline-Profile-edit seam · **OQ-084** the `/me/lists` payload shape).
The spec is never hand-patched.

## The screen (the contract — ui-design-req §4.7 · SOC-04)
The **Top-5 editor**, reached from the **Profile** (`PROF-05`; the Top-5 showcase is *"the gateway into
your collection"*). **Must host** (verbatim, §4.7):

- **pick ≤ 5 games from your collection** — the cap is **hard at 5** (`lists` = a *capped* list, §6) —
  `SOC-04`
- **order them** — the rank (1→5); re-rank = the api-contract **ARRANGE** gesture (`PATCH
  /me/lists/:id { orderedGameIds[] }`, *"the Profile edit-mode ARRANGE gesture"*) — `SOC-04`
- **shown as Game Cards** — each pick renders the owner's **selected** card (`CARD-07`/`COL-06`), the
  universal game representation — full face, never cropped (F-01)
- **share** — the in-app Top-5 surfaces on your friend-viewable Profile (`SOC-04`; external sharing is
  parked §10, so *"share"* here = it shows on your showcase, not an OS share sheet)

**States (verbatim, §4.7):** **empty** · **editing** · **full (5)** — plus the §1.8 lifecycle the
sibling boards carry: **Skeleton** load · **LoadError** (Signal-Lost + RETRY) · **Offline**
(writes-gated, `SYS-10`).

## Scope the SCREEN — don't redraw the neighbours
This track draws the **Top-5 editor** only. The **Profile** (§3.5 / `PROF-05`) is the *entry* — drawn
only as the back-seam (`‹ RETURN TO PROFILE`), **not** redrawn. The **Collection** (§3.1 / `COL-*`) is
the **card source** — it appears only as **picker context** (a grid/sheet you pick *from*), never the
full Collection screen with its sort/filter/view chrome. **Add-to-collection / adopt / card-art edit**
(`ECON-03` / `CARD-01`) live on the Game page + Card editor, **never** here — the Top-5 editor only
arranges cards you already own.

## API shape already drafted (🔶 — page-audit comes at converge)
One row backs the screen: **`GET/POST/PATCH/DELETE /me/lists` (+`/:id/items`)** — *"Lists incl. Top-5
(capped) (SOC-04); Top-5 swap / re-rank = `PATCH /me/lists/:id { orderedGameIds[] }` (the Profile
edit-mode ARRANGE gesture)"* (api-contract line 133).

**Central contract gap (flagged, not fixed):** the row is **prose-only — no item shape is enumerated**
(no `list { id, kind, items[{ gameId, rank, card }] }` GET shape, no membership add/remove verb beyond
the re-rank `orderedGameIds[]`). Drawn against a **proposed** shape and logged as **OQ-084** for the API
page-audit at converge. The re-rank `PATCH` is the only enumerated write — drafts assume `POST
/me/lists/:id/items { gameId }` / `DELETE …/items/:gameId` for membership (proposed, not in the
contract).

## The dedicated-screen vs inline-Profile-edit seam (the headline ambiguity → OQ-083)
The api-contract calls re-rank *"the **Profile edit-mode** ARRANGE gesture"* — implying the Top-5 is
arranged **inline on the Profile in edit mode** (the same gesture the Profile board already hints at:
*"Top-5 swap & re-rank — the OQ-031 ARRANGE gesture, reused"*, profile-states line 684). Yet **§4.7
specs a standalone Lists / Top-5 editor screen**. These are two different homes for the same task. **The
owner must rule** which is canonical (a dedicated `SOC-04` screen, OR an inline Profile edit-mode
panel, OR both — dedicated editor for build, inline arrange for quick re-rank). **Both drafts are drawn
as a dedicated editor screen** (the §4.7 reading), with the back-seam to Profile as the entry — but the
ruling decides whether this screen ships at all or collapses into the Profile. **Logged as OQ-083.**

## Non-commerce — NO gold anywhere (ECON-01 / F-02)
Curating a Top-5 creates **no card** and spends **nothing**. **Gold is the acquisitive set only**
(card-creating ADD · PIXELS economy · primary add-to-collection, F-02 v0.8). The Top-5 editor wears
**system orange** (`--scr-accent`) for any prominent action (SAVE · the create nudge · RETRY), **never
gold**. The PIXELS mark is unused. **Watch-out (flagged for Burt):** the catalog `RankChip/first` + the
Profile board's `.rank.first` render the **#1 rank chip in gold** (`#ffd23f`) — but those predate the
F-02 v0.8 "gold = acquisitive" ratification. On a **non-commerce** editor a gold rank chip risks reading
as gold-misuse. **Both drafts use a NON-gold #1 marker** (orange `StateMark` / cream rank chip) and note
the divergence from the inherited specimen for the owner + Burt to rule — rather than inherit a possibly
-stale gold. (If the owner rules rank-gold is intentional "podium gold," it's a one-line revert.)

## The new components (the headline; FORM is each draft's, NAMES are locked at converge)
No Top-5-editor component exists in the catalog — these are **new compositions** built from catalog
furniture, names ratified at converge:

- **`SlotFrame` / `RankSlot`** (Draft A) — one of five **fixed ranked showcase slots** (a podium /
  depth-chart): filled = a `GameCard/cell` + its rank; empty = a **ghost slot** (the §1.5 ghost-card
  grammar) inviting a pick.
- **`CardPicker` / `PickerSheet`** (both) — the **collection-as-source** picker: a 3-up
  `GameCard/cell` grid of your collection (the catalog `CardFan/pick` cousin), each tappable; Draft A
  opens it **per-slot** as a sheet, Draft B **is** the frame with a running multi-select count.
- **`PickCount` / `CapMeter`** (Draft B) — the **running ≤5 count** (e.g. `3 / 5`) + the **cap-reached**
  treatment (a 6th tap is refused with a swap-or-deselect nudge).
- **`ArrangeRail` / `RankRow`** (Draft B) — the **second-beat arrange step**: the chosen ≤5 cards as a
  **draggable rank list** (the `COL-07` long-press-drag ARRANGE gesture, reused), 1→5 top to bottom.

**Reuse (don't reinvent):** `GameCard`/`cell`(96×134)·`mini`·`thumb` (F-01) · the §1.5 **ghost-card**
(empty-slot grammar) · flat `KeycapButton`/`btn.act` (orange, Scanline Energize, F-03) · `btn.secondary`
(cream) · the `.grip` drag-handle (COL-07) · the orange `StateMark` pixel-square (`--scr-accent`; never
the pink shell LED, F-05/F-09) · the `.return-link` back-seam · `RankChip` (de-golded — see above) ·
`SectionHeader` (`.sec`) · `DeviceShell` + `NavBand` · the §1.8 lifecycle family
(`Skeleton`/`Signal-Lost`/`Offline`).

## The two models (different way to DO the task — not a recolor)
The distinctness axis is **what leads the pick-and-order task** — the **Top-5 structure** (frame-first)
vs the **collection** (collection-first, ranking as a second beat). Both sit on the **same inherited
foundation** (Teal shell · Midnight screen · flat keycaps · F-06 scale · §1.8 lifecycle) so the editor
reads as the same app.

- **A · Frame-first / ranked slots** — [`lists-draft-a-slots.html`](lists-draft-a-slots.html). A
  **headliner #1 seat** (`GameCard/hero`) over a **4-up shelf** of seats 2–5 (`GameCard/cell`) is the
  frame — the finished trophy-case shape; an **empty seat** is a ghost inviting a pick → tap → a
  **collection picker sheet** → the card drops into that seat; **drag to re-order** (the ARRANGE
  gesture). The **Top-5 structure leads** — you always see the shape of the finished showcase, filling
  it in; cards render full-face so it reads like the Profile showcase. Cap is structural (5 seats).
- **B · Collection-first / multi-select** — [`lists-draft-b-multiselect.html`](lists-draft-b-multiselect.html).
  Your **full collection grid is the frame**; you **multi-select up to 5** (a running `n / 5` count, the
  **5-cap enforced** — a 6th tap is refused), then a **distinct arrange step** orders the chosen cards
  as a **draggable podium strip** (#1 raised) + ranked roster. The **collection leads**, **ranking is
  the second beat** — a two-phase PICK → ARRANGE flow, visibly distinct from A's vertical podium.

## State matrix (each draft renders the full §4.7 + §1.8 set)
- **S1 — EMPTY (no Top-5 yet):** a non-gold **create nudge** — Draft A = five ghost slots inviting the
  first pick; Draft B = the collection grid with a *"pick up to 5"* prompt. The doorway, never a dead
  end.
- **S2 — EDITING (mid-pick / mid-arrange):** the model's thesis — Draft A = the picker sheet open over a
  partially-filled podium; Draft B = mid-multi-select (3/5 chosen) **and** the second-beat arrange rail.
- **S3 — FULL (5) (cap reached):** all five chosen — **how a 6th is handled**: Draft A = no empty slot
  remains (structural cap) + a *"swap"* affordance on a filled slot; Draft B = the `n/5` reads **5 / 5**
  and a 6th tap is **refused** with a swap-or-deselect nudge.
- **S4 — SKELETON:** the §1.8 `Skeleton` (solid quiet fills, never an invite — dashes stay reserved for
  invitations).
- **S5 — LOADERROR (Signal-Lost + RETRY):** the §1.8 error grammar (orange RETRY, **no gold**).
- **S6 — OFFLINE (writes-gated, SYS-10):** the offline strip; the editor reads from cache but **SAVE /
  re-rank / pick are gated** (you can't write the list offline) — the §1.8 offline grammar.

## Buttons + marker — the LOCKED flat style (Scanline Energize · F-03, 2026-06-18)
Build **FLAT** — no raised edge, no press-travel. Pressed/active = **Scanline Energize** (CRT scanlines
over a hairline-darkened fill, no motion). The on-screen marker = the **orange `StateMark`** pixel-square
(`--scr-accent` `#ff9f43`), never the pink shell LED (F-05/F-09). Shell `NavBand` keys stay **physical**
(`0 4px 0`). Source grammar ported from `collection-states.html` (the card source + the COL-07 ARRANGE
gesture) and `profile-states.html` (the Top-5 showcase + entry seam).

## Hard rules (carried from the social/collection cluster)
- **Compose from the §1.5 catalog** — reuse the listed components; a genuinely-needed extra is built and
  flagged at the gate.
- **Tokens + shell + fonts inherited verbatim** (Teal shell · Midnight screen; Chakra Petch on screen /
  Paytone One on plastic, F-08); Google Fonts via the `media="print"` onload pattern; built-in SVG only.
- **F-06 type scale is law on screen — 21/15/11/9** (display/emphasis/body/micro). Card plates are print
  and scale with the card (exempt).
- **HTML only — no PNG artifacts.** Verify each draft in headless Edge, READ the render, walk every
  panel, **delete every screenshot before the turn ends**.
- **Burt-clean gate:** after building each draft, run the `burt` skill, apply fixes, re-run until clean
  (or only deliberate documented deviations remain) — *before* presenting.
- **Sample data (consistent across both drafts):** self = **Maverick**. Collection cards (the source):
  Destiny · Minecraft · Marathon (custom, NOW) · Ratchet & Clank · Resident Evil (+ a few dimmed
  un-picked tiles for picker depth). Top-5 order (1→5): Destiny · Minecraft · Marathon · Ratchet &
  Clank · Resident Evil. All counts **caption-marked illustrative**.
- **Scope / git:** create only under `docs/design/mockups/lists/`; read from `mockups/collection/`,
  `mockups/profile/`, the catalog; edit **only** SCREEN-STATUS row 4.7 + append the two OQ lines;
  **append-only** to open-questions. Personal account `Aiden-Molyneaux`, HTTPS, identity set — don't
  override; commit messages name the IDs.

## File map
`docs/design/mockups/lists/`
- `lists-brief.md` — this plan
- `lists-draft-a-slots.html` — **A · Frame-first / ranked slots**
- `lists-draft-b-multiselect.html` — **B · Collection-first / multi-select**
- `README.md` — the file map + flags + Burt outcome
- Converge target (later): `lists-states.html` (full matrix incl. lifecycle)

## Process
1. Author this brief → flip SCREEN-STATUS row 4.7 (⬜ → 🔶 in-pass).
2. Per draft (A, then B): build → **run Burt** → iterate to clean → verify headless (delete shots) →
   README row.
3. Append **OQ-083** (the dedicated-vs-inline seam) + **OQ-084** (the `/me/lists` payload shape).
4. **Owner gate — STOP.** Summarize each model + how it does the task + the per-draft Burt outcome; the
   owner opens the HTML directly. **Do not converge** — that's the next pass after the owner picks +
   rules OQ-083.

---

## Owner gate ruling — A (Frame-first / ranked slots), converged 2026-06-28
Owner picked **A · Frame-first / ranked slots**. Iteration applied before converge: title moved above the
back-link; the **#1 marker chips dropped from the cards** (rank reads from the meta column); S3 **full (5)**
shows all five as **headliner-hero rows** (drag to re-rank); P2 picker **CUSTOM tag removed**; device shell
**nav band corrected to the canonical 5-node** bar (STORE · DISCOVER · COLLECTION · PROFILE · FRIENDS).
Converged to **[`lists-states.html`](lists-states.html)** — the full **S1 empty · S2 editing · S3 full (5) ·
S4 Skeleton · S5 LoadError · S6 Offline** matrix; Burt PASS. Draft A/B kept for history.
**OQ-083 still unruled** — board ships as a dedicated editor pending the dedicated-vs-inline call.
**Owed (spec-owner):** design-spec formalization (`SlotFrame`/`RankSlot` · `CardPicker`/`PickerSheet`) +
the API page-audit (`/me/lists` payload, **OQ-084**).
