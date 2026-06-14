# 0023 — Success / affirmative status colour (`brand.success`)

- **Date:** 2026-06-14
- **Status:** accepted
- **Related:** `brand.success` (design-spec §1.1) · pairs with `brand.alert` · R4 design audit (`docs/design/audit/2026-06-13/R4-design-system-conformance.md`, F01)

## Context
The R4 design-system audit found three converged/in-flight tracks had each **independently
improvised an off-palette green** for positive/affirmative status, because the canonical palette had
**no success colour** (it carries `brand.alert` red for the negative/destructive voice, but no
positive counterpart):
- **Settings** — `#7fcf9b` for "✓ VERIFIED", "N ON", and the "ATTACHED" tag (`.rsub.ok` / `.rv.on` / `.la-pl-tag`)
- **Store ledger** — `#7fe0c3` for "earned" credits (`.lrow.earn`)
- **Discover** — `#d3e95e` lime for the FOIL tag

Three mismatched greens were the symptom; the missing token was the cause. Patching each colour
individually would just leave the next surface to improvise again.

## Decision
Add **`brand.success` = `#7fcf9b`** to the brand constants (design-spec §1.1) — a **theme-invariant**
positive/affirmative status colour, the green counterpart to `brand.alert`. Used for: verified state,
setting-on, attached, ledger credits, and similar "good / confirmed" signals.

**Rippled now:**
- Store ledger earn `#7fe0c3` → `brand.success` (consolidated to the canonical value).
- Settings already used `#7fcf9b` — it **is** the canonical value, so no change was needed.

## Scope / parked
- **Lime FOIL `#d3e95e`** (Discover) — **left as-is** (owner deferred). It's a "special / foil"
  marker, not a success state — a separate question whether it folds to `brand.gold` or its own token.
- **Reversal `#ff8a93`** (Store ledger `.lrow.rev`) — left as-is. A **negative / reversal** token is
  a separate open question; this decision covers *success* only.
- **Light-theme contrast** — `#7fcf9b` is tuned for the dark canonical (Midnight); on the light themes
  (Paper / Mint / Lilac) it may be low-contrast. A light-theme variant is **parked** until a success
  state actually renders on a light theme.
- **Catalog swatch** — `brand.success` is **owed** in the Design System Catalog (the visual twin),
  which is already lagging at v0.4 (as for Report / Discover / Settings).
- **Mockup token-reference** — this ripple consolidated *values*; converting the affected mockups to a
  `var(--success)` reference is a follow-up.

## Alternatives considered
- **Route everything to `scr.accent` (orange)** — i.e. "no success colour; positive states look like
  every other accent." Rejected: it erases the verified/earned/on semantic that three independent
  designers reached for, and overloads the action accent.
- **Per-theme `scr.success`** — a theme-scoped token with six values. Deferred in favour of a single
  invariant constant (symmetric with `brand.alert`); the light-theme variant is parked above if needed.
