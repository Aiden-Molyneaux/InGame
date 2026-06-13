# 0018 — Both tracks formalized + the nameplate cosmetic type (OQ-039)

- **Date:** 2026-06-12
- **Status:** accepted
- **Related IDs:** **COSM-01** (+nameplate), **CARD-01/11** (layer stack + title = font + ink) ·
  design-spec **0.12/0.13** (the Forms & Flow set · the editor set · §2.4 Add Game · §2.5 Styler ·
  the §1.2 plate legibility floor) · catalog HTML **v0.4** · design-req **0.13** (store Nameplates
  aisle) · product-spec **0.18**. api-contract was **pre-synced** by the styler track (0.16:
  card-bases + surprise + save-private + `nameplate` enums; resolved OQ-050).
- **Source:** owner: *"go ahead and add both tracks components"* (2026-06-12) — the formalization
  batch for the **Add Game** converged board and the **Styler** converged board (whose gate ruling
  was *"I'll take carousel, only note is add nameplate remove overlay"*).

## What formalized

### The Add Game set (design-spec 0.12, from `add-game/add-game-states.html`)
§1.5 **Forms & Flow**: `FlowTakeover` / `FlowHeader` · `TextField` (+`/area`, `/error`) ·
`SelectField` · `ResultRow` · `InlineBanner` · `CardFan` (+`/pick`) · `CardDetail` · `EquipReadout` ·
`CleanPeek` · **`ReportSheet`** (`/drawer` ruled app-wide; `/modal` + `/takeover` kept for history).
§1.2 gains the **plate legibility floor** (≥10px forefront / ≥9px neighbors in interactive
fan/picker contexts; deep-mini exempt; editor min plate-band ratio note — baked plates, CARD-01/15).
New **§2.4 Add Game** composition + the full P1–P10 state matrix.

### The Styler set (design-spec 0.13, from `styler/styler-states.html`)
§1.5 **editor set**: `AttributeSection` (the carousel grammar — five closed attributes) ·
`SectionChips` · `BaseRail` (start-from incl. received-base) · **`IntensitySlider`** (closes the
catalog's slider gap) · `ReconcileSheet` (the CARD-13 keep-gate) · `KeepBeat` (the 0015 light tier).
New **§2.5 Styler** composition + state matrix (draft-safe lifecycle: free/owned work continues
offline from cache; premium acquires + KEEP writes-gated, SYS-10). No Publish — canvas-tier (0014).

## The behavior ruling — nameplate in, overlay out (closes OQ-039)
**COSM-01 gains `nameplate`** — the title-plate **object** (launch shapes drawn: SLAB · RIBBON ·
BEVEL · premium HOLO PLATE). The card layer stack (CARD-01) becomes *base → vector elements →
effect → finish → frame → **nameplate** → title*, and **TITLE rescopes to font + ink colour**
(CARD-11) — the plate's look is bought/earned as a cosmetic; the words on it are styled type.
**"Overlay" was considered and cut** (finish already owns the overlay-like slot; a second
art-occluding layer fought F-01's spirit). Ripples: §6 `cosmetic_items` types (also fixing a stale
pre-0017 list) · design-req 3.4's store categories gain **Nameplates** · the Styler's P5b section
is the type's first surface; the store aisle stocks it.

## Why one batch
Both boards converged within a day on parallel tracks sharing the component language; formalizing
them together kept the catalog (v0.4 carries both new sections) and §1.5 from drifting apart, and
landed the cross-track dependencies (PIXELS marks on Add Game; `ReportSheet` available to every
future surface; the nameplate aisle ready before the Store's next pass) in one coherent version step.

## Left open
OQ-048 (effect-intensity scope) · OQ-049 (save-private landing spot) — both styler-inbox items for
the next triage. Stage 3 (the Canvas posture) remains the queue's head: OQ-007 break-out + the
OQ-040 reveal ritual.
