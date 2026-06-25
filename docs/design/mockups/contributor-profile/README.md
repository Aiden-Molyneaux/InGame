# Contributor profile — "My Contributions" (§4.9 · CAT-07) — mockups

The §4.9 **Contributor profile** design track — the **pride surface** off Profile's `MY CONTRIBUTIONS`
gateway. Three distinct organizing models → owner gate → converge. **In pass** (drafts built; not yet
converged).

## File map
| File | What |
|---|---|
| [`contributor-profile-brief.md`](contributor-profile-brief.md) | The track plan — contract, scope, the 3 models, panel contract, hard rules, sample data |
| [`contributor-draft-a-record.html`](contributor-draft-a-record.html) | **A · The Record** — organized **by type** (totals → games added · cards designed · field edits · badges). The honest archive. |
| [`contributor-draft-b-trophy.html`](contributor-draft-b-trophy.html) | **B · The Trophy Wall** — organized **by prestige** (badge case + most-adopted card lead; lists demoted). The pride hit. |
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
- **Badges drawn NON-gold** (orange `--scr-accent` accent) — earned glyphs aren't acquisitive per the
  F-02-clarified letter. **⚠ Owner-ratification flagged** (see below).
- Fixes applied pre-gate: draft A retlink chevron 13→15px (F-06) + dead `.grip` rule removed; draft B dead
  `.rk` rule removed.

## Flags for the owner gate
- **Badge gold (cross-screen):** earned contributor badges render **non-gold** here. The Friends board
  carries an inherited **gold** `.achv` achievement glyph (owner-ratified there). **Pick one treatment across
  both surfaces** — keep badges non-gold (F-02-clarified), or bless gold-as-achievement.
- **API gap (defer to converge):** `GET /users/:id/contributions` (CAT-07) is **prose-only — no enumerated
  payload**. The drafts render a proposed shape (games-added+reach · cards-designed+adoptions · field-edit
  log · badges · totals/footprint). **The API page-audit + an OQ to enumerate it is owed at converge** (the
  Compare/OQ-074 precedent).

## Next
Owner picks a direction → converge to `contributor-states.html` (full matrix incl. Offline/LoadError) →
design-spec formalization (§1.5 `ContribTotals`/`ContribRow`/`ContribBadge`/`EditLogRow` + the §2.x page) →
API page-audit (the OQ above).
