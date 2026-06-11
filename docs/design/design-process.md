# InGame — Design Process (how to work with this brief)

> The working agreement for **Claude Design**. Read this first. Goal: a cohesive app where **no
> screen feels disjunct** — achieved by establishing a reusable **component catalog** early and
> composing every screen from it.

**Owner:** Claude Code (process) · **Audience:** Claude Design · **Last updated:** 2026-06-11

---

## Read order
1. [`ui-design-requirements.md`](ui-design-requirements.md) **Part 1 — Global design direction**
   (device metaphor, nav-on-the-plastic, trading-card form factor, art direction =
   *"distinctive expression, legible navigation"*).
2. **This file** — the process + the reuse mandate.
3. Per-screen functionality: `ui-design-requirements.md` Parts 2–4 (all screens specified).
4. Behavior detail when needed: [`../spec/product-spec.md`](../spec/product-spec.md), referenced by stable ID.
5. Open questions that are **yours to resolve**: [`../open-questions.md`](../open-questions.md) —
   `OQ-005` (hidden-egg presentation), `OQ-007` (stylized break-out). *(`OQ-006` + `OQ-031` resolved — decision 0013.)*

## The core mandate — reuse, or the app drifts
- Build a **named component catalog** — the **single source of visual truth**. Every screen composes
  from it. This is the design-side parallel of the spec's stable feature IDs.
- **No net-new component without justification.** Prefer composing existing components/tokens; when a
  genuinely new pattern is needed, **add it to the catalog (named)** so the next screen reuses it.
- In per-screen designs, **reference components by name** ("uses `PrimaryButton`, `GameCard/grid`") —
  don't re-invent.

## The phases — iterative; the product owner reviews each before the next

### Phase A — Direction via the hero screen
Produce **3 distinct draft directions for the Collection / home screen** (it exercises the most of
the system at once: device frame, console-button nav, Game Cards, sort/filter/search, add-game). The
owner picks a direction (or mixes across them). This sets the visual tone and is the jump-start.

### Phase B — Codify the design system from the chosen direction
Extract and **name** the foundations into the catalog:
- **Tokens:** colour palette · **typography (font families + type scale / sizes)** · spacing scale ·
  radii · borders · shadows · **motion** (the signature transitions/animations: card flip, button
  press, power-on, celebration).
- **Components:** buttons (+ states) · text inputs / dropdowns / pickers / sliders / toggles ·
  the **Game Card** at its sizes (shelf · grid · hero · thumbnail) · the **Device frame + nav** ·
  modals / sheets · segmented controls · list rows · **empty / loading / error** states ·
  toasts / banners · the **celebration moment** · the **currency counter**.

> **Gate before Phase C (owner direction, 2026-06-10):** the **Collection empty state** is designed
> alongside the populated state — it's the post-onboarding landing (`AUTH-06`) and the first thing
> every new user sees. The **Now-Playing-unset hero nudge** (`WTP-03`) ships with it.

### Phase C — Profile (reuse the kit)
Design Profile composed from the catalog — this proves the system and shakes out anything thin.

### Phase D — Expand screen-by-screen by reuse, **coverage-driven**
Assemble the remaining screens from the catalog. The **Card editor** (the heaviest, with
editor-specific controls) gets its **own focused iteration**.

**Pick the next screen by what it surfaces, not by importance alone.** Maintain a
**component-coverage checklist** (every Phase-B catalog item × designed/pending) and choose screens
that close the biggest gaps — e.g. **Add Game** surfaces text fields, the search bar + results list,
and pickers; the Collection **sort/filter drawer** surfaces the pulled-up sheet pattern; **Settings**
surfaces list rows, toggles, and destructive confirmation. A load-bearing element discovered late
(a text field styled for the first time on screen #12) is how an app drifts — surface them early,
name them, reuse them.

## Definition of done — the per-screen state matrix
A screen is **not done when its populated/happy state looks good**. Every screen design enumerates a
**state matrix** and designs (or explicitly defers, with a note) each cell:
- **Baseline states:** empty · loading · error/offline · populated — for every screen.
- **Screen-specific states:** as listed on that screen's **"States:"** line in
  `ui-design-requirements.md` (that line is the checklist, kept current by the spec owner) — e.g.
  Collection's Now-Playing-unset nudge; Profile's **edit mode**, self vs **friend-view**,
  privacy-limited view; the card editor's premium-reconcile and publish states.
- The per-screen section of `design-spec.md` **includes the matrix** (state × designed?/deferred),
  so a missing state is a visible hole, not a silent one.

## The design-spec you produce (`design/design-spec.md`)
Mirror the product-spec's shape so reuse + traceability are enforced:
1. **Foundations** — the tokens + the component catalog.
2. **Per-screen** designs — each **referencing catalog components by name**, each with its
   **state matrix** (above).
3. **Coverage appendix** — the component-coverage checklist (catalog item × first screen that
   designed it × screens reusing it).

## When design surfaces a behavior need
If a design choice needs a behavior/data change the spec doesn't allow, that's a **spec change**, not
a silent design override: drop it in [`../open-questions.md`](../open-questions.md) and bring it to a
Claude Code session — the spec is patched via the change protocol ([`../00-INDEX.md`](../00-INDEX.md) §4),
versioned, and you re-sync.

## Locked process decisions (see `decisions/0009`)
- **Hero-screen-first** (extract the system from a real screen), not system-first-in-the-abstract.
- Start with **Collection (home) — 3 drafts**, then **Profile**, then expand.
- The **component catalog** is the single source of visual truth; reuse is mandatory.
