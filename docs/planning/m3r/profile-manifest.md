# Profile — screen manifest (R1-4)

> From `docs/design/mockups/profile/profile-states.html` (C5 v2, base artboard `:477–590`) +
> `apps/mobile/app/(tabs)/profile.tsx` + `src/components/ScreenHead.tsx`. Grounded 2026-07-04.
> **Scope filter: M3-R / R1-4** — the S5 owner-notes only. Owner verdict on the rest: *"otherwise
> reference-good"* (walkthrough §5). Elements owned by later milestones are EXPECTED(<m> · <cite>).

## The two S5 items
- **S5-a (OWED)** — the built profile is **missing the `.screen-head` "PROFILE" title band**
  (`profile-states.html:487` — a FIXED header ABOVE the scroll; `.sk2 .screen-head h2` = 21px cream
  bold, letter-spacing 3px, text-shadow). `profile.tsx` opens straight into the `ScrollView`/IdentityBlock
  (`:62–65`) with no header. **Fix:** mount the shared `ScreenHead title="Profile"` (component-map §5.4,
  the same band Collection + Add-game use) in a fixed `pad` wrapper above the scroll — mirroring the
  Collection pattern (`collection.tsx:258–263`). The EDIT/SHARE/Settings tools that also sit in that
  board region are **EXPECTED(M7)** — NOT built (walkthrough S5-a explicit).
- **S5-b (PRE — verify/confirm)** — §0.8 rules: *hide the SET-YOUR-NOW-PLAYING affordance until M4;
  the NOW PLAYING display still renders.* **Grounded finding: the built profile has NO inert
  set-affordance** (`profile.tsx:116–128`) — the Now Playing section renders the `me.nowPlaying`
  display (thumb + title + hours) or a directional empty-line "Nothing pinned — set it from your
  Collection." That empty-line matches the board's own ghost-line ("NOTHING PINNED — SET YOUR NOW
  PLAYING FROM THE COLLECTION TAB", `:804`), and the display matches the populated board strip
  (`:534–544`, minus its `.chev` navigate → tap-to-navigate is M4). So there is **nothing to hide** —
  S5-b is already satisfied; no build.

## State: profile base (loaded, self) — build `profile.tsx` main return

| # | Element | Component | Board cite | Build cite | Status |
|---|---------|-----------|-----------|-----------|--------|
| 1 | **"PROFILE" title band** (fixed header) | ScreenHead | `.screen-head` `:487` | absent | **OWED (S5-a)** |
| 2 | identity (avatar · name · role tier · member-since · bio · gamertags) | IdentityBlock | `.well.id` `:489–503` | `:65–73` | PRE (owner "reference-good") |
| 3 | STATS (6 tiles) | StatTile grid | `.stats` `:505–513` | `:75–84` | PRE |
| 4 | PINNED FAVOURITE | GameCard + meta | `.hero` `:514–526` | `:87–99` | PRE (VIEW GAME button = EXPECTED(M4 Game page)) |
| 5 | TOP 3 (+ VIEW TOP 10 ›) | GameCard + RankChip + TertiaryLink | `.top3` `:527–532` | `:101–114` | PRE |
| 6 | NOW PLAYING **display** | GameCard + meta | `.well.strip` `:533–544` | `:116–128` | PRE — **S5-b confirmed: no set-affordance**; board `.chev` navigate = EXPECTED(M4) |
| 7 | MY DEVICE | MiniDevice + meta | `.well.dev-row` `:545–553` | `:131–139` | PRE (EDIT/nav = EXPECTED(M-later)) |
| 8 | Sign out | ScreenButton | (Settings §4.15) | `:141` | PRE |

## EXPECTED (later — not built, not flagged)
- **Header tools** EDIT · SHARE · Settings (the `.screen-head` region) → EXPECTED(M7 · walkthrough S5-a).
- **Tap-to-navigate** on Pinned/Top3/Now-Playing/Device (the board `.chev`/VIEW GAME) → EXPECTED(M4 Game page · §0.5/0.7).
- **Lifecycle/other artboards** (edit mode · fresh empties · friend-view · privacy · skeleton · signal-lost) → EXPECTED(later). The build's loading spinner + SIGNAL-LOST error states (`profile.tsx:38–56`) are the M3 interim; S5-a adds the band to the **loaded base** view (the note's target) — the transient loading/error states keep their centered full-screen treatment (not in S5-a scope).

## Owner-notes fold-in
| Note | Manifest line |
|------|---------------|
| S5-a render the PROFILE title band | #1 |
| S5-b hide SET-NOW-PLAYING (§0.8) | #6 — PRE (no affordance exists; display renders) |

## Predicate self-check plan
S5-a is a pure additive render (a fixed `ScreenHead` above the existing scroll) — **no state predicate
changes**; the loading/error early-returns are untouched. The receipt notes the header-placement
decision (loaded view only) and confirms the S5-b no-affordance finding against the code.
