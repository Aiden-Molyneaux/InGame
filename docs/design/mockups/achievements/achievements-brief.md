# Achievements (§4.10) — design-track kickoff: TWO drafts → gate (do **not** converge)

The **§4.10 Achievements** design track — the **general pride / payoff surface** (`ACH-03/05`), reached
**from Profile only** (the `ACHIEVEMENTS` gateway teaser/link, ui-design-req §3.5; ACH-05). This file is the
plan; the gate ruling is appended at the bottom once the owner picks. Self-brief sources: product-spec §5.15
(`ACH-01..08` · the achievement system) + `COSM-04`/`ECON-05` (earned cosmetics delivered via ACH-04) +
`PROF-03` (privacy) · ui-design-req §4.10 (+ §3.5 Profile gateway seam) · api-contract Achievements section
(`GET /achievements` · `/me/achievements` · `/users/:id/achievements`) · design-spec §2.2 (Profile — the
sibling this hangs off) + §2.16 (Contributor profile — the converged sibling pride surface) · SCREEN-STATUS
row 4.10 (⬜ → 🔶 in-pass this pass).

A **novel pride surface** (sibling to the converged Contributor profile) with no single screen to *extend* — so
it kicks off as **distinct organizing models → owner gate → converge** (do **not** converge in this pass).
**Owner ruling at kickoff (2026-06-27):** build **TWO** drafts (A · Trophy Case · B · Quest Log) — the brief's
draft-C "Showcase" pole was undefined and the owner chose to drop it.

**Design-side only.** §5.15 behavior (ACH-01..08) is fully specified; the drafts render the **page**, never the
behavior. Any shape/behavior gap → an append to `docs/open-questions.md` (the achievements payload shape is the
one already in view — see API below). The spec is never hand-patched. Achievement **content** (which
milestones/eggs/badges/rewards) is **deferred — OQ-004**; everything here is **illustrative sample data,
caption-marked**.

## The screen (the contract — ui-design-req §4.10 · ACH-03/05)
**Purpose:** *"your achievements."* Reached from **Profile only**; **friend-viewable** (earned ones only).
**Must host** (verbatim, §4.10):

- earned + in-progress **milestones** (`ACH-03` — milestone = visible + shows progress, e.g. "7/10 games")
- **easter eggs** (`ACH-03` — hidden until unlocked; **presentation per `OQ-005`** — *the* central design question
  for this screen)
- **reward badges** (`ACH-04` — a badge/clout default, + optionally **Customizer currency** and/or a **cosmetic
  entitlement**, including **achievement-exclusive** cosmetics that are *earnable only, never purchasable* — prestige)

**States (§4.10):** self vs friend-view · **unlock celebration moment** (`ACH-06`).

## Scope the SCREEN — don't redraw the neighbours
This track draws **Achievements** only. **Profile (§3.5, converged)** is the *entry* — drawn only as the
back-seam (`‹ RETURN TO PROFILE` self · `‹ RETURN TO <name>` friend), **not** redrawn. **Contributor profile
(§4.9, converged)** is the *sibling* pride surface (catalog/card contributions, CAT-07); Achievements shows
**general** achievements (ACH-) — the two stay distinct (both hang off Profile). The Store (§3.4) is where a
cosmetic is *equipped/used* — a reward chip is a **readout**, not the Store.

