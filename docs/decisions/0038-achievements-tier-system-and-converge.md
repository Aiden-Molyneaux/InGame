# 0038 — Achievements (4.10) tier system + converge formalization

- **Date:** 2026-06-28
- **Status:** accepted
- **Related IDs:** **ACH-09** (new — presentation `tier`) · ACH-01/03/04/05/06 (definition · visibility · reward · showcase · celebration) · `BadgeTile`/`MysterySlot`/`ProgressMeter`/`RewardChip`/`TierLegend`/`AchievementSheet`/`CelebrationMoment` · §1.5 Achievements set · §2.19 Achievements (design-spec) · F-02 + F-05 carve-outs (Catalog v0.11) · PROF-03/PROF-05 (privacy / friend-view) · COSM-04/ECON-05 (earned cosmetics) · OQ-004 (content)
- **Closes:** **OQ-082** (the achievement-tier ripple — `tier` data model · F-02/F-05 carve-out wording · node-detail fields · API page-audit) · **OQ-005** (hidden easter-egg presentation → **pole A**, the `???` mystery slot)
- **Source:** owner sign-off, 2026-06-27 (the 3-tier direction + gate pick **A · Trophy Case**) → converge `achievements/achievements-states.html` (2026-06-27) → owner ratification of the formalization items (2026-06-28); this records the behaviour/shape decisions and ratifies the spec ripple.

## Context
The §4.10 Achievements board converged design-side as `achievements/achievements-states.html` — the owner picked **draft A · Trophy Case (by status)** and asked for a **VIEW ALL** per section. During the design pass the owner introduced a **3-tier colour system** (PRESTIGE / STANDARD / SECRET) and made the badge tiles **uniform** (glyph + label), pushing the criterion / reward / earned-date into a **node-detail bottom sheet** on tap. Those directions were drawn on the board but never reached the owning docs; convergence parked the ripple at **OQ-082**, and the egg-presentation question **OQ-005** was design-resolved (pole A) but not recorded.

A converge-review of the board (2026-06-28) also found the **P5 `CelebrationMoment` CSS had been dropped during the fold** (the marquee ACH-06 state rendered unstyled) — fixed presentation-side (ported from the source draft, render-verified, Burt PASS) ahead of this formalization; no spec change from that fix.

This pass rules the tier data model, the two Foundation-Rule carve-outs, the node-detail enumeration, and the API page-audit, and formalizes the board.

## Decision

### ACH-09 — the presentation `tier` (new, P1)
Every achievement definition carries a **`tier ∈ { prestige, standard, secret }`** — a **non-functional** prestige/visibility signal the client themes by:
- **PRESTIGE = gold** (`brand.gold`) — rare/marquee.
- **STANDARD = the screen-theme accent** (`scr.accent`) — the default; it **re-themes with the screen theme** (DEV-04) on purpose.
- **SECRET = magenta** (`brand.secret`/`scr.secret` `#e85ad0`) — the easter-egg signal; **theme-invariant** (does not re-theme).

The tier does **not** affect trigger or reward logic (ACH-01/02/04 unchanged). **Which** tier each definition wears is **content** (OQ-004) — illustrative on the board. `secret`-tier definitions **are** the easter eggs of ACH-03.

### OQ-005 — egg presentation = pole A (the `???` mystery slot)
By picking draft A and converging, the owner chose **pole A**: hidden eggs are shown as a locked **`???` mystery slot** that *hints something exists* without revealing identity (the `MysterySlot`), rather than being fully invisible. A locked secret's detail sheet (D3) is deliberately **sealed** — no criterion, reward, or date — so the mystery isn't spoiled. Recorded in ACH-09.

### F-02 carve-out — gold also = achievement PRESTIGE (non-acquisitive)
F-02 (gold = *acquisitive*) is amended: gold **also** marks the **PRESTIGE achievement tier** — a non-acquisitive prestige glyph (no step). This is the **single blessed gold-as-achievement convention** across **Friends** (the inherited `.achv` glyph), **Achievements**, and the **future Profile achievements teaser** — **resolving the long-standing badge-gold cross-screen flag** (previously a Burt owner-ratification item on each board). Amended in the Catalog (v0.11) + design-spec (`brand.gold` use note).

