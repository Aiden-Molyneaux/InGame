# Open Questions (the inbox)

> The **only** file anyone may freely append to (including Claude Design). Drop a one-liner the
> moment a question or "actually we need this" occurs — don't break your flow. The spec owner
> triages these in batches and, when resolved, moves each into `decisions/` and updates the spec.
> See the change protocol in [`00-INDEX.md`](00-INDEX.md) §4.

## Format
`OQ-NNN: <question> (where it came up) [behavior | presentation | undecided]`

- **behavior** → will become a spec/api-contract change with an ID
- **presentation** → likely design-spec only, no upstream change
- **undecided** → triage will classify it

---

## Open

- OQ-001: Device — can a user own and switch between multiple device *models*, or is there one
  configurable device? (leaning multiple via entitlements; see DEV-02) [behavior]
- OQ-002: First-pass values for the economy levers — starting balance is 5 (ECON-02), but what are
  the login-bonus amount/cadence and milestone thresholds? (tunable later, but design needs a
  starting number) [behavior]
- OQ-003: Does "currently playing" (WTP-03) also surface as a status on the collection entry
  (COL-02), or only in the queue? [undecided]
- OQ-004: Specific achievement & easter-egg **content** — which milestones, which eggs, their
  triggers and rewards. Dedicated brainstorm when the engine is built (ACH-*). [behavior/content]
- OQ-005: Hidden easter-egg presentation — fully invisible until unlocked, or shown as a locked
  "???" mystery slot that hints something exists? (ACH-03) [presentation]

## Resolved (moved to decisions/)
*(none yet — foundational decisions are in `decisions/0001-foundational-product-decisions.md`)*
