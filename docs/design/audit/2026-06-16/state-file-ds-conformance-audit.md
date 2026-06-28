# State-File DS-Conformance Audit — 2026-06-16

**Scope:** every `*-states.html` in `docs/design/mockups/*` (11 files across 10 screens).
**Measured against:** `docs/design/mockups/InGame Design System Catalog.dc.html` (Catalog **v0.4**).
**Rubric:** [`_RUBRIC.md`](_RUBRIC.md) — the catalog distilled to checkable constraints, prioritised
**P0** (the owner's ask: **font sizes · GameCard sizes · button sizes**) → **P1** (fonts/tokens) →
**P2** (radius/pips). One auditor per screen, all reading the same rubric.

---

## Bottom line

**No categorical design-system break in any file.** Across all 11 mockups, the hard structural
rules hold:

- **Fonts (F-08):** Chakra Petch on screen, Paytone One on plastic — **no Silkscreen, no third font**, anywhere.
- **GameCard sizes / ratio / no-crop (F-01):** every card holds **63/88**, the four canonical sizes
  are correct, plates are present, **no face is cropped**, and the fan/picker **plate legibility
  floor** (fore ≥10 / neighbour ≥9, thumbs exempt) is met on every board that uses a fan.
- **Button/keycap tiers (F-03):** the **4px shell / 3px screen / 2px tool** drop-edge depths are
  correct on every screen.
- **Colour intent (F-02):** gold-step reserved for card-creation, system-orange for non-card actions
  — **no inversion** found.
- **Tokens:** all 11 `:root` blocks match the canonical **Teal-shell + Midnight-screen** baseline
  verbatim (`--accent #ff3d77`, `--gold #ffd23f`, `--cream #f5f1e4`, `--navy #1d2a4a`,
  `--bezel #14122a`, `--scr-bg #232045`, `--scr-accent #ff9f43`; `--alert #e3414e` added consistently).

**The entire finding set is one theme: type-scale (F-06) precision.** Every "violation" the per-screen
passes raised is on-screen text or a button label landing **off the 21/15/11/9 scale** — never a
font-family, card-size, drop-depth, or colour-intent break. And because the off-scale sizes recur
*identically* across screens, they are **shared constructions**, not per-screen mistakes — a handful
of source fixes clear most of them.

> **Severity note.** The per-screen passes labelled the same deviation inconsistently (a 9px action
> button was "VIOLATION" on Canvas/Settings but "WARNING" on Add-Game/Discover/Styler). This report
> **re-normalises**: categorical breaks would be *Violations* (there are none); all type-scale items
> are graded by **reach × magnitude** as **Notable / Moderate / Minor drift**.

---

## The systemic theme — F-06 type scale (21 / 15 / 11 / 9)

The catalog declares a 4-step on-screen scale. The mockups consistently use a **richer set**
(17px state-titles, 13px some titles, 10–10.5px dense body, 9px "mini" buttons). Four patterns:

### Pattern 1 — action buttons off the 11px floor *(owner priority: "button sizes")*
A shared `.btn.mini { font-size: 9px }` (and a couple of one-offs) push **real action buttons** below
the 11px action-tier floor. Weight (700), letter-spacing, and the 3px drop are all correct — **only
the label size is off.**
- **Canvas** — `.btn.mini` drives **PRESS / PUBLISH / SHARE / PROOF / SAVE PRIVATE** at 9px (`canvas-states.html:83`). These are the editor's *primary* actions. *(highest-impact instance)*
- **Settings** — **SEND** at **12px** (`settings-states.html:230`, the owner-spotlit primary, *over* the floor); **RESEND / OPEN PHONE SETTINGS / UNBLOCK / toast RETRY** at 9px (`:117,:152,:181`).
- **Discover** — `+ QUEUE / + UP NEXT / ↕ REORDER` at 9px (`discover-states.html:154`, `discover-states-fan.html:147`).
- **Add Game** — banner **VIEW MATCH / CREATE ANYWAY** at 9px (`add-game-states.html:180`).
- **Styler** — **SURPRISE ME** at 9px (`styler-states.html:189`); PackTile **$** buttons 10px (`:246`).
- **Report Sheet / Store** — Toast **RETRY** at 9px (`report-states.html:287`).

### Pattern 2 — the §1.6 state-title family at 17px (one fix, ~7 screens)
The LoadError / Unavailable / Offline title is **`font: 700 17px`** — verbatim-reused, so it's off the
21 display step everywhere it appears: `collection:284`, `profile:308`, `add-game:509`, `store`,
`styler:338`, `canvas:293`, and Settings' confirm-title `:137`. Report-sheet's confirm title is the
sibling at 16px (`:271`).

### Pattern 3 — 10–10.5px body / sub-copy
Descriptive paragraphs, list-row primaries, error-subs, and outcome strips repeatedly land one step
under the 11px body size: Profile `.ghost-link` 10 + `.err-sub`/`.efield` 10.5; Store `.lwhat`/toast/
strip 10–10.5; Settings `.page-intro` 10.5 across **six** classes; Device's 10px descriptive band;
Canvas `.chk` 10; Styler `.rc-name` 10. Borderline individually, pervasive collectively.

### Pattern 4 — screen / section headers off-step
- **Device** — `.screen-head h2` **19px** (vs 21) and `.sec-title` **16px** (vs 15), applied to all takes.
- **Discover** — list/breadcrumb/panel titles systematically **12px** (vs 11 body), both files (`:193,225,235,244,262,298`).
- **Settings** — confirm titles 17/19px, triage-card title 13px, blocked-name 12px.
- **Collection** — CountKeycap at 11px where the role wants emphasis 15 (`:137`).

---

## Secondary cross-cutting findings (P2 — for the design-spec board)

1. **Selection-pip colour & shape contradict F-05.** On several screens the selected-row pip
   (`.dw-pip` / `.chip-pip`) renders **orange (`--scr-accent`) and squared** via clip-path, while
   F-05 says *pips are always round* and the files' own comments call for a **pink (`--accent`) LED**.
   Seen in Add-Game (`:188,405`), Report-Sheet (`:215`), Discover. **Internal inconsistency:**
   `discover-states-fan.html` uses a **round** pip for the same component the row file squares — so
   the two boards disagree. The *structural* F-09 treatment (flat border + pip, not a recess) is
   correct everywhere; only the pip's colour/shape is off. Worth one spec ruling.

2. **`.c5` squaring technique varies.** F-07 (on-screen chrome square) **holds everywhere**, but the
   mechanism differs: Collection/Profile/Store/Add-Game/Discover/Styler **define `.c5`** to zero radii
   + apply stepped clip-paths; Settings & Report-Sheet carry an **inert/undefined `.c5`** and rely on
   chrome simply having no radius; Device has **no `.c5`** at all. Same rendered result, three
   techniques — minor consistency debt.

3. **Discover queue-add F-02 inconsistency.** `discover-states.html:422` uses **gold** `.btn.add` for
   `+ ADD FROM COLLECTION` (a queue build — arguably non-card), while `discover-states-fan.html` uses
   **cream/orange** for the same "add to Up Next" role (`:521,536`). Card-creating ADDs are correctly
   gold in both. Not a hard inversion, but the two boards should agree on whether queue-add is a
   card-intent (gold) or chrome action.

4. **Correctly-excluded non-product surfaces.** The simulated **OS keyboard** (`.oskbd`) and **native
   IAP sheet** use `-apple-system / Segoe UI`; auditors correctly treated these as the platform's own
   surfaces (OQ-035), **not** F-08 breaks. Noted so the exclusion is on record.

---

## Per-screen results

| Screen | File(s) | Categorical rules | Type-scale grade | Raw V/W* | Headline |
|---|---|---|---|---|---|
| **Collection** | `collection-states.html` | ✅ pass | Minor | 0 / 3 | CountKeycap 11→15; 10px link cluster; err-title 17 |
| **Profile** | `profile-states.html` | ✅ pass | Moderate | 1 / 4 | `.ghost-link` 10; err family 17/10.5; bio-field 10.5 |
| **Store** | `store-states.html` | ✅ pass | Minor | 0 / 2 | 10–10.5px list/strip cluster; cover-title 19 |
| **Add Game** | `add-game-states.html` | ✅ pass | Moderate | 0 / 2 | `.btn.mini` 9px; err-title 17 |
| **Styler** | `styler-states.html` | ✅ pass | Moderate | 0 / 6 | mini 9 / usd 10 / rc-name 10 / err 17 / total-chip 13 |
| **Device** | `device-states.html` | ✅ pass | Minor–Mod | 0 / 4 | h2 19; sec-title 16; 10px descriptive band (no cards — correct) |
| **Canvas** | `canvas-states.html` | ✅ pass | Moderate | 2 / 4 | `.btn.mini` 9px on PUBLISH/PRESS/SHARE; checklist 10 |
| **Discover** | `discover-states.html` + `…-fan.html` | ✅ pass | Moderate | 0 / 3 | row titles 12 (both files); mini 9; queue-add F-02 split |
| **Report Sheet** | `report-states.html` | ✅ pass | Minor | 0 / 4 | toast RETRY 9; confirm-title 16; pip orange+squared |
| **Settings** | `settings-states.html` | ✅ pass | **Notable** | 8 / 6 | SEND 12; 3× 9px buttons; 10.5 body ×6; titles 17/19/13/12 (no cards — correct) |

\* *Raw V/W = the per-screen pass's own labels, kept for traceability. Under this report's normalised
scheme every "V" is a type-scale item, not a categorical break — see severity note above.*

---

## Recommendations

1. **Decide the scale question first (owner call).** The mockups consistently use 17 (state titles),
   13 (some titles), 10–10.5 (dense body), and 9 (mini buttons) — sizes **F-06 doesn't list**. Either
   (a) **grow the documented scale** to codify these roles (state-title, dense-body, mini-button), or
   (b) **snap the mockups** to 21/15/11/9. This single decision resolves ~80% of the findings.
2. **If snapping:** the highest-leverage edits are shared constructions — lift **`.btn.mini` → 11px**
   (Canvas/Discover/Add-Game/Styler/Settings/Report), the **§1.6 `.err-title` → 21px** (~7 screens),
   **Settings `.fb-send` 12 → 11**, and the **10–10.5px body band → 11**.
3. **Reconcile the selection pip** to the catalog's F-05 voice (round, pink `--accent`) — or amend the
   spec; today the CSS and the files' own comments disagree, and the two Discover boards differ.
4. **Settle the Discover queue-add colour** (gold vs cream) so both boards agree on F-02 intent.
5. **Optional cleanup:** standardise the `.c5` squaring technique so square-chrome is one mechanism.

*These are spec-level decisions (F-06 scale, F-05 pip, F-02 queue-add). No mockups were modified by
this audit; once the owner rules, the fixes ripple from the shared classes and should be reflected in
`design-spec.md`.*
