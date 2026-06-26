# Contributor profile — "My Contributions" (§4.9 · CAT-07) — mockups

The §4.9 **Contributor profile** design track — the **pride surface** off Profile's `MY CONTRIBUTIONS`
gateway. Three distinct organizing models → owner gate → converge. **Owner picked B (2026-06-26)** + iterated
(Profile-style percentile tags on the contributor stat tiles replace the achievement badges; field-edits dropped); not yet converged.

## File map
| File | What |
|---|---|
| [`contributor-profile-brief.md`](contributor-profile-brief.md) | The track plan — contract, scope, the 3 models, panel contract, hard rules, sample data |
| [`contributor-draft-a-record.html`](contributor-draft-a-record.html) | **A · The Record** — organized **by type** (totals → games added · cards designed · field edits · badges). The honest archive. |
| [`contributor-draft-b-trophy.html`](contributor-draft-b-trophy.html) | **B · The Trophy Wall — PICKED** (2026-06-26) — **by prestige**: the most-adopted card lead + **percentile tags on the contributor stat tiles** (gold PctPills, Profile PROF-07: e.g. ADOPTIONS · TOP 10%); lists demoted. **Badges + edits removed** (owner). |
| [`contributor-draft-b-profilelike.html`](contributor-draft-b-profilelike.html) | **B (Profile-like layout)** — a copy of B re-laid in **Profile's grammar** (owner ask, 2026-06-26): `IdentityBlock` (avatar·name·bio·tags) → `STATS` well (tiles + PROF-07 chips) → `SIGNATURE CARD` as the PINNED-FAVOURITE hero (+ `VIEW CARD`) → CARDS DESIGNED & GAMES ADDED as `TOP 5`-style mini-card grids (rank chips + `VIEW ALL ›`). **Owner to compare with `-trophy`.** |
| [`contributor-draft-c-impact.html`](contributor-draft-c-impact.html) | **C · The Impact Dashboard** — organized **by reach** (footprint heroes + items ranked by impact). The data-story. |
| Converge target (later) | `contributor-states.html` — full matrix incl. lifecycle |

Each draft renders **P1** self/populated · **P2** empty (new-user contributor hook) · **P3** friend-view
(read-only) · **P4** privacy-limited (PROF-03 `lock-well`) · **P5** loading Skeleton. **Offline + LoadError
deferred to converge** (reuse the sibling §1.8 grammar).

## Foundation (inherited verbatim — reads as a Profile sub-surface)
Profile's Teal shell `#2bb6b0` · Midnight screen `#232045` · NavBand **PROFILE active** · flat
Scanline-Energize keycaps (F-03) · F-06 type scale (21/15/11/9) · Chakra Petch on screen / Paytone One on
plastic (F-08) · the `lock-well` privacy grammar · the `‹ RETURN TO …` back-seam. Art symbols + frames from
the Profile + Compare libraries (the on-theme indie set: hollow · hades · celeste · stardew · marathon ·
destiny · elden).

## Burt — DS compliance
All three **PASS ✅** (0 blocker / 0 major), reconciled against F-01..F-09 + flat F-03 + StateMark F-09.
- **F-02 gold discipline held:** the only gold on each surface is the **P2 empty-state hooks** (ADD A GAME /
  DESIGN A CARD — acquisitive: catalog-/card-creating) + the **Store NavBand key** (shell). Draft C also uses
  the **`RankChip`/first** gold — the **catalog value-marker** (design-spec token table), not a button.
- **B's standing tiers = gold `PctPill`s** (PROF-07 value-marker, catalog-blessed gold) — the prior
  badge-gold question is **resolved** by the badges→percentile-standing change. Drafts A/C retain the
  non-gold achievement badges (history).
- Fixes applied pre-gate: draft A retlink chevron 13→15px (F-06) + dead `.grip` rule removed; draft B dead
  `.rk` rule removed.

## Flags
- **Picked: B + standing rework (2026-06-26).** Achievement badges + field-edits removed; a contributor
  percentile **tags added on the contributor stat tiles** (gold PctPills, Profile PROF-07 pattern). The earlier badge-gold question is moot.
- **Spec ripple — OQ-079:** dropping CAT-06 edits + achievement badges and adding a percentile standing
  **diverges from CAT-07's must-host list**; the spec-owner ripples product-spec CAT-07 + defines the
  percentile data model (metric · thresholds · honesty/threshold-gating · privacy, PROF-03/07).
- **API gap (defer to converge):** `GET /users/:id/contributions` (CAT-07) is **prose-only**. The page-audit
  + payload enumeration is owed at converge (pairs with OQ-079).

## Next
**B picked + iterated.** Owner confirms the standing-bar form → converge **B** → `contributor-states.html`
(full matrix incl. Offline/LoadError) → design-spec formalization (the standing / showcase / contrib-row
components + the §2.x page) → API page-audit (OQ-079 + the payload).
