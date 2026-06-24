# 0028 — Traceability back-fill for resolved OQs without a decision record

> Renumbered 0026 → 0028 (2026-06-24): decision **0026** was claimed by a concurrent session for the
> Collection peek-flip (COL-12), already cited in product-spec/design-spec/api-contract. This
> housekeeping record (referenced nowhere by number) moved to avoid the collision.

- **Date:** 2026-06-24
- **Status:** accepted
- **Related IDs:** OQ-001, OQ-003, OQ-007, OQ-040, OQ-050, OQ-053, OQ-054, OQ-055, OQ-057, OQ-067, OQ-071, OQ-072, OQ-073
- **Resolves:** (traceability only — the listed OQs were already resolved; this record is their `decisions/` resting place per 00-INDEX §4 Step 3)
- **Source:** the 2026-06-24 governance go-green pass (project-health audit). The audit found these resolved `open-questions.md` items had their rationale only in api-contract / design-spec changelogs (or were resolved design-side), never in the rationale store the working agreement designates. No behavior is re-litigated here.

## Context
00-INDEX §4 Step 3 and `decisions/README` say *"a decision record is the resting place for a resolved `open-questions.md` item."* A health audit found a one-directional gap: newer ADRs cite their IDs well, but a set of resolved OQs never got a record — their "why" survives only in a doc version's changelog or in a converged board. That breaks the "every decision traces to a recorded reason" health indicator even though each decision was genuinely made.

This record back-fills the trace. It does **not** change any decision; it points each resolved OQ at where it was decided and what it landed in.

## Decision
The following resolved OQs are recorded here, with their resolution and where it was formalized. Each remains as already decided.

| OQ | Resolution (unchanged) | Where it landed |
|---|---|---|
| **OQ-071** | `GET /me/feed` aggregated SOC-06 item shape enumerated | api-contract 0.23 · design-spec §2.10 (Friends 3.3 converge) |
| **OQ-072** | `GET /users/search` `PersonRow` shape + `relationship` enum | api-contract 0.23 · design-spec §2.11 (Find/Add 4.8 converge) |
| **OQ-073** | `GET /invites/:token` resolve shape; QR rendered client-side | api-contract 0.23 · design-spec §2.11 (Find/Add 4.8 converge) |
| **OQ-053** | Upcoming notify-me backed by `POST·DELETE /catalog/games/:id/notify` + `release` pref | api-contract 0.21 (Discover page-audit) |
| **OQ-054** | `GET /me/queue` item shape enumerated (owned · source · recommendedBy · note) | api-contract 0.21 (Discover page-audit) |
| **OQ-055** | `GET /discover/trending-cards` shape (rank · card · game · designer · adoptionCount) | api-contract 0.21 (Discover page-audit) |
| **OQ-057** | DISC-02 Browse-By parked from the Discover landing; reached via Game page genre/studio | api-contract 0.21 (Discover page-audit) |
| **OQ-050** | Card start-from sources landed: `/games/:id/card-bases` + `/card-bases/surprise` | api-contract 0.16 (styler sync) |
| **OQ-067** | On-screen selection marker = the orange `StateMark` square (owner Draft A); F-09 reworded + `ChipPip`/`PipLight` → `StateMark` rename; F-05 round+pink scoped to the shell LED only | design-spec 0.18 |
| **OQ-007** | Canvas diegetic breakout (the cabinet-swing workshop) — owner picked the press | resolved design-side, `canvas/canvas-states.html` (decision 0014 arc) |
| **OQ-040** | The "first print" ritual (press sweep · slip assembly · gallery staging → routing) | resolved design-side, `canvas/canvas-states.html` (decision 0014 arc) |
| **OQ-001** | Multiple device models → superseded: one handheld body, many **shells** | decision 0017 / OQ-042 |
| **OQ-003** | "Now Playing" = a single pin distinct from the `Playing` status | product-spec WTP-03 |

## Rationale / alternatives
- **Leave them traced only via changelogs** — rejected: the working agreement designates `decisions/` as the resting place, and a health indicator checks exactly this; leaving the gap means the indicator can never read green and the rationale store has silent holes.
- **Write one ADR per OQ retroactively** — rejected as overhead with no added value: these are already-settled items, several purely presentational. One batched back-fill restores traceability proportionally.
- **Going forward:** resolve OQs through the normal §4 protocol (each substantive resolution gets, or is folded into, a dated decision record at resolution time) so back-fills aren't needed again.
