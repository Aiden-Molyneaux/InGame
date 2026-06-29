# Lists / Top-5 editor (§4.7) — mockups

The **§4.7 Lists / Top-5 editor** design track — where you **curate your Top-5** (`SOC-04`): pick ≤ 5
games **from your collection**, **order** them (shown as Game Cards, `CARD-07`), share. **v2 = Top-5
only** (general lists parked, §10). Reached from the **Profile** (`PROF-05`; the Top-5 showcase is the
gateway into your collection). Serves milestone **M6 Social** (road-to-market). A **novel interaction**
(no single screen to extend), so it kicks off as **two distinct organizing models** → owner gate →
converge. Design-side only — `SOC-04` behavior is specified; shape/seam gaps go to the inbox (OQ-083,
OQ-084).

See **[`lists-brief.md`](lists-brief.md)** for the contract, the entry/source seams, the locked
component names, the two directions, the S1–S6 state matrix, the gold-rank divergence note, and the
hard rules.

## Drafts (for the owner gate — 2026-06-28)
Two **distinct ways to DO the task** (different *what leads the pick-and-order*, not a recolor). Each
renders the full **§4.7 + §1.8** matrix: **S1 empty · S2 editing · S3 full (5) · S4 Skeleton · S5
LoadError (Signal-Lost+RETRY) · S6 Offline (writes-gated, SYS-10)**.

