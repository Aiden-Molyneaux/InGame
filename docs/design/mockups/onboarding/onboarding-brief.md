# Onboarding (4.14) — first-pass states board brief

> **Screen:** 4.14 Onboarding · **Status:** REVISED (owner-feedback pass — for owner review)
> **Files:** `onboarding-states.html` (the board) · this brief
> **IDs delivered:** `AUTH-06` (guided quick-start) · `NOTIF-04` (push pre-prompt priming) ·
> `CAT-09` (collections-count "popular" rail seeding the adds) · `COL-01`/`COL-02` (add games +
> status) · the defining constraint: **never land the user on an empty collection.**

---

## The defining constraint (the whole job)

Onboarding exists for **one reason**: a brand-new account's Collection — the app's home tab — would
otherwise be empty, and an empty home is the worst first impression a low-frequency, showcase-first
app can make (design-req §1.7 "no empty states left dead"). So onboarding is **not** a marketing
carousel; it is a **guided seeding** that ends by depositing the user onto a Collection that already
holds games, already has a Now-Playing hero, already looks like *theirs*. Everything else
(genre, the card teaser, the push ask) is secondary and **every step is skippable**.

Design consequences that fall straight out of that:
- **Light + skippable throughout.** A persistent SKIP affordance on every step (`TertiaryLink/dim`),
  plus per-step skips on the optional moments. Onboarding must never feel like a wall.
- **The finale is the *real* Collection home** — reproduced verbatim from `collection-states.html`
  grid mode: the C5 GameCard grid, the Now-Playing hero (WTP-03 / PROF-07 stats), and the **full
  browse/tools bar** (grip · search · sort A–Z↑ +StateMark · filter ALL · view-mode +StateMark ·
  ADD), **not** a congratulations screen or an approximation. The reward *is* the populated shelf.
  A short banner rides the top, then dissolves. (Owner change, 2026-06-24 — the finale must look
  like the genuine Collection screen.)
- **A graceful zero-add fallback — a friendly push to add, NOT an auto-seed.** If the user skips
  every add they land on the Collection board's **inviting empty** verbatim: the dashed ghost-card
  doorway, a warm headline, the gold **ADD GAMES** keycap routing back into the add step / catalog,
  and the **POPULAR FIRST ADDS** suggestion row + BE-THE-FIRST hook. **No seed, no "surprise me"** —
  a skip-everything user may land on an empty-but-friendly Collection that gently pushes them to add.
  (Owner ruling, 2026-06-24 — resolves OQ-B; SURPRISE ME / seed-a-starter dropped entirely.)

## Interaction direction — "a guided FlowTakeover, the Collection growing underneath it"

Onboarding is a **`FlowTakeover`** (decision 0014 tier-2 spatial pattern): the device frame + the
plastic `NavBand` **stay put** the whole time (the user is already "in" their device — F-04), and the
screen content is the guided flow. This matches Add Game's grammar exactly (its `FlowHeader` ✕/◂ +
title + the bottom-docked `SearchField`), so the seams between "onboard → add a game → land on
collection" are invisible.

A slim **step rail** under the FlowHeader (`STEP n / 4` + dot ticks, the Add Game `fan-nav` dot
idiom reused) tells the user the flow is short and bounded — the antidote to onboarding dread. The
header carries a persistent **SKIP** on the right (dim tertiary) that jumps straight to the finale.

The four guided beats, then the close:
1. **Add a few games** — the **CAT-09 popular rail** (most-collected) as 3-up `CardFan`s + a docked
   `SearchField`, lifted verbatim from Add Game's entry. Tap a card → it's added (a +N counter in the
   header ticks); add as many as you like; ADD MORE / CONTINUE. This is the load-bearing step.
2. **Status (COL-02), lightweight** — for the games just added, an optional one-tap status per card
   (the six COL-02 chips, off-card, the Add Game P6 idiom). Defaulted to BACKLOG so skipping is free.
