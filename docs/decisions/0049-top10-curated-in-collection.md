# 0049 — The Top-10 is curated in the Collection (amends decision 0047's editing surface)

**Date:** 2026-06-29 (ratified 2026-06-30) · **Status:** ✅ Accepted — owner ratified 2026-06-30.
**product-spec applied** (SOC-04 + PROF-05 → Collection TOP view, 0.41); **OQ-083 reversed**; decision 0047 noted. **Boards + design-spec applied 2026-06-30:** design-spec §2.1 (+TOP view) + §2.17
(RELOCATED banner) → **0.47**; **`lists-states.html` re-homed as the Collection TOP view** (NavBand →
COLLECTION-active ×6 · back-seam → RETURN TO COLLECTION · title/intro reframed); the **COL-12 peek-flip
stage recovered** into `collection-states.html` (a prior sweep had silently dropped it — CSS + the
grid/shelf/friend stage restored from commit `0b4069e`). **Burt PASS** on both boards (0 blocker/major;
the 10px nameplate is decision-0047's owner-picked ≥9px floor).
**Owner:** Aiden (ruling 2026-06-29) · Claude Code (spec-owner)
**Amends:** 0047 (editing surface only) · **Re-opens:** OQ-083 · **Touches:** SOC-04 · PROF-05 · §2.1 · §2.17 · §4.7 · §3.1
**Source:** the card-tap audit's R-TOP5 + Top-model rulings — [`game-card-tap-audit.md`](../design/mockups/audit/2026-06-29/game-card-tap-audit.md) §4.5.

## Why this exists
Decision 0047 (accepted, same day, parallel session) grew **Top-5 → Top-10**, made the Profile show the
**Top-3** + a **VIEW TOP 10** grid, and **kept the dedicated §4.7 Lists editor** as the curation surface.
Working the card-tap audit, the owner instead ruled (twice) that the Top should be **set/reordered in the
Collection** — folding §4.7 in. This record captures that amendment so the two tracks don't build
opposite things.

## Decision (the amendment)
**Keep from 0047 (unchanged):** the cap-10 list, the Profile **Top-3** showcase, nameplate F-06-bound.

**Change — where the Top is curated:**
1. **The Collection gains a "TOP" view-mode** (alongside grid / shelf / list) that renders the curated
   Top-10 in rank order. This is the **set & reorder** surface: **drag-to-rerank** reuses the
   **COL-07 / OQ-031 ARRANGE** gesture; **membership** via a **CardPicker** (search → ★ add / remove) —
   reusing the components built for the §4.7 board.
2. **The standalone §4.7 Lists/Top editor is retired as a screen;** its CardPicker + rank/slot logic
   **relocate into the Collection TOP view**. *(Re-opens / supersedes **OQ-083**, which had ruled a
   "dedicated editor".)*
3. **Profile Top-3 card tap → the Collection in TOP view, scrolled to that game** (CARD-23 / 0048).
4. **Edit-mode tap rule:** in TOP arrange mode a single tap is a **no-op** (drag reorders); outside
   arrange mode the TOP view follows the Collection **flip** rule (COL-12).

**Sub-choice — RESOLVED (owner, 2026-06-30): (a) the Collection TOP view** — one surface for view + edit. The Profile's **VIEW TOP 10** link →
- **(a) the Collection TOP view** — one surface for view + edit (*recommended* — simplest, matches "edit
  where you browse"); or
- **(b) keep 0047's standalone read-only ranked grid** for viewing, with the Collection TOP view as the
  editor (two surfaces).

## Ripples owed (NOT applied — pending ratification + coordination)
- **product-spec:** reword **SOC-04 / PROF-05** — 0047 says "the §4.7 editor curates 10" + "VIEW TOP 10
  opens the full curated list"; change to "curated in the **Collection TOP view**". Amendment, no new ID.
- **api-contract:** `/me/lists` already cap-10 (0047) — **unchanged**; the Collection TOP view reads/writes
  the same list (`PATCH /me/lists/:id { orderedGameIds[] }`, `POST/DELETE …/items`). No new endpoint.
- **design-spec:** **§2.1 Collection** +TOP view-mode (drag-rerank + CardPicker membership); **§2.17**
  retire/relocate the standalone editor.
- **Boards:** `collection-states.html` (+TOP view-mode); `lists-states.html` (retire/relocate — or
  repurpose as the in-Collection TOP-view spec); `profile-states.html` (VIEW TOP 10 → destination per the
  sub-choice; Top-3 already applied by 0047).
- **SCREEN-STATUS:** §3.1 (+TOP view) · §4.7 (editor retired/relocated, 🔶) · **00-INDEX** register on apply · `/health`.

## ⚠ Coordination
This **amends an accepted decision (0047)** and **re-opens OQ-083**, and it **overlaps the live parallel
Profile/Top session**. Do not apply until the owner ratifies the amendment and both tracks are aligned on
one model — otherwise §4.7 gets simultaneously "re-passed to 10 seats" (0047) and "retired" (this).

## Alternatives considered
- **Keep 0047 as-is (dedicated §4.7 editor):** least churn, no reversal — but it's not the "edit where you
  browse" model the owner chose in the card-tap audit.
- **Edit in both (4.7 + Collection):** rejected by the owner earlier — two surfaces editing one list.
