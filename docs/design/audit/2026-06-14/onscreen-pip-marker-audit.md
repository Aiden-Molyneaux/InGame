# On-screen state marker — the pink-pip leak (audit + replacement scope)

**Trigger:** owner request 2026-06-14 — *"the red pip is a device/shell detail and shouldn't be on
screen; replace it with a marker that fits the on-screen aesthetic."* ·
**Mode:** report + 3 replacement drafts → [`mockups/design-system/onscreen-marker-drafts.html`](../../mockups/design-system/onscreen-marker-drafts.html) ·
**Swept:** the live/converged + in-pass boards (superseded a/b/c drafts excluded — the build composes
from the converged boards). **Owner scope ruling (this turn): replace the pip in *all three*
on-screen roles with one unified marker; the shell LEDs stay pink.**

## TL;DR
The pink pip (`--accent #ff3d77` — round, glowing, `glow.pip`) is the **shell's LED voice (F-05)**. It
belongs on the plastic and stays there (the active NavBand keycap, the power light). It has **leaked
onto the flat screen** as the active/selection marker in three on-screen roles. Replace those — and
only those — with an **on-screen-native marker**: `scr.accent` **orange**, flat, square (F-07/C5).
This also closes a standing contradiction — **F-09 already says** the selection marker is *"an accent
border + pip (**the screen accent, not pink**)"*, but every board rendered the pip pink, citing F-05.

## The two pip families
| | Rendering | Lives in | Verdict |
|---|---|---|---|
| **Shell LED** | round 7px, `--accent #ff3d77` pink + `0 0 9px` glow; the power light is a literal red `#ff5a4e` | `.nav-item .pip` (the plastic NavBand) · `DeviceShell` LED/power · [`collection-states.html:67`](../../mockups/collection/collection-states.html) (nav) / `:50` (power) | ✅ keep — it's on the plastic, doing the F-05 job |
| **On-screen pip** | the *same* round pink glowing dot, reused as a UI marker on flat screen chrome | tool keycaps, selection rows, segments (below) | ❌ replace — LED language on a square flat surface |

## The leak — by role and board

### Role 1 — active tool keycap (`ChipPip`)
The corner dot on an active `ToolKeycap` (a tool in a non-default state — sort/view).
- CSS: [`collection-states.html:135`](../../mockups/collection/collection-states.html) — `.chip .chip-pip { …border-radius:50%; background:var(--accent); box-shadow:0 0 6px 1.5px rgba(255,61,119,.8) }`
- Usages: `collection-states.html` ×14 · `h2-underlay-v2-c5-hybrid-ds-enforced.html` ×2 · `profile-states.html` ×2 (Collection-parity tools) · the Catalog canonical swatch (`InGame Design System Catalog.dc.html` "active + ChipPip", `:149`).

### Role 2 — F-09 selection (`ChipPip` / `dw-pip`)
The dot trailing a selected reason row / option tile (paired with the **already-orange** selection border).
- CSS: [`report-states.html:214`](../../mockups/report-sheet/report-states.html) — `.dw-i .dw-pip { …background:var(--accent); box-shadow:0 0 6px 1.5px rgba(255,61,119,.8) }`; the border at `:213` is **already** `var(--scr-accent)` orange.
- Usages: `report-states.html` ×7 (reason rows, `:457`/`:527`…) · `add-game-states.html` ×4 (the normalized P3b report drawer) · `styler-states.html` (F-09 option tiles).

### Role 3 — active segment / section (`PipLight` / `.sp`)
The dot on the active segment of a `SegmentedKeycap` / active `AttributeSection` chip / active `SectionCard`.
- CSS: [`discover-states.html:107`](../../mockups/discover/discover-states.html) — `.seg-pair .seg .sp { …border-radius:50%; background:var(--accent); box-shadow:0 0 6px 1.5px rgba(255,61,119,.85) }`
- Usages: `discover-states.html` (SegmentedKeycap) · `styler-states.html` (AttributeSection section chips; ×7 spans Roles 2+3) · `device-switcher-rail.html` ×2 (`SectionCard` selection, `ChipPip`).

> **Not affected (no on-screen pip):** `store-states.html`, `settings-states.html`, `canvas-states.html`
> (Canvas selection is the `sel-ring` accent ring, a different language). The shell `.pip` (NavBand
> active LED) is on **every** board and **stays**.

## Why this is principled, not a recolour
- **F-05** — pips are *lights, not chrome*; round LEDs belong on the plastic.
- **F-07** — *radius lives on plastic; on-screen chrome is square (C5)*. A round glowing LED is the one
  thing on-screen chrome shouldn't be.
- **F-09 (as written)** — selection = *"an accent border + pip (the screen accent, not pink)."* The
  boards kept it pink; this honours the rule.
- **Precedent already set:** the 2026-06-13 conformance pass logged the pink-on-screen breach
  ([`audit/2026-06-13/R4-design-system-conformance.md`](../2026-06-13/R4-design-system-conformance.md) §R4-F05), and
  the newest Game-page board (`game-page-trophy-dualface.html`, 2026-06-14) **already dropped the pip**
  for "a thin orange border."

## The drafts (owner picks one)
Three on-screen-native markers, all `scr.accent` orange + flat + square-family — shown in all three
roles with a TODAY/pink reference: **A — Orange C5 square** (direct swap; the GameCard silhouette in
miniature; role-agnostic; *the owner's orange square*) · **B — Orange tick** (shape-coded "chosen" —
legible beyond colour, a11y) · **C — Orange lit edge** (active-tab underline / selected-row leading
rail; the most "flat plane" reading; strongest on segments/rows, subtler on keycaps).

## Ripple after the pick (spec-owner batch — not silent edits)
1. **design-spec §1.1 / F-09** — reword F-09's "pip" to name the new marker; add the
   `ChipPip`/`PipLight`→marker token note; confirm `brand.accent`'s on-screen role retires to the shell.
2. **Catalog §1.5** — replace the `ChipPip`/`PipLight` swatch with the chosen marker.
3. **Boards** — swap the pink dot in Roles 1–3 across the files listed above (border stays orange).
4. **Capture** any naming change (e.g. `ChipPip` → `StateMark`) as an open-question / decision.

## Out of scope (decide separately)
- **Shell LEDs stay pink** — NavBand active keycap, `DeviceShell` LED, power light (F-05, on the plastic).
- **Notification dots** (`brand.accent`) are arguably legit "lights" (alert semantics); not touched here.
