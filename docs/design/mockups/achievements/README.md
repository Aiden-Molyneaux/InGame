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

> **Owner ruling at kickoff (2026-06-27):** build **TWO** drafts. The brief's draft-C "Showcase" pole was
> undefined; the owner chose to drop it (build only A + B).

## The two models (distinct = a different ORGANIZING principle + a different OQ-005 answer)
The owner picks the **OQ-005** easter-egg answer by picking a direction. Both sit on the **same inherited
foundation** (Teal shell · Midnight screen · flat Scanline-Energize keycaps · F-06 · §1.8 lifecycle · NavBand
**PROFILE active**), so Achievements reads as a clear Profile sibling.

- **A · TROPHY CASE (by status)** — the completionist pole. SUMMARY counts → **EARNED** trophy grid (hero) →
  **IN PROGRESS** milestones with bars → **SECRETS** (1 revealed egg + locked `???` mystery slots) →
  **REWARDS** (ACH-04 earn-only cosmetics + a currency drop). **OQ-005 = "hint something exists"** (mystery
  slots tease the collector).
- **B · QUEST LOG (by momentum)** — the engagement pole. **NEXT UP** in-progress milestones with prominent
  progress + reward previews front-and-centre, **EARNED** archived beneath. **OQ-005 = "invisible until
  unlocked"** (no mystery slots; an egg only appears after it fires).

## Panels (each draft renders P1–P5; lifecycle deferred to converge with a caption)
P1 self · populated · P2 empty (new user — **NON-gold** record cold-start) · P3 friend-view (**earned only** —
in-progress + hidden eggs never leak) · P4 privacy-limited (`lock-well`; honest count reads, detail withheld) ·
**P5 unlock celebration moment (ACH-06)** — the arcade takeover, the distinctive payoff.
Deferred to converge: **Skeleton · LoadError ("Signal Lost"+RETRY) · Offline** (read-from-cache, SYS-10) —
reuse the §1.8 sibling grammar verbatim.

## New components (FORM is each draft's; NAMES ratified at converge)
`BadgeTile` (the achievement tile — glyph + label + earned/in-progress + progress; **the home of badge
composition**, reconciling the contributor track's drafted-then-dropped `ContribBadge`/`BadgeTile`) ·
`MysterySlot` (A only — the locked `???` egg) · `ProgressMeter` (the in-progress bar) · `RewardChip` (the
ACH-04 payout readout; marks `EARN-ONLY` achievement-exclusive cosmetics) · `CelebrationMoment` (the ACH-06
takeover).

## Flags for the owner gate (don't silently decide)
1. **OQ-005** — egg presentation differs by draft (A = `???` mystery slot · B = invisible). **Pick a draft =
   pick the OQ-005 answer.**
2. **Badge-gold reconcile (F-02)** — earned badges rendered **NON-gold** (orange `--scr-accent`) per F-02
   (earned ≠ acquisitive). BUT the **Friends** board carries an owner-ratified `.achv` **gold** achievement
   glyph, and the contributor track punted this here. **Owner to ratify one way** across Friends + Achievements
   + (future) Profile teaser. *(The only gold on these boards: the Store nav key + the PIXELS `◆` currency mark
   on a reward chip — the currency glyph is gold everywhere, F-02; ACH-04 grants currency.)*
3. **API payload** — `GET /me/achievements` etc. are **prose-only** in the contract; the drafts render a
   **proposed** shape (milestone+progress · egg-visibility · reward badge/currency/cosmetic · unlocked-at). The
   **page-audit + the OQ to enumerate it is owed at converge** (the Contributor/Compare precedent). Not fixed
   this pass.

## Burt (DS compliance)
- **Draft A · Trophy Case — PASS ✅** (0 blocker / 0 major). F-06 type scale clean (21/15/11/9), F-07 square
  on-screen chrome, F-08 one-font, F-03 flat Scanline keycaps, shell NavBand physical (PROFILE active). Earned
  badges non-gold (flag #2). Gold limited to the Store nav key + the PIXELS `◆` currency mark (reward chip).
- **Draft B · Quest Log — PASS ✅** (0 blocker / 0 major). Same foundation: F-06 clean (21/15/11/9),
  F-07 square chrome, F-08 one-font, F-03 flat Scanline keycaps, shell NavBand physical (PROFILE active).
  Earned/quest glyphs non-gold (flag #2). Gold limited to the Store nav key + the PIXELS `◆` currency mark
  (quest PRIZE preview + reward recap).

## Verified (headless render walk)
Both drafts walked panel-by-panel in the browser (every P1–P5, inner-scroll sections included). All five
artboards render per intent; the QuestRow momentum layout (B) and the trophy-grid + `???` mystery slots (A)
both confirmed; the ACH-06 celebration takeover renders on both. No PNG artifacts committed (HTML-only).