3. **Pick a genre (favourite genre[s])** — `GTag`-style selectable chips from the controlled genre
   list (CAT-04). Multi-select, all skippable. Tunes future Discover; PROF-01 favourite genre(s).
4. **Design-a-card teaser (optional)** — the only **gold** moment in the whole flow: ADD & DESIGN is
   a card-creating action (F-02), so it earns the gold + 2/4 step. Offers DESIGN A CARD (→ the
   Styler, deferred here) or SKIP FOR NOW. Plain game-adds in step 1 are **not** gold.
   Also folds in the **invite-a-friend nudge** (AUTH-06 requires it) as a quiet secondary row —
   non-acquisitive, so system-orange `/action-alt`, never gold.
5. **The NOTIF-04 push PRE-PROMPT** — a soft, value-framed **in-app** ask (not the OS prompt). Two
   keycaps: ENABLE (fires the OS prompt next) and NOT NOW (re-offers later, SYS-04). **Declining the
   pre-prompt must NOT fire the one-shot OS prompt** — that is the whole point of NOTIF-04, so the
   board draws *both branches explicitly*.
6. **Finale: the real Collection home** — lands on the genuine Collection screen (verbatim grid +
   Now-Playing hero + full tools bar), pre-seeded with the added games, NowTag set, with a dissolving
   "YOUR SHELF IS LIVE" banner. (Zero-add path → the friendly empty-doorway instead, see O10.)

## NOTIF-04 — drawn in full (the precious one-shot)

