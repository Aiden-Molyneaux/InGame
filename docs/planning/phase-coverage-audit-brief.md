# Phase-Coverage Audit — brief / paste-once prompt

> **Why:** the **Game page** — arguably one of the most important screens (it's the card-tap NAVIGATE
> target, CARD-23, and the natural home for per-game actions: set-now-playing, log-hours, status,
> remove, adopt-a-card) — turns out to be in **no milestone's build plan** and has no clear spec home.
> That's a planning gap that only surfaced during M3 device testing. This audit exists to find **every
> other surface or feature that fell through milestone planning** *before* it bites us mid-build.
>
> **Run it** as a background Workflow (fan-out over the inputs below) or hand it to a thorough agent.
> Output a report doc under `docs/planning/`.

## Objective
Produce a **milestone-coverage matrix** across every UI surface and every specced feature, and surface:
1. **ORPHANS** — a designed screen (has a mockup) or a specced behavior ID with **no milestone that
   builds/delivers it**.
2. **MIS-SLOTTED DEPENDENCIES** — a milestone's DoD or "tangible win" **depends on** a surface/feature
   that is built in a *later* milestone or *no* milestone (the Game-page-enables-M3-collection-actions
   pattern — the failure mode we just hit).
3. **UNDER-SPECIFIED** — a mockup with **no product-spec behavior** behind it, or a specced behavior
   with **no screen** to host it.
4. **UN-SEQUENCED** — features whose milestone is named but whose *dependencies* land later (build-order
   inversions).

## Authoritative inputs (00-INDEX §2 precedence: product-spec > api-contract > design-spec)
- `docs/planning/road-to-market.md` §4 — the M0–M8 table: each milestone's Goal, Exit, and **"Stable
  IDs delivered."** This is the milestone→ID map.
- `docs/spec/product-spec.md` — the feature IDs (CARD-\* · COL-\* · PROF-\* · SOC-\* · CAT-\* · WTP-\* ·
  ECON-\* · DEV-\* · MOD-\* · AUTH-\* · NOTIF-\* · DISC-\* · ACH-\* · SYS-\*) and **§8 phasing**.
- `docs/spec/api-contract.md` — endpoints (a shipped endpoint with no screen, or a screen with no
  endpoint, is a signal).
- `docs/design/design-spec.md` — the **§2.x / §4.x screen sections** (the canonical screen list).
- `docs/design/mockups/**` — every built mockup HTML = a designed surface that must land somewhere.
  (e.g. `game-page/`, `add-game/`, `collection/`, `styler/`, `canvas/`, `store/`, `friends/`,
  `achievements/`, `compare-hours/`, `discover/`, `contributor-profile/`, `admin-console/`,
  `settings/`, `lists/`.)
- `docs/planning/m1-scaffold-task.md`, `m2-*`, `m3-build-task.md` — what each milestone's build brief
  *actually* scoped (the DoD checklists).
- `docs/decisions/**` — decisions that reference a surface/behavior (e.g. CARD-23 / 0048 names the Game
  page as the NAVIGATE target) but that no milestone builds.

## Method
1. **SURFACE inventory** — enumerate every screen/form/major-modal from design-spec §2/§4 **and** the
   `docs/design/mockups/**` directory. One row per surface.
2. **FEATURE inventory** — enumerate the product-spec stable IDs (from §5/§6/§8), one row per ID.
3. **MILESTONE map** — from road-to-market §4, list each milestone's delivered ID set + its build-task
   DoD scope.
4. **Cross-reference** — for each surface and feature, determine **which milestone builds/delivers it**
   (via the delivered-IDs columns, the §8 phasing, and the build-task DoDs). Mark: `built (Mn)` /
   `planned (Mn)` / **`ORPHAN (none)`** / `ambiguous`.
5. **Dependency check** — for each milestone's DoD + "tangible win," list the surfaces/features it
   *implies* (e.g. M3's "status/hours logged · now-playing" implies a per-game action host). Flag any
   implied surface that is orphaned or built later → **MIS-SLOTTED**.
6. **Spec↔design↔api coherence** — flag mockups with no product-spec behavior, behaviors with no
   screen, and endpoints with no consuming screen.

## Must-catch validation
The audit **must** independently surface the **Game page** as an ORPHAN + MIS-SLOTTED (mockups exist at
`docs/design/mockups/game-page/**`; CARD-23/decision 0048 names it the NAVIGATE target; M3's collection
actions depend on it; it appears in no milestone's delivered-ID set or build-task DoD). If the method
doesn't flag it, the method is too weak — widen it.

## Output (write to `docs/planning/phase-coverage-audit-findings.md`)
1. **Coverage matrix** — Surface/Feature | Owning milestone | Status (built/planned/**ORPHAN**/ambiguous)
   | Evidence (doc:line).
2. **ORPHAN list** — ranked by importance (P0 surfaces first), each with: what it is, why it's orphaned,
   what depends on it, and a **recommended milestone** to slot it into (with the ID/DoD ripple).
3. **MIS-SLOTTED list** — milestone DoDs whose "win" depends on a later/absent surface.
4. **Recommended roadmap patch** — the minimal set of road-to-market + entry-plan edits to close the
   gaps (e.g. "add the Game page to M4 entry, delivering COL-02/03 actions + WTP-03 UI + card INSPECT").
5. **Open questions** to file (00-INDEX §4) for anything needing an owner ruling.

## Guardrails
- Reference behavior by **stable ID**; do not invent scope. Where a surface/feature genuinely isn't
  specced, say so and recommend an OQ — don't paper over it.
- Read-only. Propose the roadmap patch; don't edit the specs.
- Distinguish **"consciously parked" (§10)** from **"fell through the cracks"** — the former is fine,
  the latter is the finding.
