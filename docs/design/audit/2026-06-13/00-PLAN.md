# Design-Documentation Audit — Playbook & Tracker

> A smart-ordered sweep of the InGame **design layer** (and its seams to spec / api-contract /
> decisions / open-questions) for inconsistencies worth patching — including, per owner,
> **design-language/pattern consistency across the actual mockups** (button conventions, components,
> layout, art direction), accounting for each page's legitimate functional differences.
> **Report-only:** every pass flags and recommends a fix; no pass edits a source doc (honors
> 00-INDEX §4 — the spec has exactly one editor). Walked through one report at a time with the owner.

**Started:** 2026-06-13 · **Auditor:** Claude Code (this session) · **Audited against:** working tree at `c48d1a5` (live — see Notes)

---

## Scope
**In:** `design-spec.md`, `ui-design-requirements.md`, `design-process.md`, `SCREEN-STATUS.md`, the
`mockups/` tree + the Design System Catalog, `plans/` — for **internal** consistency AND for
consistency at every point they **cross-reference** `product-spec.md`, `api-contract.md`,
`decisions/`, and `open-questions.md`. Plus the **design-language / pattern** layer of the rendered
mockups (R4–R6).

**Out:** the internal correctness of product-spec *behavior* itself (a different audit); writing any
application code; editing any source doc (this is a report-only sweep).

## How findings are rated (severity rubric — every finding, every report)
- **Critical** — actively misleads the build or breaches truth-precedence (design asserts a
  behavior/shape that contradicts product-spec/api-contract). Causes wrong implementation or rework.
- **High** — breaks navigational integrity the team trusts: a false ✅/pointer, or a
  wrong-version/identifier cite a reader (or downstream agent) would act on.
- **Medium** — a real inconsistency with bounded blast radius (design-language drift that hurts
  reuse/polish; a state board missing a lifecycle state).
- **Low** — cosmetic / hygiene (terminology nit, missing changelog line, ordering, self-labeled
  in-flight provenance).

## Finding record format
`<Rn-Fnn> — <title>` · **Severity** · **Location(s)** `file:line` · **Evidence** (quoted conflicting
text) · **Expected** · **Impact** (what breaks downstream) · **Suggested fix + protocol lane**.

Protocol lanes (00-INDEX §4 routing): **(a) doc-hygiene** — mechanical, the owner just edits ·
**(b) presentation** — a `design-spec` edit, no upstream change · **(c) spec-change-request** —
behavioral, route via `open-questions.md` to the spec owner; never quiet-patched.

---

## The reports (smart-ordered)
**Ordering principle:** cheap & near-certain first (clears noise, validates the cross-reference
scaffolding the later passes navigate by) → the judgment-heavy **design-language** passes in the
middle (after their canonical baselines are validated) → deepest-semantic coverage last.

### R1 — Reference & Version Integrity ✅ done
- **Objective:** dead links, missing referenced files, version-citation drift, broken decision/OQ cites.
- **Baseline/inputs:** each doc's own Version/Changelog tail; the mockups tree; `decisions/` + `open-questions.md`.
- **Method:** extract each doc's true current version → check every external cite; glob every referenced path; resolve every decision/OQ cite + markdown link.
- **Finding =** any cite that disagrees with ground truth or fails to resolve.
- **Defers:** "resolved-OQ still open" → R3; design-language → R4–R6.

### R2 — SCREEN-STATUS Fidelity (map vs territory) ✅ done
- **Objective:** every dashboard claim checked against reality — state, **implements-from** file, states-board exists, **Design-spec ✅** vs design-spec's actual sections, **API ✅** vs api-contract's actual coverage.
- **Baseline:** SCREEN-STATUS rows; the design-spec §-index; the api-contract endpoint list.
- **Method:** per row, verify each ✅ / version / pointer against the named target.
- **Finding =** a dashboard claim the named target doesn't actually support.
- **Defers:** ID-level truth-precedence → R3.

### R3 — Stable-ID & Truth-Precedence ✅ done
- **Objective:** IDs referenced in design that don't exist upstream; behavior **restated** instead of referenced (§3/§4); design-spec **contradicting** product-spec/api-contract (§2); **resolved-OQ leaks** (marked resolved but still open in `open-questions.md`).
- **Baseline:** the product-spec ID set; api-contract shapes; `decisions/`; open-questions status.
- **Method:** extract every ID/OQ cited in design → resolve upstream → diff asserted behavior vs the owning doc.
- **Finding =** an unresolved ID, a restated/contradicted behavior, or a resolved-but-still-open OQ.