## API shape already drafted (🔶 — page-audit comes at converge)
Three endpoints back the screen (api-contract Achievements section, prose-only): **`GET /achievements`**
(*visible defs + progress hints; eggs hidden or shown as a locked "???" per design, OQ-005, ACH-03*) ·
**`GET /me/achievements`** (*caller's unlocks + progress, ACH-02/05*) · **`GET /users/:id/achievements`**
(*a user's showcased achievements, privacy-honored, ACH-05/PROF-03*). Unlocks are **server-side only** (event
engine) — there is **no client "unlock" call**; the celebration moment (P5) is a **push/notification-driven
takeover**, not a user action.

**Central contract gap (flagged, not fixed):** the endpoints are **prose-only — no payload enumerated** (no
milestone-with-progress, egg-visibility, reward (badge/currency/cosmetic), or unlocked-at shape). The drafts
render a **proposed** shape; the **API page-audit + the OQ to enumerate it is owed at converge** (the
Contributor/Compare precedent — OQ-079/OQ-074 deferred their page-audit the same way). No new endpoint is minted.

## The F-02 gold nuance — this is mostly a RECORD, so default NO gold (read carefully)
Achievements is a **pride/record/payoff** surface: **viewing** your badges, progress, and eggs creates no card
and spends nothing → **no gold** on the body. F-02 (clarified 2026-06-23): *gold = acquisitive (card-creating ·
PIXELS economy · primary add-to-collection); orange = prominent non-acquisitive*.

- **EARNED reward badges = earned glyphs, NOT acquisitive** → render **non-gold** (cream/orange accent) per the
  F-02-clarified letter. **⚠ FLAG (the one to ratify):** the **Friends** board carries an inherited `.achv`
  **gold-as-achievement glyph** (owner-ratified *there*), and the Contributor track **punted this exact
  question to here** (its badges were ultimately dropped). Whether earned achievement badges wear gold is a
  **live cross-screen question** — render **non-gold**, surface it at the Burt gate for the owner to ratify one
  way across **Friends + Achievements + (future) Profile teaser**. *(This screen is the real home of badge
  composition — the contributor track drafted then dropped `ContribBadge`/`BadgeTile`; reconciled here as the
  `BadgeTile`.)*
- **EMPTY state (new user)** — most of this surface is a RECORD you fill by *playing elsewhere* (you don't
  "buy" or "add" an achievement here), so the cold-start is **NON-gold** (a friendly explainer, not a gold
  acquisitive hook). A quiet orange/cream nudge at most. *(Contrast the Contributor empty, which IS gold —
  there the cold-start actions ADD-A-GAME / DESIGN-A-CARD are themselves acquisitive.)*
- **Reward chips** — a currency payout shows the **gold PIXELS `◆` currency mark** (the currency glyph is gold
  everywhere, F-02); the chip itself is a panel **readout**, not an acquisitive button. Cosmetic-reward chips =
  orange/cream accent.

## Privacy is a first-class state (PROF-03)
The friend-view runs **only over the friend-visible field set** = **earned** achievements only (ui-design-req
§4.10 "friend-viewable (earned ones)"). **In-progress milestones and hidden eggs do NOT leak** to friends — a
friend never sees what you're *working toward* or that a `???` slot exists. A **privacy-limited** non-friend
view **locks the detail** (`lock-well` grammar, borrowed verbatim from `profile-states.html` / the converged
contributor board), while **honest headline counts** may still read ("12 ACHIEVEMENTS EARNED"); the hidden
detail **never leaks**. **Block (SOC-09)** severs the view (the Profile gateway seam disappears).

## The new components (the headline; FORM is each draft's, NAMES locked at converge)
No achievement component exists in the catalog — these are **new compositions** built from catalog furniture,
names ratified at converge:

- **`BadgeTile`** — **one achievement**: a **glyph + label + state** (earned / in-progress) + optional
  **progress** ("7/10 GAMES" + a bar). **THE home of badge composition** — reconciles the Contributor track's
  drafted-then-dropped `ContribBadge`/`BadgeTile`. Earned = lit (non-gold accent, see flag); in-progress =
  dim + bar; **milestone** type. Built in both drafts; name ratified at converge.
- **`MysterySlot`** (Draft A only) — a **locked easter-egg slot**: a sealed `???` tile that **hints something
  exists** without revealing identity (OQ-005 = pole A). Draft B has **no** mystery slot (eggs invisible).
- **`ProgressMeter`** — the in-progress milestone bar ("5/25", a flat segmented/filled bar; non-gold).
- **`RewardChip`** — the **ACH-04 payout** readout: currency (gold `◆` + amount) and/or **cosmetic** (orange/
  cream "EXCLUSIVE: …"). Marks **achievement-exclusive** earn-only items distinctly (a `EARN-ONLY` tag).
- **`CelebrationMoment`** — the **ACH-06** in-app **arcade celebration takeover** (P5): a full-screen energized
  overlay — "ACHIEVEMENT UNLOCKED", the badge in a spotlight, reward chips, a CONTINUE keycap. The distinctive
  on-brand payoff; each draft renders its own consistent with its aesthetic.

**Reuse (don't reinvent):** `Avatar` (square monogram, PROF-08) · `GameCard` sizes (F-01, where a card-art
reward/showcase appears) · `StatTile` (the headline counts) · `ListRow`/`Strip` · `SectionHeader`
(+`TertiaryLink`) · flat `KeycapButton`/`ToolKeycap` (Scanline Energize) · the `StateMark` (orange
pixel-square) · the `.return-link` (friend-view back-seam) · the `lock-well` privacy grammar · `DeviceShell` +
`NavBand` (**PROFILE active** — this is a Profile sub-surface, no Achievements nav key) · the §1.6 lifecycle.

## The two models (different way to ORGANIZE the collection + a different OQ-005 answer)
The distinctness axis is **how the achievement collection is organized** AND **a different easter-egg
presentation** — so the owner picks the **OQ-005 answer by picking a direction**. Both sit on the **same
inherited foundation** (Teal shell · Midnight screen · flat keycaps · F-06 · §1.8 lifecycle) so Achievements
reads as the same app, a clear Profile sibling.

- **A · TROPHY CASE (by status)** — [`achievements-draft-a-trophycase.html`](achievements-draft-a-trophycase.html).
  The **completionist** pole. A headline count row → an **EARNED** trophy grid (the case — lit `BadgeTile`s,
  the hero) → **IN PROGRESS** milestones with bars below → a **SECRETS** section of locked **`???` mystery
  slots** (+ the one unlocked egg, revealed) → **REWARDS** (the earned achievement-exclusive cosmetics). The
  organizing principle is **status** (what you've got vs. what's left). **OQ-005 = "hint something exists"** —
  eggs are visible-as-mystery `???` slots, teasing the collector.
- **B · QUEST LOG (by momentum)** — [`achievements-draft-b-questlog.html`](achievements-draft-b-questlog.html).
  The **engagement** pole. **NEXT UP** front-and-centre — the in-progress milestones with prominent
  progress bars + their **reward preview** (what you'll win), ordered closest-first → **EARNED** archived
  beneath (compact). Easter eggs are **FULLY HIDDEN** — no mystery slots, no count of unknowns; an egg only
  ever appears **after** it unlocks (as a pleasant surprise in the earned archive). The organizing principle is
  **momentum** (what to do next). **OQ-005 = "invisible until unlocked"** — pure surprise.

## Panel contract (each draft renders P1–P5; lifecycle deferred to converge WITH a caption note)
- **P1 — SELF, POPULATED (the model thesis):** earned + in-progress + eggs, organized per the model + the
  rewards. This panel *is* the model's argument.
- **P2 — EMPTY (new user, nothing earned):** a friendly cold-start, **NOT a dead end** — a quiet explainer
  ("achievements unlock as you play, collect, and connect"); **NON-gold** (the surface is a record, the
  earning happens elsewhere). A calm orange/cream nudge at most.
- **P3 — FRIEND-VIEW (PROF-05):** a friend's (**Riko**) **EARNED** achievements only — read-only, the
  `‹ RETURN TO RIKO` back-seam; **in-progress + hidden eggs do NOT leak** (no bars, no `???`).
- **P4 — PRIVACY-LIMITED (PROF-03):** a non-friend / restricted view — the detail locked (`lock-well`), the
  **honest headline count** still readable; hidden detail **never leaks**.
- **P5 — UNLOCK CELEBRATION MOMENT (ACH-06):** the distinctive **arcade celebration takeover** when an
  achievement fires — the on-brand payoff. The state that makes this screen special.

**Deferred to converge (caption it):** **Skeleton** (§1.6 solid fills) · **LoadError** ("Signal Lost" + RETRY) ·
**Offline** (read-from-cache, read-only — SYS-10) — reuse the sibling §1.8 grammar verbatim.

## Buttons + marker — the LOCKED flat style (Scanline Energize · F-03, 2026-06-18)
Build **FLAT** — no raised edge, no press-travel. Pressed/active = **Scanline Energize** (CRT scanlines over a
hairline-darkened fill, no motion), isolated to a single `.btn:active` rule. The on-screen marker = the
**orange `StateMark`** pixel-square (`--scr-accent` `#ff9f43`), never the pink shell LED (F-05/F-09). Shell
`NavBand` keys stay **physical** (`0 4px 0`); **PROFILE active**. Source grammar: the converged
`contributor-profile/contributor-states.html` + `profile/profile-states.html`. *(The celebration takeover may
use the scanline texture decoratively — that's the arcade payoff, consistent with F-03's energize idiom.)*

## Hard rules (carried from the profile / social cluster)
- **Compose from the §1.5 catalog** — reuse the listed components; the genuinely-new ones (`BadgeTile`,
  `MysterySlot`, `ProgressMeter`, `RewardChip`, `CelebrationMoment`) are built and flagged at the gate.
- **Tokens + shell + fonts inherited verbatim** from Profile (Teal shell `#2bb6b0` · Midnight screen `#232045`;
  Chakra Petch on screen / Paytone One on plastic, F-08); Google Fonts via the `media="print"` onload pattern;
  built-in SVG only — no external assets.
- **F-06 type scale is law on screen — 21/15/11/9** (display/emphasis/body/micro). Card plates are print and
  scale with the card (exempt). Audit actual px, not just font families.
- **HTML only — no PNG artifacts.** Verify each draft in headless Edge, READ the render, walk every panel,
  **delete every screenshot before the turn ends**.
- **Burt-clean gate:** after building each draft, run the `burt` skill, apply fixes, re-run until clean (or only
  deliberate documented deviations remain — incl. the badge-gold + API-payload flags) — *before* presenting.
- **NO XP/level system anywhere** (ACH-03/05 are badges, not levels).

## Sample data (consistent across both drafts; caption-marked illustrative — content is OQ-004)
Self = **Maverick**, friend = **Riko** (matching the Compare/Friends/Contributor boards).

- **EARNED milestones:** **COLLECTOR** (50 games) · **FIRST PUBLISH** (published your first card) · **ADOPTED
  100×** (your card equipped by 100 players — carries an achievement-exclusive cosmetic reward).
- **IN-PROGRESS milestones (with bars):** **PROLIFIC** (5/25 games) · **SOCIAL** (3/10 friends) · **CURATOR**
  (2/5 cards designed).
- **EASTER EGGS (2–3):** **NIGHT OWL** (UNLOCKED — opened InGame after 3am; shown revealed w/ a surprise) +
  **2 hidden** (Draft A = `???` mystery slots · Draft B = invisible, absent).
- **REWARDS (ACH-04 earn-only prestige):** **GOLD-FOIL FRAME** (from ADOPTED 100×, achievement-exclusive
  cosmetic — `EARN-ONLY`) · **+50 `◆` PIXELS** (from COLLECTOR) · **SCANLINE FINISH** (from NIGHT OWL,
  earn-only cosmetic). **No level / no XP.**
- **Headline counts:** Maverick — **8 EARNED · 3 IN PROGRESS · 1/3 SECRETS** found. Friend (Riko): **5 earned**.
  All counts **caption-marked illustrative** (content = OQ-004).

## Surface these at the Burt gate (don't silently decide them)
1. **OQ-005** — which easter-egg presentation each draft uses (A = `???` mystery slot · B = invisible);
   recommend the owner pick one by picking a direction.
2. **Badge-gold reconcile (F-02)** — earned badges rendered **non-gold**; flag for owner ratification one way
   across **Friends `.achv` (gold) + Achievements + (future) Profile teaser**.
3. **API payload** — `GET /me/achievements` etc. are **prose-only**; the drafts render a **proposed** shape; the
   page-audit + OQ to enumerate it is **owed at converge** (don't fix the contract this pass).

## Scope / git
- Create **only** under `docs/design/mockups/achievements/`; read from `mockups/profile/`,
  `mockups/contributor-profile/`, `mockups/friends/` (the `.achv` precedent). Edit **only** SCREEN-STATUS row
  4.10 this pass; **append-only** to open-questions (none likely until converge). Personal account
  `Aiden-Molyneaux`, HTTPS, identity set — don't override; **commit immediately staging only own paths**
  (concurrent tracks may be live — don't get swept); `git pull --rebase` before every push; commit messages
  name the IDs.

## File map
`docs/design/mockups/achievements/`
- `achievements-brief.md` — this plan
- `achievements-draft-a-trophycase.html` — **A · Trophy Case (by status; eggs = `???` mystery slots)**
- `achievements-draft-b-questlog.html` — **B · Quest Log (by momentum; eggs = invisible until unlocked)**
- `README.md` — the file map + flags + Burt outcome
- Converge target (later): `achievements-states.html` (full matrix incl. lifecycle)

## Process
1. Author this brief → commit (stage only own paths). Flip SCREEN-STATUS row 4.10 (⬜ → 🔶 in-pass).
2. Per draft (A, then B): build → **run Burt** → iterate to clean → verify headless (delete shots) → README
   row → commit (`design: Achievements draft A/B — P1–P5 (achievements track); Burt clean`) → `pull --rebase`
   → push.
3. **Owner gate — STOP.** Summarize each model + how it organizes the collection + its OQ-005 answer + the
   celebration treatment + the per-draft Burt outcome + the badge-gold question; the owner opens the HTML
   directly and picks. **Do not converge** — converge + design-spec formalization + the API page-audit/OQ is
   the **next pass after the pick**.
