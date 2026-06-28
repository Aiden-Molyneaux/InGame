# 0030 — Device editor (4.5) formalization

- **Date:** 2026-06-27
- **Status:** accepted
- **Related IDs:** **DEV-05** (new — saved looks) · DEV-01/02/03/04 (sticker zones · enforcement · preview) · COSM-01/03 (premium preview-then-acquire) · ECON-07 (acquire-batch) · `SectionSwitch`/`SectionCard` · `StickerStage`/`TransformBox`/`PlacedSticker`/`StickerTray` · `SavedLook`/`LooksGrid`/`KeepBar` (design-spec §1.5) · §2.15 Device editor (design-spec)
- **Closes:** OQ-045 (closed design-side at converge) · **OQ-062** · **OQ-063** · **OQ-064** · **OQ-065** · OQ-076 (the formalization-owed governance capture)
- **Source:** owner sign-off, 2026-06-27 — four rulings ratified to formalize the converged `device-states.html` board (in-frame edit · `SectionSwitch` rail · LOOKS · OQ-045 on-shell preview) into the owning docs. The board converged 2026-06-14; this records the behaviour/shape decisions its formalization needed.

## Context
The Device editor (§4.5) converged design-side on 2026-06-14 (owner picked **A "in-frame live edit"**; the bottom-docked `SectionSwitch` rail won; stickers go on the **plastic only**; saved **LOOKS** identified by shell·theme with **SAVE CURRENT** the only save). Convergence left a tracked formalization debt (OQ-076): the new components were unformalized (design-spec ⬜) and four behaviour/shape questions gated the API page-audit (🔶) — OQ-062 (sticker composition shape + nav-exclusion enforcement), OQ-063 (`SectionSwitch` app-wide consolidation), OQ-064 (saved-looks data model), OQ-065 (premium-preview persistence / "cart"). This pass rules all four and formalizes the board.

## Decision

### OQ-062 — `stickerComposition` shape + nav-exclusion enforcement
The opaque `stickerComposition` (api-contract `PATCH /me/device`) gains a defined, versioned per-sticker shape:

```
stickerComposition: { version: 1, stickers: [ { id, assetId, zone, x, y, scale, rotation } ] }
```
- **`zone`** ∈ `"forehead"` | `"chin"` — the two decoratable **plastic** bands (the top-band beside the logo · the nav-band margins). The screen (DEV-04's theme surface) and the 5 nav keycaps are **off-limits** (owner clarification, 2026-06-14). The zone names the coordinate space so server validation is a per-zone rect check.
- **`x, y`** — normalized **[0,1] within the named zone's bounding rect** (resolution-independent; the board's px are presentation only).
- **`scale`** — multiplier on a base sticker size, clamped (e.g. 0.5–2.0); **`rotation`** — degrees (−180..180); **`id`** — a per-placement uuid (so a `SavedLook` can snapshot a specific placement).

**Enforcement is belt-and-suspenders (DEV-03/F-04):** (1) the client refuses placement outside the zones, as drawn; (2) the **nav keycaps always render above stickers** (z-order) so navigation is never obscured even at a zone edge; (3) the **server validates** on write — `zone` ∈ the allowed set and the sticker's transformed bounds stay inside the zone rect; out-of-bounds is rejected/clamped. Device decoration is personal-only (never published), so this is integrity, not moderation — but DEV-03 is a hard P0 rule, so the server stays authoritative.

### OQ-063 — `SectionSwitch` scope: unify the grammar, keep the variants
The app's three "pick one section/segment" controls are unified under **one design-spec §1.5 grammar entry** with **named variants**, *not* a destructive rename:
- **`SectionSwitch/pair`** — the 2-way page-switch (Discover UP NEXT ↔ DISCOVER; was `SegmentedKeycap`).
- **`SectionSwitch/chips`** — the jump rail (Styler attribute sections; was `SectionChips`).
- **`SectionSwitch/rail`** — the bottom-docked icon+label rail (Device editor SHELL · THEME · STICKERS · LOOKS; the Game-page PLAY · CARDS · ABOUT).

The shared selection tell was already settled app-wide (flat, **F-09 accent-border + the orange `StateMark`**, no pip — 0.18 / OQ-067). `SegmentedKeycap` and `SectionChips` are **retained as the `/pair` and `/chips` variant aliases** (IDs/names are append-only; nothing is renumbered). The **converged Discover and Styler boards are not re-worked** — they already render the unified tell. This consolidates the catalog grammar at zero churn to settled work.