### R4 — Design-System Conformance · tokens · buttons · components ⭐ ✅ done
- **Objective:** the owner's headline case — pages that diverge on **button conventions**, **token values**, or **reinvent/rename** catalog components.
- **Baseline (extract FIRST):** the canonical inventory from the Catalog (v0.4) + design-spec §1 Foundations — button sizes/shadows, token palette, component names.
- **Method:** read every mockup; record button geometry (size/shadow/fill), color/spacing/radius vs tokens, components used vs hand-rolled/renamed; cluster the majority convention; flag outliers; **judge whether the page's function justifies the deviation**.
- **Finding =** a value/component that departs from the canonical baseline without functional cause.
- **Defers:** page-level layout/chrome → R5; aesthetic motif → R6.

### R5 — Layout, Chrome & Interaction Patterns ⭐ ✅ done
- **Objective:** "standard header" conformance, scroll/section-ordering models, **sheet vs drawer vs modal** grammar, destructive-confirm pattern — each judged against the page's functional needs.
- **Baseline:** the patterns established across the converged boards + design-spec §2 compositions + §1 furniture.
- **Method:** cross-tabulate each page's chrome/scroll/sheet grammar; flag the minority deviations that aren't functionally driven.
- **Finding =** an inconsistent structural/interaction pattern without functional cause.

### R6 — Retro-Arcade Art-Direction Consistency ⭐ ⬜
- **Objective:** does every surface hold the **device-as-frame / trading-card / "distinctive expression, legible navigation"** identity (decision 0004) — consistently, and without over-applying novelty into wayfinding/forms (0004's explicit guardrail)?
- **Baseline:** decision 0004 tenets + design-spec §1 art-direction tokens (theme, type voice, the bold-vs-conventional split) + the motifs visible across the converged boards.
- **Method:** per surface, judge motif presence/consistency (device frame, card object, celebration, type voice) against 0004's "be bold here / stay conventional there" map; flag **under-expression** (off-brand-flat) and **over-expression** (novelty leaking into nav/forms).
- **Finding =** a surface off the 0004 art-direction contract in either direction.

### R7 — State-Matrix & Lifecycle Consistency ⬜
- **Objective:** across every `*-states.html` board, do they cover the same canonical lifecycle (skeleton · load-error+retry · empty · offline writes-gated · in-flight · error→Toast, per §1.8)? Consistent treatment/copy?
- **Baseline:** the §1.8 States & Feedback family in design-spec/catalog; the union of states across boards.
- **Method:** build a board × state matrix; flag omissions and divergent treatments.
- **Finding =** a board missing a canonical state others include, or treating one inconsistently.

### R8 — Requirements Coverage & Affordance Backing ⬜
- **Objective:** ui-design-requirements Part-2 screens/behaviors with **no SCREEN-STATUS row or no mockup** (under-coverage); affordances **drawn** in mockups with **no backing ID/OQ** (the "all drawn affordances contract-backed" standard).
- **Baseline:** ui-design-requirements Part 2; the product-spec ID set; SCREEN-STATUS.
- **Method:** two-way trace — requirements→mockup (gaps) and mockup→requirement/ID/OQ (un-backed draws).
- **Finding =** an uncovered requirement or an un-backed affordance.

---

## Walkthrough cadence
Run a report → write its file in this folder → present a digest + severity-ranked findings to the
owner → owner reacts/triages → next report. Findings are **recommendations**; patching happens
separately through the 00-INDEX §4 protocol (this sweep never edits a source doc).

## Status tracker
| Report | Status | File | Findings |
|---|---|---|---|
| R1 · Reference & Version Integrity | ✅ done | [`R1-reference-integrity.md`](R1-reference-integrity.md) | 5 High · 1 Low |
| R2 · SCREEN-STATUS Fidelity | ✅ done | [`R2-screen-status-fidelity.md`](R2-screen-status-fidelity.md) | 1 Medium · 1 Low |
| R3 · Stable-ID & Truth-Precedence | ✅ done | [`R3-stable-id-and-truth-precedence.md`](R3-stable-id-and-truth-precedence.md) | 1 Critical · 2 Medium |
| R4 · Design-System Conformance | ✅ done | [`R4-design-system-conformance.md`](R4-design-system-conformance.md) | 1 Medium · 4 Low |
| R5 · Layout/Chrome/Interaction | ✅ done | [`R5-layout-chrome-interaction.md`](R5-layout-chrome-interaction.md) | 1 Medium · 1 Low |
| R6 · Retro-Arcade Art-Direction | ⬜ next | — | — |
| R7 · State-Matrix & Lifecycle | ⬜ | — | — |
| R8 · Requirements Coverage | ⬜ | — | — |

## Notes
- **Live tree.** The repo is edited by concurrent sessions. This audit is stamped to a commit;
  a parallel commit (`c48d1a5`, +SYS-11 feedback/bug reporting, decision 0022) landed mid-R1 and is
  already reflected in the ground truth. **Re-confirm versions/state at the start of each report.**
- Two untracked game-page drafts (`game-page-draft-b-dossier.html`, `-c-pinned.html`) are in-flight
  WIP from a concurrent track — excluded from findings (see R1 "Excluded").
