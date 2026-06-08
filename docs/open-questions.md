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

- OQ-002: First-pass values for the economy levers — starting balance is 5 (ECON-02), but what are
  the login-bonus amount/cadence and milestone thresholds? (tunable later, but design needs a
  starting number) [behavior]
- OQ-004: Specific achievement & easter-egg **content** — which milestones, which eggs, their
  triggers and rewards. Dedicated brainstorm when the engine is built (ACH-*). [behavior/content]
- OQ-005: Hidden easter-egg presentation — fully invisible until unlocked, or shown as a locked
  "???" mystery slot that hints something exists? (ACH-03) [presentation]
- OQ-006: On-screen control styling — tactile/3D arcade-style buttons may look jarring on-screen
  vs. conventional flat controls. Nav lives on the device "plastic"; contextual actions live on the
  "screen." Claude Design decides the on-screen control styling. (raised in Collection nav design) [presentation]
- OQ-007: A **stylized "break-out"** treatment for space-hungry screens (e.g. the Card editor):
  the bezel is intentionally thin, so whether/when a screen expands beyond the device frame — and
  how that transition is styled — is a Claude Design decision to consider. [presentation]

## Resolved
- OQ-001 → **Multiple device models.** A user can own several device models (via entitlements/store)
  and switch the active one — as DEV-02 states. (2026-06-08)
- OQ-003 → **"Now Playing" is a single pin**, distinct from the multi-valued `Playing` status
  (COL-02): one game you pin as "what I'm on now," settable from Up Next or a collection entry,
  surfaced on the Profile. Clarified in WTP-03. (2026-06-08)