| File | Model | Thesis (how it does the task) |
|---|---|---|
| [`lists-draft-a-slots.html`](lists-draft-a-slots.html) | **A · Frame-first / ranked slots** | **The Top-5 structure leads.** A **headliner #1 seat** (`GameCard/hero` 138×193) over a 4-up shelf of seats 2&ndash;5 (`GameCard/cell` 96×134) ARE the frame — the finished trophy-case shape; an empty seat is a **ghost** (§1.5 ghost-card grammar) inviting a pick → tap → a **CardPicker sheet** lifts your collection as a 3-up `cell` grid → the card drops into that seat; **long-press & drag** to re-order (the COL-07 ARRANGE gesture). Cards render **full-face** (CARD-07) so the editor reads like the Profile showcase it feeds. **Cap is structural** — five seats; membership via **SWAP**. **Burt: PASS** ✅ (0 blocker/major; plate 10px exempt, grip-dot specimen inherited). |
| [`lists-draft-b-multiselect.html`](lists-draft-b-multiselect.html) | **B · Collection-first / multi-select** | **The collection leads; ranking is the second beat.** Your **full collection grid is the frame** (3-up `GameCard/cell`); you **multi-select up to 5** with a running **n / 5** `CapMeter`, the **5-cap enforced** — at 5/5 un-picked cards **dim + lock** and a 6th tap is **refused** (orange CAP-REACHED note, deselect-to-free). Then a distinct **PICK → ARRANGE** phase 2: the chosen five become a **horizontal podium strip** (#1 raised) + ranked roster, drag to re-order (COL-07). A deliberate two-phase flow — visibly distinct from A's vertical podium. **Burt: PASS** ✅ (0 blocker/major). |

**Status:** **✅ CONVERGED → [`lists-states.html`](lists-states.html) (2026-06-28).** Owner picked **A ·
Frame-first / ranked slots**. Pre-converge iteration: title above the back-link · rank chips dropped (rank in
meta) · S3 full = five hero rows · P2 picker CUSTOM tag removed · nav band fixed to the canonical 5-node bar.
Drafts A + B kept for history. **OQ-083 (dedicated editor vs inline Profile edit-mode) still unruled** — ships
dedicated until the owner decides. **Owed (spec-owner):** design-spec §1.5/§2.x formalization + API page-audit
(`/me/lists` payload, **OQ-084**).

## New components introduced (form is each draft's; names locked, ratified at converge)
**Draft A:** `SlotFrame`/`RankSlot` (the headliner #1 `GameCard/hero` seat + a 4-up `cell` shelf;
filled = `GameCard` + rank, empty = ghost) · `CardPicker`/`PickerSheet` (the per-seat collection picker, the app's one drawer grammar).
**Draft B:** `CardPicker` (the collection grid as the frame) · `PickCount`/`CapMeter` (the running n/5
+ cap-reached refusal) · `ArrangeRail`/`RankRow` (the second-beat draggable podium strip + roster).
**Reuse (both):** `GameCard`/`hero` (138×193, A's #1) · `/cell` (96×134, the catalog v0.7 3-up/picker cell) · `/mini`
(64×89) · the §1.5 **ghost-card** (empty-slot grammar) · flat `KeycapButton`/`btn.act` (orange, Scanline
Energize, F-03) · `btn.secondary` (cream) · the `.grip` drag-handle (COL-07) · the orange **StateMark**
(`--scr-accent`, never the pink shell LED) · the `.return-link` back-seam · `SectionHeader` ·
`DeviceShell` + `NavBand` (PROFILE active) · the §1.8 lifecycle family.

## Built off the collection + profile boards
Inherits the converged shell + tokens **verbatim** — DeviceShell + NavBand (PROFILE active), the
Teal/Midnight tokens, the flat **Scanline-Energize** keycaps (F-03), the orange **StateMark** (never the
pink shell LED), the **F-06** type scale (21/15/11/9), the **GameCard** art symbols + frames + plates,
and the §1.8 lifecycle grammar (Skeleton · Signal-Lost · Offline-strip), so the editor reads as the same
app. The **Collection** (`collection-states.html`) is the card source + the **ARRANGE/reorder gesture
(COL-07)** the re-rank reuses; the **Profile** (`profile-states.html`) is the entry + the Top-5 showcase.

## Scope (drew the editor only)
The **Profile** (§3.5 / PROF-05) is the *entry* — drawn only as the `‹ RETURN TO PROFILE` back-seam, not
redrawn. The **Collection** (§3.1) is the *card source* — appears only as **picker context** (a grid/sheet
you pick from), never the full Collection screen's sort/filter/view chrome. Add-to-collection / adopt /
card-art edit live elsewhere (Game page + Card editor), never here.

## Non-commerce (the law honored)
**No gold anywhere** — curating a Top-5 creates no card and spends nothing; gold = the **acquisitive set**
only (card-creating · PIXELS · primary add-to-collection, F-02 v0.8). The editor wears **system orange**
(`--scr-accent`) for SAVE / the create nudge / RETRY / the cap warning. The PIXELS mark is unused.
**Deliberate divergence (owner-ratification, flagged):** the **#1 rank marker is orange, not gold** —
the catalog `RankChip/first` + the profile `.rank.first` render #1 in gold, but those predate the F-02
v0.8 "gold = acquisitive" ratification, so a gold rank chip on this non-commerce surface would risk
reading as gold-misuse. Both drafts use a **non-gold** #1 marker; if the owner rules "podium gold" is
intentional it's a one-line revert.

## Flags raised (design-side only — never edited the spec)
- **OQ-083** — **Top-5 home: a dedicated SOC-04 editor screen vs an inline Profile edit-mode panel.**
  The api-contract calls re-rank *"the Profile edit-mode ARRANGE gesture"* (implying inline on the
  Profile), yet §4.7 specs a standalone editor. **Owner to rule** dedicated / inline / both; the ruling
  decides whether this screen ships or collapses into the Profile.
- **OQ-084** — **`/me/lists` (+`/:id/items`) payload is prose-only** (no enumerated GET item shape, no
  membership verb beyond the re-rank `orderedGameIds[]`). Drawn against a proposed shape (GET ordered
  `items[{ gameId, rank, card }]`; `POST/DELETE …/items`; server-enforced cap of 5). For the API
  page-audit at converge (the cousin of OQ-074 for Compare).

## Buttons + marker
Flat **Scanline-Energize** keycaps (F-03, owner-locked 2026-06-18) — isolated to a single `.btn:active`
rule so a future ripple can swap it. The on-screen marker is the orange `StateMark` pixel-square
(`--scr-accent`), never the pink shell LED. Shell `NavBand` keys stay physical (`0 4px 0`).

## File map
- `lists-brief.md` — the plan (contract · scope · API shape · the iteration axis · gate-ruling placeholder)
- `lists-draft-a-slots.html` — **A · Frame-first / ranked slots** (the converged direction)
- `lists-draft-b-multiselect.html` — **B · Collection-first / multi-select** (kept for history)
- `README.md` — this file map + flags + Burt outcome
- `lists-states.html` — **converged canonical states board** (full S1–S6 matrix)