Per NOTIF-04, the cold OS prompt is **never** fired at launch; it is requested through an in-app
**pre-prompt** at the close of onboarding, stating the concrete payoff ("know when a friend beats
your hours / your wishlisted game drops"). The board shows:
- **The pre-prompt itself** (soft in-app sheet, value copy, two keycaps).
- **ENABLE → the OS prompt** (drawn as the native iOS permission alert riding over a dimmed screen)
  → accepted lands the finale with push on.
- **NOT NOW → the finale directly, OS prompt NEVER shown** (the one-shot stays unspent; re-offered
  later per SYS-04; a declined *OS* prompt — a different branch — gets recovery in Settings, NOTIF-02).
This is the single most important correctness detail on the board: the soft decline and the OS prompt
are wired so the precious one-shot is only spent on an explicit ENABLE.

## States drawn (artboards)

| # | Artboard | What it proves |
|---|---|---|
| O1 | **Welcome / start** | The flow's front door inside the FlowTakeover; STEP 1/4 rail; SKIP present; value line; START. |
| O2 | **Add a few games (CAT-09 popular rail)** | The load-bearing step: 3-up `CardFan` POPULAR (most-collected, CAT-09) + FRIENDS ARE PLAYING + docked `SearchField`; tap-to-add; +N header tick; COL-01. |
| O3 | **Status (COL-02), lightweight** | The just-added games get optional one-tap status — six COL-02 chips off-card; defaults BACKLOG; skippable. |
| O4 | **Pick a genre** | Controlled-list genre chips (CAT-04), multi-select selectable `GTag`s; PROF-01 favourite genre(s); skippable. |
| O5 | **Design-a-card teaser (gold)** | The lone F-02 gold step (ADD & DESIGN creates a card) + the invite-a-friend nudge (orange, non-gold) + SKIP FOR NOW. |
| O6 | **NOTIF-04 push pre-prompt** | The soft in-app ask: value copy + ENABLE / NOT NOW; this is the pre-prompt, not the OS prompt. |
| O7 | **NOTIF-04 → OS prompt (ENABLE branch)** | The native OS permission alert over a dimmed screen — only reached by ENABLE; the one-shot is spent here. |
| O8 | **NOTIF-04 → decline branch (NOT NOW)** | Explicitly: NOT NOW lands the finale, OS prompt NEVER fired; a quiet "you can turn these on in Settings" note (NOTIF-02). |
| O9 | **Finale — the real Collection** | The payoff: the *genuine* Collection home reproduced verbatim (C5 grid + Now-Playing hero WTP-03/PROF-07 + the full browse/tools bar: search · sort+StateMark · filter · view+StateMark · ADD), seeded with the added games + NowTag, "YOUR SHELF IS LIVE" dissolving banner. |
| O10 | **Zero-add fallback — friendly push to add** | If every add was skipped: the Collection inviting-empty verbatim (ghost-card doorway + warm copy + gold ADD GAMES → catalog + POPULAR FIRST ADDS row + BE-THE-FIRST hook). **No surprise-me, no auto-seed** (owner ruling, resolves OQ-B). |
| L1 | **Skeleton (loading the popular rail)** | §1.6 solid-fill skeleton in the exact fan/meta shapes (the CAT-09 rail is a read). |
| L2 | **Signal Lost + RETRY** | §1.8 dashed stepped-card + accent ! + SIGNAL LOST + orange RETRY (`/action-alt`); the rail fetch is retryable. |
| L3 | **Offline writes-gate** | SYS-10: `OfflineStrip` + calm wifi-off panel — adding is a write, so it gates; SKIP TO COLLECTION stays (your offline collection is browsable). |

Lifecycle is drawn against the **add step** specifically, because that is the only network-bound read
(the CAT-09 rail) and write (COL-01 add) in the flow — the genre/teaser/push steps are local.

## Design-system compliance notes (how the board obeys the catalog)

- **F-01** never crop a GameCard — every face on the rail + finale grid is a full `CardFan` /
  `grid-size` face, container edges clear (the reference boards' geometry reused verbatim).
  **Clipping fix (owner change, 2026-06-24):** the rotated `CardFan` neighbour cards (O1 welcome
  hero-stack, O2 popular rail) were dipping their lower corners into the text beneath; fixed by
  **reserving vertical space** (`padding-bottom` on `.welcome-hero` / `.cfan`), never by cropping —
  full faces now sit fully clear of the step-title / fan-meta lines.
- **F-02 gold = acquisitive only** — the **only** gold on the board is the design-a-card teaser's
  **ADD & DESIGN** keycap (creates a card) + the header `CountKeycap` tick (gold = value marker).
  Game-adds, CONTINUE, START, ENABLE, genre-confirm are **orange/cream KeycapButtons** — auth/onboard
  CTAs are not gold. The invite nudge is orange `/action-alt` (non-acquisitive prominent action).
- **F-03** on-screen keycaps are flat with Scanline-Energize press (the add-game flat-button block
  reused); only the shell NavBand keys travel 3D.
- **F-05 / F-09** the on-screen selection marker on the genre chips + status chips is the orange
  **`StateMark`** pixel-square (`scr.accent`), never the pink LED; selection = accent border +
  StateMark on a flat row, no sunken recess. Pink stays the shell `PipLight` only.
- **F-06** type is strictly 21 / 15 / 11 / 9 (display titles 21, step/state titles 15, body 11,
  micro caps 9). No off-scale 17/13/10.
- **F-08** Chakra Petch on screen, Paytone One on the plastic only.
- **F-07** square on-screen chrome; radius lives on the plastic shell.
- **Baseline shell:** Teal shell + Midnight screen theme; TextField = cream inset + navy ink + caret
  (F-09 named exception); system keyboard posture (OQ-035) — the docked `SearchField` rides the
  keyboard exactly as Add Game does.

## Assumptions made (running unattended — recorded per CLAUDE.md rule 1)

1. **Onboarding is a `FlowTakeover`, not a separate full-screen takeover that hides the NavBand.**
   The spec says "lands the user on a populated collection"; keeping the device chrome makes the
   land seamless and matches the Add Game grammar. (If the owner wants a more theatrical
   chrome-yielding intro, that is a breakout-tier call — flagged OQ below.)
2. **Step order:** add → status → genre → card-teaser+invite → push pre-prompt → finale. The spec
   lists the musts but not a strict order; this order front-loads the load-bearing add and ends on
   the highest-intent push moment (NOTIF-04's "close of onboarding").
3. **Status (O3) is a sub-beat of the add step, defaulted to BACKLOG**, so COL-02 is satisfied
   without forcing a decision. Could be cut into the add step itself if the owner wants fewer beats.
4. **Zero-add fallback = the Collection inviting-empty (a friendly push to add), NOT a seed.**
   Owner ruling (2026-06-24): a skip-everything user may land on an empty-but-friendly Collection
   that gently pushes them to add — no surprise-me, no auto-seed. The "never land empty" constraint
   is satisfied by a *welcoming doorway* (ghost-card + ADD GAMES + POPULAR FIRST ADDS), not by
   machine-filling the shelf. Resolves OQ-B (was: exact seed policy).
5. **The invite-a-friend nudge lives on the card-teaser step** (O5) as a quiet secondary row, rather
   than its own beat, to keep the flow to ~5 beats. AUTH-06 requires it exist; it does, just folded.
6. **Real game data** reuses the reference boards' roster (Elden Ring family, Destiny, Marathon,
   Minecraft, etc.) and the same SVG art symbols — consistent with Add Game / Collection / Discover.

## Open questions for the owner / spec (capture, don't lose — → open-questions.md)

- **OQ-A (chrome posture):** is onboarding a `FlowTakeover` (NavBand stays — drawn) or should the
  intro yield the chrome for a more cinematic welcome before settling into the flow?
- **OQ-B (zero-add seed policy): RESOLVED (owner, 2026-06-24).** A skip-everything user lands on the
  Collection **inviting-empty** — a friendly doorway that pushes them to add (ghost-card + ADD GAMES
  → catalog + POPULAR FIRST ADDS). **No seed, no "surprise me", no auto-fill.** The SURPRISE ME /
  seed-a-starter affordance is dropped from O10. (Drawn in O10; ripple to product-spec if/when the
  onboarding flow is formalized into behavior — currently design-only.)
- **OQ-C (re-offer cadence after NOT NOW):** NOTIF-04 says the declined pre-prompt re-offers later,
  cadence server-configurable (SYS-04). Where does the *next* re-offer surface (Discover notify,
  first friend action, post-publish)? Drawn as "we'll ask again later" copy only.
- **OQ-D (status sub-beat):** keep O3 as a distinct status step, or fold the COL-02 picker into the
  add card detail so the flow is one beat shorter?
- **OQ-E (resumability):** if the user backgrounds the app mid-onboarding, do we resume at the step
  or land them on whatever they've seeded so far? (Lifecycle-adjacent; not drawn.)

## Revision log

- **2026-06-24 — owner-feedback pass.** (1) **Card-over-text clipping fixed** in O1 (welcome
  hero-stack) and O2 (popular rail `CardFan`) — rotated neighbour cards were overlapping the
  step-title / fan-meta; fixed by reserving vertical space (`padding-bottom`), not by cropping (F-01).
  (2) **Finale (O9/O8) now reproduces the real Collection home faithfully** — the full browse/tools
  bar (search · sort A–Z↑ +StateMark · filter ALL · view-mode +StateMark · gold ADD), the C5 grid,
  the Now-Playing hero, lifted from `collection-states.html` grid mode (incl. the missing
  `.sk2 .chip svg` navy-ink rules + the filter chip, which the first pass had dropped). (3) **O10
  zero-add fallback** — SURPRISE ME / seed-a-starter **removed**; replaced with the Collection
  inviting-empty (friendly doorway pushing the user to add). Resolves **OQ-B**. O1 + the O6 NOTIF-04
  pre-prompt left untouched (owner-blessed).
