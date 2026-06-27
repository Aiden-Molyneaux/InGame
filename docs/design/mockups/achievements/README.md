# Achievements (§4.10 · ACH-03/05) — mockups

The **Achievements** design track — the general **pride / payoff surface** (`ACH-03/05`), reached from
**Profile only**; **friend-viewable** (earned ones only). Sibling to the converged **Contributor profile**
(§4.9). **Design-side only** — the drafts render the page; §5.15 behavior (`ACH-01..08`) is the authority and is
never hand-patched. Achievement **content** is deferred (**OQ-004**) — every milestone/egg/badge/reward here is
**illustrative sample data**.

This is a **kickoff pass: a brief + distinct draft directions → owner gate.** **Do NOT converge** — converge +
design-spec formalization + the API page-audit/OQ is the next pass, after the owner picks.

## Files
| File | What |
|---|---|
| [`achievements-brief.md`](achievements-brief.md) | The plan (mirrors the contributor track brief) |
| [`achievements-draft-a-trophycase.html`](achievements-draft-a-trophycase.html) | **A · Trophy Case** — by status; eggs = `???` mystery slots |
| [`achievements-draft-b-questlog.html`](achievements-draft-b-questlog.html) | **B · Quest Log** — by momentum; eggs = invisible until unlocked |
| `achievements-states.html` | Converge target (later — NOT this pass) |

> **Owner ruling at kickoff (2026-06-27):** build **TWO** drafts (draft-C "Showcase" was undefined → dropped).

## ★ Three-tier colour system (owner direction, 2026-06-27) — applied to BOTH drafts
"Keep it relatively simple but rewarding." Every achievement wears one of **three tiers**, by colour (a legend
sits on the self panel):

| Tier | Colour | Token | Meaning (prestige/rarity) |
|---|---|---|---|
| **PRESTIGE** | **gold** | `--gold` `#ffd23f` | the rare, marquee, hard-won achievements (COLLECTOR · ADOPTED 100× · TASTEMAKER · SHELF LIFE · the PROLIFIC quest) |
| **STANDARD** | **theme accent** | `--scr-accent` `#ff9f43` | everyday milestones (FIRST PUBLISH · EXPLORER · FIRST FRIEND · SOCIAL · CURATOR) — **rides the theme accent on purpose, so it re-themes with the user's screen theme (DEV-04)** |
| **SECRET** | **magenta** | `--scr-secret` `#e85ad0` *(new on-screen token)* | easter eggs (NIGHT OWL + the hidden `???`) |

The tier drives the BadgeTile glyph frame, the in-progress bar / QuestRow, the `MysterySlot`, and the
`CelebrationMoment` (A's unlock fires a **gold** ADOPTED-100× takeover; B's a **theme/standard** CURATOR one).
*Which* achievement is which tier is content (**OQ-004**); the visual system is the deliverable here.

## The two models (distinct = a different ORGANIZING principle + a different OQ-005 answer)
Both sit on the **same inherited foundation** (Teal shell · Midnight screen · flat Scanline-Energize keycaps ·
F-06 · §1.8 lifecycle · NavBand **PROFILE active**) — a clear Profile sibling.

- **A · TROPHY CASE (by status)** — SUMMARY counts → **EARNED** trophy grid (hero) → **IN PROGRESS** bars →
  **SECRETS** (1 revealed egg + locked `???` mystery slots) → **REWARDS**. **OQ-005 = "hint something exists."**
- **B · QUEST LOG (by momentum)** — **NEXT UP** in-progress milestones with prominent progress + reward
  previews (closest first) → compact **EARNED** archive → rewards recap. **OQ-005 = "invisible until unlocked"**
  (no mystery slots; an egg only appears after it fires).

## Panels (each draft renders P1–P5; lifecycle deferred to converge with a caption)
P1 self · populated · P2 empty (new user — **NON-gold** record cold-start) · P3 friend-view (**earned only** —
in-progress + hidden eggs never leak) · P4 privacy-limited (`lock-well`; honest count reads, detail withheld) ·
**P5 unlock celebration moment (ACH-06)** — the arcade takeover, tier-coloured.
Deferred to converge: **Skeleton · LoadError · Offline** (read-from-cache, SYS-10) — reuse §1.8 verbatim.

## New components (FORM is each draft's; NAMES ratified at converge)
`BadgeTile` (glyph + label + earned/in-progress + progress + **tier**; the home of badge composition,
reconciling the contributor track's dropped `ContribBadge`/`BadgeTile`) · `MysterySlot` (A only — the locked
`???` secret) · `ProgressMeter` (tier-coloured bar) · `RewardChip` (ACH-04 payout; marks `EARN-ONLY`) ·
`CelebrationMoment` (the ACH-06 takeover) · the **tier legend** + the `--scr-secret` token.

## Flags for the owner gate (don't silently decide)
1. **OQ-005** — egg presentation differs by draft (A = `???` mystery slot · B = invisible). **Pick a draft =
   pick the OQ-005 answer.**
2. **Tier system → OQ-082 (spec/DS ripple owed at converge).** The 3-tier system implies:
   **(a)** a new **`tier`** attribute on the achievement definition (product-spec ACH-01/03);
   **(b)** an **F-02 carve-out** — **gold now also = achievement PRESTIGE tier** (non-acquisitive). *This
   resolves the old badge-gold cross-screen flag* — gold-for-achievements is owner-ratified; reconcile with the
   Friends `.achv` gold glyph + the future Profile teaser;
   **(c)** an **F-05 carve-out** — **magenta on-screen** (`--scr-secret`) for the secret tier (pink-family on
   screen, which F-05 reserved for shell LEDs). Shell LEDs stay round/pink; the secret tier is a flat on-screen
   magenta, a distinct hue.
3. **API payload** — `GET /me/achievements` etc. are **prose-only**; the drafts render a **proposed** shape. The
   **page-audit + the OQ to enumerate it is owed at converge** (the Contributor/Compare precedent).

## Burt (DS compliance)
- **Draft A · Trophy Case — PASS ✅** · **Draft B · Quest Log — PASS ✅** (0 blocker / 0 major each). F-06 type
  scale clean (21/15/11/9), F-07 square on-screen chrome, F-08 one-font, F-03 flat Scanline keycaps, shell
  NavBand physical (PROFILE active). **Owner-ratified carve-outs (not violations):** gold-on-achievement
  (F-02, the PRESTIGE tier) + magenta-on-screen (F-05, the SECRET tier) → both tracked at **OQ-082**. Other gold
  stays scoped to the Store nav key + the PIXELS `◆` currency mark.

## Verified (headless render walk)
Both drafts walked panel-by-panel in the browser (every P1–P5, inner-scroll sections included). The three tiers
render correctly — gold prestige, theme-accent standard, magenta secret — on the EARNED grid, the in-progress
bars / quests, the mystery slots (A), and the celebration takeover (gold in A, theme in B). No PNG artifacts
committed (HTML-only).
