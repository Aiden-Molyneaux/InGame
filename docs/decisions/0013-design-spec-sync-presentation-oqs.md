# 0013 — Design-spec sync + presentation-OQ formalizations (Collection + Profile state passes)

- **Date:** 2026-06-11
- **Status:** accepted
- **Related IDs:** presentation-only (no product-spec/api-contract change, per 00-INDEX §4 Step 0).
  Ripples `design-spec.md` §1.5/1.6/1.7/2.1/2.2/F-02 and `ui-design-requirements.md` §3.1.
- **Source:** owner pre-flight before Phase D screen #1 (Add Game) — clear the presentation OQs the
  Collection + Profile mockups already answered, and bring `design-spec.md` current to those passes.

## Context
`design-spec.md` (moved into `docs/design/`) was a clean Phase B draft, current through the
button/token/palette work (its own changelog → 0.7), but it **predated the Collection-states and
Profile-states mockup passes** — so the `Design System Catalog` HTML (v0.2) had moved ahead of it,
and the spec carried two stale references (a Profile-header privacy chip that decision 0011 removed;
OQ-012 listed "open" though decision 0012 resolved it). This batch syncs the spec and formalizes the
presentation OQs those passes settled. Every item is **presentation** → design-spec only.

## Resolved OQs
- **OQ-006 → the Keycap system (F-03).** On-screen control styling = tactile keycaps on both surfaces
  (`KeycapButton`/`ToolKeycap`), superseding the earlier "flat on screen + Mix" answer (owner picked
  the Keycap take, `button-system-drafts`).
- **OQ-014 → F-01 (never crop a Game Card).** Promoted to a design-spec foundation rule.
- **OQ-036 → F-02 colour-disambiguation.** The stepped corner is the GameCard signature; a button may
  borrow it at half scale, and colour signals intent: **gold + step = a card-creating action** (ADD)
  · **system-orange + step = a prominent non-card action** (RETRY, ADD FRIEND). The avatar "design"
  affordance is a circular corner badge (no step) and is exempt.
- **OQ-037 → §1.6 States & feedback (visual side).** The §1.8 error family has named members:
  **retryable** ("Signal Lost" + RETRY) · **terminal** (`Unavailable` — blocked/suspended/deleted
  collapse here, MOD-09 non-disclosure, no retry, Unblock the lone exception) · calm **Offline**
  (SYS-10, auto-recovers) · solid `Skeleton` (loading never reads as an invitation). **Residual split
  out:** offline **cache scope** (own-only vs recently-viewed friends) → **OQ-038**.
- **OQ-035 → §1.7 Inputs & keyboard.** Text entry uses the **system keyboard**, `keyboardAppearance`
  matched to the screen theme, the focused field riding above it (keeps autocorrect / swipe /
  dictation / i18n / a11y — the "conventional in forms" half of §1.1). A device-skinned in-app keycap
  keyboard was considered for maximum metaphor and **deferred** (a11y/i18n cost). Goes live with Add
  Game, the first heavy text surface.
- **OQ-031 → Arrange mode.** Manual ordering (COL-07) = an **Arrange** mode entered from the sort
  sheet, long-press-drag to reorder, saved as one more sort choice.
- **OQ-033 → shelf rows show stats.** The shelf view-mode gives entries a per-game stats eyebrow; the
  dense list's rationale shifts from decision 0012's "only mode where stats show" to a **density**
  rationale (list scans more rows than shelf). One-line ripple to design-req §3.1.
- **OQ-034 → tools-bar model.** "Keycaps act, the drawer configures": tap = the tool's one-bit action
  (search → in-place live-filter · sort → flip ASC/DESC · view → cycle modes); FILTER (multi-choice)
  opens the pulled-up sheet; long-press any keycap opens the sheet at that section; one shared query
  state between in-place search and the sheet field.

## Parked
- **OQ-015 — power-LED as notification indicator.** Liked and recorded, **not v2 scope**; revisit with
  notification polish (NOTIF-01/02).

## design-spec.md currency fixes (→ v0.8)
- Added the **States & feedback** family + **§1.6**, **§1.7 Inputs & keyboard**,
  `KeycapButton/action-alt` (orange non-card step), in-place `SearchField` + `MatchTag`, and
  `Avatar` + `DesignBadge` (PROF-08).
- Recomposed **Collection** (3 view modes, tools-bar model, Arrange, friend-chrome toggle, state
  matrix) and **Profile** (Settings gear in the header — *not* privacy, per decision 0011; friend-view;
  state matrix).
- Fixed stale references: OQ-012 "open" → resolved (decision 0012); header version 0.1 → 0.8.

## Still open (owed before the screens that touch them)
- **OQ-007** — stylized break-out (→ Card editor).
- **OQ-005** — hidden easter-egg presentation (→ Achievements).
- **OQ-038** — offline cache scope (SYS-10).
