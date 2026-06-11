# 0011 — Mockup-review formalizations (Collection + Profile)

- **Date:** 2026-06-10
- **Status:** accepted
- **Related IDs:** WTP-03, PROF-07, PROF-03, COL-03/07, AUTH-06
- **Source:** owner review of the first Collection + Profile mockups (follows the gap-review batch,
  decision 0010).

## Now Playing is the Collection hero (WTP-03, P2 → P1)
The mockup put a **Now Playing hero with a quick Log-hours action** at the top of Collection — not
in the brief, but it's the strongest "every session pays off fast" move on the screen (finish a
session → open app → log hours in one tap; the Completionist's return trigger). Formalized:
- Surfaced on **Profile and as the Collection hero**, pairing the pin with quick log-hours (COL-03).
- **Unset state is a nudge, not a blank**: "set your Now Playing" → pick from collection (owner
  direction). This also de-risks the hero structurally — the slot never depends on a pin existing.
- **Priority raised P2 → P1** because the Collection layout now depends on it.

## Community percentile chips (PROF-07, new, P2) — closes OQ-013
The mockup's "TOP 25%" chip was ahead of the spec. Kept (owner wants it in the design system), made
honest:
- **Server-computed**, attaches only to viewer-visible stats (PROF-03).
- **Threshold-gated** (server-config, SYS-04): hidden below a minimum population so cold-start
  percentiles aren't nonsense ("top 25% of 8 users").
- **Design rule: every stat tile renders cleanly without its chip** — the chip is enhancement, not
  structure. P2 build priority; the design keeps the slot.

## Profile chrome corrections (owner directions)
- The **privacy/visibility control (PROF-03) is not a Profile-header chip** — it lives in Settings
  (recorded in ui-design-requirements 0.6 as a §3.5 "Not here").
- The bottom-right icon becomes the **Settings entry** (a §3.5 must-host that was otherwise missing
  from the screen). The **theme changer** it replaced moves into Settings *if it survives* — what it
  actually is (device-shell shortcut vs. a new app-display-theme behavior) is **OQ-032**.

## Process additions (design-process.md)
Prompted by "missing a small affordance now causes big aftershocks later":
- **Gate before Phase C:** the **Collection empty state** (+ the Now-Playing-unset nudge) is designed
  before moving on — it's the post-onboarding landing (AUTH-06).
- **Per-screen state matrix as definition-of-done:** baseline states (empty · loading ·
  error/offline · populated) + the screen's "States:" line from ui-design-requirements (edit mode,
  friend-view, premium-reconcile, …) are enumerated and designed or explicitly deferred; the matrix
  lives in each design-spec screen section so a missing state is a visible hole.
- **Coverage-driven screen ordering in Phase D:** keep a component-coverage checklist and pick next
  screens to surface unbuilt load-bearing elements early (Add Game → text fields/search/results;
  the sort/filter drawer → pulled-up sheet; Settings → rows/toggles/destructive-confirm).

## Also raised, left open
- **OQ-031** — the manual-ordering interaction on Collection (COL-07 mandates the capability; the
  affordance + gesture + relationship to the sort drawer are Claude Design's to propose).
