# 0019 — Triage batch: element cap · intensity · save-private · popular ranking · friend-share

- **Date:** 2026-06-13
- **Status:** accepted
- **Related IDs:** CARD-15, CARD-12, CARD-14, CAT-09, PROF-05 (product-spec 0.19) · `/catalog/popular`
  (api-contract 0.18) · design-req 3.5/4.1 (0.14). Resolves **OQ-008, OQ-048, OQ-049, OQ-051, OQ-052**.
- **Source:** owner triage (2026-06-13) — the three inbox rulings already tagged "spec encode = next
  triage" (from the styler/canvas follow-ups), plus two open behaviour questions surfaced by the
  Collection/Profile api page-audit.

## The rulings
- **OQ-008 → CARD-15: element cap starts at 30.** The per-card element count stays
  server-configurable (SYS-04); **30** is the launch value design/perf build against (the layers
  panel + the at-cap state are drawn against it in stage 3 / Canvas).
- **OQ-048 → CARD-12: intensity is the effect's alone, and it persists.** The `IntensitySlider`
  applies to the **one animated effect** only; **finishes are binary surface materials** (no second
  slider). The chosen value **persists in the composition JSON** (CARD-15) — the converged Styler
  board's "EFFECT · 70%" reconcile row is canonical.
- **OQ-049 → CARD-14: save-private surfaces in both places.** A Styler SAVE PRIVATE (CARD-04/14)
  surfaces in **both** the game's card switcher (COL-06) **and** the My-designs shelf
  (`GET /me/cards`: drafts · private · published) — no new surface invented.
- **OQ-051 → CAT-09 ranks "popular".** The empty-Collection suggestion rail + AUTH-06's
  add-a-few-games step rank by **collections-count** (most-collected first), **capped ~12, no
  paging** — the rail is a nudge, not a browse surface (Discover owns browsing). `GET /catalog/popular`
  carries the rule.
- **OQ-052 → friend-view Share chip cut.** Sharing is **self-only** — your own invite link (SOC-07).
  Sharing *someone else's* profile has no v2 behaviour (profile deep links + people-discovery are
  parked, §10), so the SHARE affordance is **removed from the friend-view** Profile; revisit if that
  park ever opens. (PROF-05; design-req 3.5.)

## Why a batch
OQ-008/048/049 were owner-ruled inline during the styler/canvas passes and parked in the inbox for a
spec-owner encode; OQ-051/052 were raised by the Collection/Profile api page-audit and needed an
owner call. Landing them together keeps one version step and one decision record rather than five
trickle edits across the concurrently-edited specs.

## Ripple notes
- **api:** only OQ-051 touches the contract (`/catalog/popular` ranking). OQ-008 is server-config,
  OQ-048 lives inside the opaque composition JSON, OQ-049 is covered by existing endpoints
  (`/me/cards` + the collection card-switcher) — no shape change. OQ-052 removes a UI affordance — no
  endpoint change (the self `/me/invites` share stays).
- **No new "popular" spec ID** — the rank is just the CAT-09 collections-count read in order, so it
  rides CAT-09 rather than minting an ID.
