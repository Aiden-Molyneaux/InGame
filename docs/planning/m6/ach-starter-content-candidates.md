# ACH starter content — the §0.4 candidate sheet (owner taste pass)

> **What this is.** Fable's pre-proposed candidates for the M6 starter achievement/easter-egg set
> ([m6-build-task §0.4](../m6-build-task.md)) — the 0075-roster-sitting pattern: the owner reacts to
> a sheet, doesn't author from blank. **Pick ~12 milestones + ~6 eggs, adjust names/numbers freely.**
> Filed 2026-07-16. The picks land in the P6c SYS-04-style seed; everything here is tunable post-ship
> without an app release (ACH-01) — that's the whole point of the beta egg-recommendation loop.
>
> **Grounding:** criteria reference the REAL event registry (`packages/shared/src/events/registry.ts`)
> — signals that exist today are marked ✅; signals P1/P4/P5 add this milestone are marked **M6**.
> The §5.15 design rule is applied throughout: **prestige keys only off signals a user can't
> self-inflate** (others' adoptions, contributor reach, friendships); self-reported status (beaten/
> hours) stays standard-tier, badge-only. Reward posture: modest PX (the 0074 economy earns +1..+6
> daily; a whole starter set totalling ~30–40 PX ≈ one showpiece component — meaningful, not
> inflationary). **Earn-only cosmetic slots ship config-EMPTY** (the P11 newcomer-slot no-op
> pattern) until the 0075 pre-launch content pass authors the exclusive art — the slot is wired,
> the art is later.

## A — Milestone candidates (visible, show progress · ACH-03)

| # | Name (arcade voice) | Criterion (event · threshold) | Tier | Reward | Notes |
|---|---|---|---|---|---|
| A1 | **FIRST PRINT** | `card.published` ✅ ≥ 1 | standard | badge + 2 PX | the publish ritual's payoff echo; also the NOTIF-04 priming moment later (M7) |
| A2 | **PRESS OPERATOR** | `card.published` ✅ ≥ 5 | standard | badge + 3 PX | |
| A3 | **SHELF STARTER** | `collection.entry_added` ✅ ≥ 5 | standard | badge + 2 PX | fires for most users during onboarding-era adds |
| A4 | **THE ARCHIVE** | `collection.entry_added` ✅ ≥ 25 | standard | badge + 3 PX | |
| A5 | **PLAYER TWO** | `social.friend_added` **M6** ≥ 1 | standard | badge + 2 PX | the beta cohort earns this day one — deliberate |
| A6 | **FULL LOBBY** | `social.friend_added` **M6** ≥ 5 | standard | badge + 3 PX | |
| A7 | **GOOD TASTE** | `card.adopted` (as adopter) ✅ ≥ 1 | standard | badge + 1 PX | |
| A8 | **CARD SHARK** | `card.adopted` (as adopter) ✅ ≥ 5 | standard | badge + 2 PX | |
| A9 | **CONTRIBUTOR** | `catalog.game_created` ✅ ≥ 1 | standard | badge + 2 PX | CAT-05 credit made ceremonial |
| A10 | **LADDER GRADUATE** | `wallet.daily_claimed` ✅ lifetime ≥ 7 | standard | badge | the 0074 ladder already pays PX — badge-only avoids double-paying |
| A11 | **CURATED TEN** | Top-10 reaches 10 items **M6** | standard | badge + 2 PX | nudges the P10 surface |
| A12 | **BEATEN PATH** | `collection.entry_updated` → status `beaten` ✅ ≥ 10 | standard | **badge only** | self-reported (§5.15 rule) — never PX, never prestige |
| A13 | **FIRST ADOPTION** | `card.adopted` where **designer = you** ✅ ≥ 1 | **prestige** | badge + 5 PX | the marquee moment — someone chose YOUR work |
| A14 | **HOUSE STYLE** | adoptions across your designs ✅ ≥ 10 | **prestige** | badge + 10 PX + **cosmetic slot (empty)** | the flex; gold PRESTIGE render (ACH-09) |
| A15 | **CORNERSTONE** | a game you contributed reaches 10 collections ✅ (aggregate over others' `entry_added`) | **prestige** | badge + 5 PX | contributor reach — can't self-inflate |

*Cut-to-12 suggestion if the owner wants exactly 12: drop A4, A8, A11 (the mid-ladder duplicates).*

## B — Easter-egg candidates (hidden `???` until unlocked · secret tier, magenta · ACH-03/09)

| # | Name | Criterion (event · condition) | Reward | Notes |
|---|---|---|---|---|
| B1 | **NEAT FREAK** | `collection.reordered` ✅ ≥ 10 lifetime | badge + 2 PX | rewards a behavior nobody expects to be watched |
| B2 | **IDENTITY CRISIS** | `device.updated` ✅ ≥ 5 within one UTC day | badge + 2 PX | shell/theme churn as a joke |
| B3 | **RENAISSANCE** | `card.saved_private`/`card.published` ✅ across ≥ 5 distinct games | badge + 3 PX | breadth of design |
| B4 | **PATRON OF THE ARTS** | `card.adopted` ✅ from ≥ 5 distinct designers | badge + 3 PX | the community-taste egg |
| B5 | **COMMITTED** | one entry's hours ≥ 100 (`collection.entry_updated` ✅) | badge | self-reported → badge-only |
| B6 | **NIGHT SHIFT** | `wallet.daily_claimed` ✅ in the 03:00–05:00 server hour | badge + 1 PX | dumb, delightful, cheap |
| B7 | **STRAWBERRY HUNTER** *(entity-target demo, ACH-07)* | `collection.entry_added` ✅ targeting one owner-picked catalog game | badge + 2 PX | proves the ACH-07 mechanism the beta's egg ideas will use — owner picks the game at the sitting |
| B8 | **THE REGIFTER** | recommend a game (**M6** `recommendation.sent`) that the friend then adds | badge + 3 PX | two-actor egg; exercises the P4 thread |

*Cut-to-6 suggestion: drop B5 (weakest) and one of B1/B2.*

## C — What the sitting decides
1. The **picks** (~12 + ~6) + any renames (names are seed strings — free to change forever).
2. The **PX numbers** (G-K async covers later tuning; these are the launch values).
3. The **B7 target game** (the ACH-07 demonstration egg).
4. Whether **A14's cosmetic slot** waits for the 0075 content pass (recommended) or gets an interim
   pick from the existing premium roster (works today, but spends store inventory on prestige —
   ACH-04 prefers exclusive-earnable art).
5. The **beta egg-recommendation loop** blessing: a friend's egg idea → a seed edit + deploy, no
   release — the standing invitation goes in the P16 welcome note.
