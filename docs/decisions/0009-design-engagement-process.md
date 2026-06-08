# 0009 — Claude Design engagement process

- **Date:** 2026-06-08
- **Status:** accepted
- **Related:** `design/design-process.md`

## Context
Before designing screens we want a cohesive design system so screens never feel disjunct, and an
**iterative** engagement with Claude Design — not a one-sweep generation of every screen.

## Decision
- **Hero-screen-first.** Claude Design produces **3 draft directions for the Collection / home
  screen**; the owner picks one; the **design system + component catalog is extracted from it** —
  rather than defining components in the abstract first.
- **Anchor order:** Collection (home) → Profile → expand. The **Card editor gets its own iteration**.
- **Reuse mandate:** a **named component catalog** is the single source of visual truth; **no net-new
  component without justification**; per-screen designs reference components by name.
- **Iterative:** the owner reviews each phase before the next.
- The design-spec mirrors the product-spec shape (Foundations/catalog + per-screen referencing
  components).

## Rationale / alternatives
- **System-first-in-the-abstract** rejected — components designed without a screen context tend to get
  reworked; grounding them in a real hero screen produces a truer, stickier system.
- **One-sweep generation of all screens** rejected — the owner wants to steer iteratively, and a
  shared catalog (not parallel one-off screens) is what keeps the app cohesive.
- The component catalog is the design-side parallel of the spec's stable feature IDs — the mechanism
  that prevents disjoint screens.
