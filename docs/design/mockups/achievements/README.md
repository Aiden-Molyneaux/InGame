# Achievements (§4.10 · ACH-03/05) — mockups

The **Achievements** design track — the general **pride / payoff surface** (`ACH-03/05`), reached from
**Profile only**; **friend-viewable** (earned ones only). Sibling to the converged **Contributor profile**
(§4.9). **Design-side only** — the board renders the page; §5.15 behavior (`ACH-01..08`) is the authority and
is never hand-patched. Achievement **content** is deferred (**OQ-004**) — every milestone/egg/badge/reward here
is **illustrative sample data**.

**Status: CONVERGED (design) → [`achievements-states.html`](achievements-states.html).** Owner picked
**Draft A · Trophy Case** (2026-06-27) and asked for **VIEW ALL** on each section. Design-spec formalization +
the API page-audit/OQ are **owed at the spec-owner pass** (see below).

## Files
| File | What |
|---|---|
| [`achievements-states.html`](achievements-states.html) | **★ The converged states board** (Trophy Case + VIEW ALL views + lifecycle) |
| [`achievements-brief.md`](achievements-brief.md) | The plan |
| [`achievements-draft-a-trophycase.html`](achievements-draft-a-trophycase.html) | Draft A — **the picked direction** (history) |
| [`achievements-draft-b-questlog.html`](achievements-draft-b-questlog.html) | Draft B — Quest Log (history; not picked) |

## The converged board — Trophy Case (by status)
SUMMARY counts → **EARNED** trophy grid → **IN PROGRESS** bars → **SECRETS** (the `???` mystery-slot model) →
**REWARDS**. Each of the three collections is a **top-N summary with a `VIEW ALL ›`** that opens an equivalent
full-list state view (owner ask, 2026-06-27). **OQ-005 resolved → pole A** ("hint something exists" — `???`
mystery slots; the unknown-count is the only tell).

**Artboards (11):**
- **P1** self · populated (top-N summary + the 3 VIEW ALL links + tier legend) · **P2** empty (new user, NON-gold)
- **V1** VIEW ALL · Earned (all 8) · **V2** VIEW ALL · In progress (all 5, closest-first) · **V3** VIEW ALL ·
  Secrets (2 found + 4 hidden `???`) — each with a `‹ ACHIEVEMENTS` back-seam + a summary line
- **P3** friend-view (Riko · earned only — in-progress + eggs never leak; its VIEW ALL reuses V1 with a friend
  back-seam) · **P4** privacy-limited (`lock-well`; honest count reads)
- **P5** unlock celebration (ACH-06 arcade takeover, tier-coloured — a gold ADOPTED 100× unlock)
- **L1** Skeleton · **L2** Signal Lost + RETRY · **L3** Offline (read-from-cache, SYS-10)

## ★ Three-tier colour system (owner, 2026-06-27 · OQ-082)
| Tier | Colour | Token | Meaning (prestige/rarity) |
|---|---|---|---|
| **PRESTIGE** | **gold** | `--gold` | rare/marquee (COLLECTOR · ADOPTED 100× · TASTEMAKER · SHELF LIFE · MARATHONER · PROLIFIC) |
| **STANDARD** | **theme accent** | `--scr-accent` | everyday milestones — **rides the theme accent, so it re-themes with the screen theme (DEV-04)** |
| **SECRET** | **magenta** | `--scr-secret` `#e85ad0` *(new token)* | easter eggs (NIGHT OWL · PERFECT WEEK + the hidden `???`) |

The tier drives the `BadgeTile` glyph, the `ProgressMeter`, the `MysterySlot`, and the `CelebrationMoment`. A
small tier legend sits on the self panel. *Which* achievement is which tier = content (**OQ-004**).

## Components (names ratified at the design-spec pass)
`BadgeTile` (glyph + label + earned/in-progress + progress + tier — the home of badge composition,
reconciling the contributor track's dropped `ContribBadge`) · `MysterySlot` (the locked `???` secret) ·
`ProgressMeter` (tier-coloured bar) · `RewardChip` (ACH-04 payout; marks `EARN-ONLY`) · `CelebrationMoment`
(ACH-06 takeover) · the **tier legend** + the `--scr-secret` token · the `VIEW ALL` TertiaryLink + the
full-list view header/`listsum`/back-seam.

## Burt (DS compliance)
- **`achievements-states.html` — PASS ✅** (0 blocker / 0 major). F-06 type scale clean (21/15/11/9), F-07
  square on-screen chrome, F-08 one-font, F-03 flat Scanline keycaps, shell NavBand physical (PROFILE active),
  F-01 n/a (no GameCards). **Owner-ratified carve-outs (not violations):** gold-on-achievement (F-02, the
  PRESTIGE tier) + magenta-on-screen (F-05, the SECRET tier) → tracked at **OQ-082**. Other gold stays scoped
  to the Store nav key + the PIXELS `◆` currency mark.
- Verified panel-by-panel (all 11 artboards rendered). No PNG artifacts (HTML-only).

## Owed at the spec-owner pass (not this pass)
1. **product-spec ACH-** — add the **`tier`** attribute to the achievement definition (OQ-082); record **OQ-005
   → resolved (pole A, `???` mystery slots)**.
2. **F-02 + F-05 carve-outs** — amend the Catalog/design-spec wording (gold = also achievement prestige;
   magenta = the on-screen secret tier; shell LEDs stay round/pink). OQ-082.
3. **design-spec §1.x + §4.10 page** — formalize the components above + the VIEW ALL full-list pattern.
4. **API page-audit** — enumerate the prose-only `GET /achievements` · `/me/achievements` ·
   `/users/:id/achievements` payloads (milestone+progress · egg-visibility · reward badge/currency/cosmetic ·
   tier · unlocked-at) + the friend/privacy shape + the VIEW-ALL/pagination shape (the Contributor/Compare
   precedent). No new endpoint minted.

## History
Draft A (picked → converged) · Draft B Quest Log (not picked). The kickoff brief, the two-direction gate, and
the tier pass are in [`achievements-brief.md`](achievements-brief.md).