### OQ-064 — saved "looks" data model
A **`SavedLook`** bundles **shell + sticker composition + screen theme** into one re-applyable snapshot. New behaviour **DEV-05**:
- **New entity `device_looks`** — user × `{ id, active_shell_id, screen_theme_id, sticker_composition (snapshot), created_at }`. **No name** — a look is identified by its **shell · theme** (owner ruling); rename is not supported.
- **Apply** = write the look's three facets onto `/me/device` (`activeShellId` · `screenThemeId` · `stickerComposition`). A look is a saved snapshot; the live device equals whichever look is on now (or an unsaved live combo). **No dedicated apply endpoint** — apply reuses `PATCH /me/device`.
- **ON NOW** is **computed** (the look whose three facets match the current device), not a stored flag — nothing to keep in sync.
- **Create** = **SAVE CURRENT** snapshots the live combo into a new row (the only save affordance).
- **Delete** is supported (`DELETE /me/device/looks/:id`); the LOOKS board gains a minimal delete affordance at formalization (a capped list is unmanageable without removal).
- **Cap** ~12 looks (tunable; the number is illustrative like the rest of the economy values, OQ-002/011). Personal-only.

### OQ-065 — premium preview / the "cart" — ratified
The editor is a **live try-on**; ratify (a)–(e) as the design assumes, mirroring the Styler's multi-premium → reconcile-at-KEEP (CARD-13):
- (a) Previews of **unowned** premium shell · theme · stickers **persist across section switches** within the editing session — the rail changes what you edit, it doesn't strip what's applied.
- (b) **Exit-with-pending** prompts the reconcile (KEEP) or discards (the free/owned default re-renders) — the editor **never silently keeps** an unowned item.
- (c) **Per-item remove** in the reconcile reverts that facet to owned/free.
- (d) **`/me/device` only ever references owned items** — previews are client-side until acquired; KEEP commits via `POST /cosmetics/acquire-batch` (the existing atomic acquire-batch, ECON-07), *then* the device write.
- (e) **No hard preview cap** beyond the sticker-count cap — the natural ceiling is 1 shell + 1 theme + the placed stickers.

## API ripple (api-contract 0.27)
- **`PATCH /me/device`** — `stickerComposition` documented to the OQ-062 shape (`{ version, stickers[{ id, assetId, zone, x, y, scale, rotation }] }`, zone-normalized coords; plastic-only zones server-validated).
- **`GET /me/device/looks`** — list the caller's `SavedLook`s `{ id, activeShellId, screenThemeId, stickerComposition, createdAt }` (DEV-05).
- **`POST /me/device/looks`** — **SAVE CURRENT**: snapshot the live combo → the new look (cap-enforced).
- **`DELETE /me/device/looks/:id`** — remove a look.
- Apply = the existing `PATCH /me/device`; premium KEEP = the existing `POST /cosmetics/acquire-batch` — no new endpoints for either.

## Rationale / alternatives
- **OQ-063 — one shared component (destructive rename)** — rejected: retiring `SegmentedKeycap`/`SectionChips` re-formalizes and re-render-verifies two **converged** boards (Discover, Styler) for no user-visible gain; the variants legitimately differ in form. **Device-scoped only** — rejected: leaves three near-identical controls in the catalog with no consolidation. The variant model gets one grammar (one selection tell, one source of truth) without churning settled work.
- **OQ-064 — no delete, replace-oldest** — rejected: silent eviction of a saved look on the next SAVE CURRENT is surprising; an explicit delete + a cap is the predictable model. **A stored `is_on_now` flag** — rejected for the computed match (a flag drifts from the live device; the match can't).
- **OQ-062 — client-only enforcement** — rejected as the *sole* boundary: DEV-03 is P0, and a malformed/3rd-party client could write a nav-obscuring composition; the server validates zone membership + bounds. The z-order rule (keycaps paint above stickers) makes obscuring impossible at render regardless, so the three layers are complementary, not redundant.

## Follow-ups
- **Board:** the LOOKS section needs the minimal **delete affordance** (OQ-064) added at the design-spec formalization — a small board edit, not a re-converge.
- **Numbering note (resolved 2026-06-27):** a parallel-session collision had two `0029-*` files. Fixed — `0029-compare-hours-converge.md` was renamed to **0031** (it had no inbound numeric references; the "decision 0029" citations across the specs all mean Welcome/Onboarding, which keeps 0029). This record is 0030.
