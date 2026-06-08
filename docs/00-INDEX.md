# 00 — Documentation Index & Working Agreement

> This is the **map**. It defines what each document owns, which document wins when they
> disagree, how changes flow between them, and how we keep four+ living documents from drifting.
> Read this before editing anything else.

**Last updated:** 2026-06-07 · **Maintainer:** Aiden (product) + Claude Code (spec/engineering)

---

## 1. The documents and who owns the truth

InGame is designed across several layers. Each layer has **exactly one document that owns the
truth** for its concern. Other documents *reference* that truth by ID — they never restate it.

| Document | Owns the truth for | Authored / edited by | Consumed by | Status |
|---|---|---|---|---|
| `00-INDEX.md` (this file) | Process, ID scheme, change protocol | Claude Code | Everyone | **Active** |
| `spec/product-spec.md` | Behavior, data model, rules, economy — *what the app does* | Claude Code | Design, Planning | **v0.7 — draft** |
| `spec/api-contract.md` | Endpoint + payload shapes — the **frontend↔backend seam** | Claude Code | Design, Planning | **v0.5 — draft** |
| `spec/testing-strategy.md` | How we test — layers, tooling, rigor, CI | Claude Code | Planning, Implementation | **v0.1** |
| `design/ui-design-requirements.md` | What each screen must let users *do* (derived from spec) | Claude Code → handed to Claude Design | Claude Design | **v0.3 — all screens specified** |
| `design/design-spec.md` | Screens, flows, components, visuals — *how you touch it* | Claude Design → committed here | Planning | *Not started* |
| `planning/implementation-plan.md` | Build sequence and tasks | Claude Code | Implementation | *Not started* |
| `decisions/*.md` | **Why** we chose what we chose (rationale, dated) | Claude Code | Everyone | **Active** |
| `open-questions.md` | The **inbox** of unresolved questions | Anyone may append | Claude Code triages | **Active** |

### The pipeline
```
product-spec  ──derives──▶  ui-design-requirements  ──▶  Claude Design  ──▶  design-spec
     ▲                                                                          │
     │                                                                          │
     └────────────── behavior changes loop back up (see §4) ◀───────────────────┘
     │
api-contract (the FE↔BE seam — referenced by both design-spec and implementation-plan)
     │
     └──────────────────────▶  implementation-plan  ──▶  code
```
A **dev-tooling plan** (consistent testing on Chrome + iPhone) is a gate *between* `design-spec`
and `implementation-plan`.

---

## 2. Truth precedence (who wins a conflict)

When two documents disagree:

1. **Behavior / data / rules / economy** → `product-spec.md` wins.
2. **Endpoint or payload shape** → `api-contract.md` wins.
3. **Screen layout / flow / visual / interaction** → `design-spec.md` wins.

A document may never silently contradict its owner. If the design *needs* something the spec
doesn't allow, that is a **spec change request**, handled by the protocol in §4 — not a quiet edit
in the design doc.

---

## 3. Stable feature IDs — the glue

Every discrete behavior gets a **stable ID** the first time it is specified. Every other document
references the behavior by that ID instead of re-describing it. To trace the ripple of any change,
search the ID across `docs/`.

| Prefix | Domain |
|---|---|
| `SYS-` | Cross-cutting / system (security, config, platform) |
| `AUTH-` | Authentication & account identity |
| `PROF-` | Profile |
| `CAT-` | Catalog & contribution (the community game database) |
| `COL-` | Personal collection |
| `CARD-` | Game Card customization |
| `DEV-` | Device customization |
| `COSM-` | Cosmetic assets/effects/stickers library |
| `ECON-` | Economy, currency, store, IAP |
| `SOC-` | Social (friends, profiles, lists, recommendations, feed) |
| `WTP-` | What to Play queue |
| `DISC-` | Discovery |
| `NOTIF-` | Notifications & engagement |
| `MOD-` | Moderation |
| `ACH-` | Achievements & easter eggs |

IDs are **append-only**: never renumber. A retired behavior is marked `(removed)` with a changelog
note, keeping the number burned so old references stay unambiguous.

---

## 4. The change protocol (how a change flows without making a mess)

**Step 0 — Triage. Is it behavior or presentation?**
- *Presentation* (a layout/flow/visual choice) → lives only in `design-spec.md`. No upstream change.
- *Behavior / data / rules* → touches `product-spec.md` (and maybe `api-contract.md`). Continue below.

**Step 1 — Capture (don't break flow).** Append a one-liner to `open-questions.md`. This is the only
file anyone (including Claude Design) may freely append to. Nothing is lost; flow isn't interrupted.

**Step 2 — Formalize (a batched pass with the spec owner).** Bring the item(s) to a Claude Code
session in this repo. The spec owner:
1. Assigns a stable ID.
2. Edits the **owning document first** (spec, and api-contract if shapes change).
3. Updates downstream docs that reference it (e.g. `ui-design-requirements.md`).
4. Bumps the document version and adds a **changelog** line: *what changed, why, impacted IDs*.

**Step 3 — Resolve.** Move the item out of `open-questions.md` into a short record under
`decisions/`, linked to its ID. We never re-litigate a recorded decision without a new record.

**Step 4 — Re-sync.** Whoever is downstream (e.g. Claude Design) pulls the updated docs and
continues against the now-official version.

### The one rule that prevents drift
> **You capture and decide; the spec has exactly one editor (Claude Code).**
> Do not hand-patch `product-spec.md` mid-design — that is how IDs get skipped and docs go stale.

**Why batch?** Letting a few related items accumulate in the inbox lets the spec owner integrate
them *coherently* in one pass, rather than piecemeal edits that fight each other.

---

## 5. Versioning & git conventions

- Each spec/design/contract document carries a **Version** and a **Changelog** section at its end.
- Version bumps: `0.x` during design; `1.0` when a document is considered build-ready.
- Every commit message names the **IDs touched**, e.g. `spec: add CARD-12 (spoiler blur); ripple api-contract`.
- Git history is the audit trail — any layer is diffable and revertable.