### F-05 carve-out — on-screen magenta for the SECRET tier
F-05 reserves the pink family for **shell LEDs** (round, lit). The SECRET tier puts a **flat magenta on the screen** (`scr.secret` `#e85ad0`) — a named exception: shell LEDs stay round/pink; the secret-tier marker is square, flat screen chrome, a distinct hue from the `brand.accent` LED. The token is defined (`brand.secret`/`scr.secret`) and the rule amended in the Catalog (v0.11) + design-spec (§1.1).

### Node-detail + uniform tiles (presentation; design-spec §2.19)
Earned tiles are **uniform** (glyph + label only — the old mixed "EARNED / REWARD / 50 GAMES" sub-text dropped). Tapping any node opens the **`AchievementSheet`** bottom sheet (the summoned-drawer grammar) holding **tier · title · description/criterion · reward (+`earnOnly`) · `unlockedAt`-or-progress** — three forms: **D1** earned + reward · **D2** in-progress (criterion + progress + prize preview) · **D3** locked secret (sealed). No new product-spec ID — the underlying data (progress ACH-03, reward + `earnOnly` ACH-04, showcase ACH-05) already exists; this is presentation + the API enumeration below.

## API ripple (api-contract 0.36)
The three prose-only rows are **enumerated** (no new endpoints):
- **`GET /achievements`** — definitions `[{ id, key, name, description, criterion, tier (ACH-09), kind: milestone|secret, reward { badge, pixels?, cosmetic?: { assetId, earnOnly } } }]`; **`secret`-kind defs the caller hasn't unlocked are masked** → `{ id, kind: secret, tier: secret, locked: true }` (the `???` slot, OQ-005 pole A).
- **`GET /me/achievements`** — `{ summary { earned, inProgress, secretsFound, secretsTotal }, earned[{ …def, unlockedAt }], inProgress[{ …def, progress { current, target, unit } }], secrets { found[…], lockedCount } }`. The node-detail sheet + the VIEW ALL lists read from these arrays — **bounded, no cursor** (unlike Contributor cards/games).
- **`GET /users/:id/achievements`** — **earned-only**, privacy-honored (PROF-03/PROF-05): friend-visible → `{ summary { earned }, earned[{ id, name, tier, glyph, unlockedAt }] }` (no in-progress, no secret-existence leak); non-friend/hidden → `{ summary { earned }, locked: true }` (honest headline count only); blocked → unavailable (SOC-09).
- Unlocks stay **server-side**; the **ACH-06 celebration is push-driven** (NOTIF-01) off the unlock event — no dedicated endpoint.

## Rationale / alternatives
- **A flat "all badges one colour"** — rejected: the owner wanted prestige legible at a glance; three tiers ("simple but rewarding") give a free prestige axis with no level/XP system (which ACH-03/05 forbid).
- **STANDARD as a fixed colour** — rejected for `scr.accent`, so the default tier **re-themes** with the screen theme (DEV-04) and Achievements reads as the same app under any theme; only SECRET is fixed (the egg signal must be unmistakable).
- **Egg pole B (fully invisible until unlocked)** — rejected by the owner's pick of draft A: the `???` slot teases the collector (the completionist pole) without spoiling identity; the sealed D3 keeps the surprise.
- **Per-tile sub-text (the pre-converge tiles)** — rejected: mixed sub-text was noisy and inconsistent across earned/in-progress/secret; uniform tiles + a detail sheet is the one grammar (kin to the app's other summoned drawers).
- **Minting node-detail/uniform-tile IDs in product-spec** — rejected: it's presentation over existing data (ACH-03/04/05); only the genuinely-new `tier` earns an ID (ACH-09).
- **Enumerating a separate VIEW-ALL / detail endpoint** (the Contributor precedent) — rejected: achievement lists are **bounded** (a user has tens, not thousands), so the full arrays ride `/me/achievements` and the VIEW ALL + node-detail render client-side — no cursor.

## Follow-ups
- **Achievement content** (which milestones/eggs, their triggers, rewards, **and tier assignments**) stays **OQ-004** — a dedicated brainstorm when the engine is built; everything on the board is illustrative.
- The **future Profile achievements teaser** should wear the same gold-PRESTIGE convention when designed (now the blessed cross-screen rule).
- The **Friends `.achv` glyph** is retroactively covered by the F-02 PRESTIGE carve-out (was a per-board owner-ratification); no board edit required.
