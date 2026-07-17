# surfaces — build receipt (M6 P8–P13 + the fix waves · the client social surfaces, overnight run 2026-07-16/17)

> **Status: BUILT (P13 contributor · P12 settings+report · P9 friend-view/compare · P8 FRIENDS tab
> first-article · P10 WTP/Top-10/Discover · P11 achievements) · each manifest-first → Fable murr
> diff-review → parvati (P13 solo pass + one CONSOLIDATED quiet-stack walk over P8–P12) → fix waves
> F2/F3 (P13) · C1/C2/C4 (the consolidated pass) all CLOSED same-night · suites at head: 70 jest
> suites / 501 mobile tests · repo typecheck green → ⛔ STILL OWED: the owner's first-article FRIENDS
> walk + device taste gates (enumerated below) · the C3/OQ-151 ruling · three 🎨 owner calls.**
> Built autonomously overnight per the owner's directive; the first-article-owner-walk sequencing was
> deviated from ONCE, knowingly (P9–P13 built past the un-walked P8 per the overnight instruction —
> parvati + murr stood in; the owner's walk is the morning's first gate).

## TL;DR
Six client surfaces, all to their converged boards: the app gains **three new nav destinations**
(FRIENDS + DISCOVER routable tabs; /achievements off the Profile), the **friend-view cluster**
(/user/[id] + read-only collection + SOC-11 entry detail + /compare), the **contributor screen**
(E8a closed — every DESIGNED-BY tap routes), the **curated Top-10** (the placeholder retired), the
**Settings §0.10 slice + the MOD-01 ReportSheet** (a real report filed 201 end-to-end at review), and
the **achievements trophy case + CelebrationMoment**. Parvati's consolidated verdict: the bulk is
solid; her four 🚩 (C1 feed-dead schema · C2 settings nav · C3 progress display · C4 friend-shape
gaps) were fixed same-night except C3, which is the owner's OQ-151 ruling.

## The packet chain (commits · builder · headline)
- **P13 contributor** (`37122a0`+`b40bb26`, Opus; parvati solo → F2 `4608cb5`) — /contributor/[id]
  to the 14-state board; designer-taps routed app-wide; **F2** ShellNav PROFILE-active; **F3** the
  gallery BY-credit un-nested from the cell Pressable (the RN-web interception class — with a
  structural jest guard that fails on re-nesting; **live-verified at the consolidated pass**: URL
  flips, sheet stays closed).
- **P12 settings + report** (`1828491`+`3385d83`+`491fa5c`+`ec77e6d`, Opus; C2 `6410df6`) — the
  §0.10 Settings shell + BLOCKED page (MOD-09 unblock walked live) + the full ReportSheet matrix on
  card/game (+user via P9) with block-alongside; deferred rows ABSENT not disabled. **Found a real
  route-tree landmine:** a `*.test.tsx` under `app/` broke the entire expo-router web tree —
  relocated + runbooked ("never put test files under app/"). **C2**: /settings joined the onProfile
  nav predicate — with a NEW ShellNav test suite guarding the whole fall-through class both ways.
- **P9 friend-view + compare** (`a13dec1`+`5eced8b`, Opus; final round `12481c5`) — /user/[id]
  (relationship chip on the live 409 family incl. cooldown microcopy · report/block entry · staff
  badge), read-only friend collection (COL-10/11, no Arrange), SOC-11 entry detail (CARD-22 equipped
  readout live · ADOPT re-pointed · single-game compare), /compare/[friendId] (face-off · matchups ·
  leaderboard isMe · zero gold), the game-page friendsWhoOwn list. **C4 closed the loop:** the server
  now serves stats/device/nowPlaying on the friend shape (P2's rounds `5db4fe2`+`735f9b3` — which
  also killed the **ruled-never-implemented F-16/0055 `privacy` leak** and un-zeroed
  `adoptionsReceived`) and the client renders the three board rows (`12481c5`). The 0012
  view-in-their-device chrome TAKEOVER is EXPECTED (a cross-screen override lift, seam named).
- **P8 FRIENDS tab — FIRST ARTICLE** (`273d6f9`+`c4c5c3b`, Opus) — the feed-first landing
  (aggregated FeedRows, +N more, actor taps), roster + the 6-action sheet (incl. the OQ-075 minimal
  RecommendSheet, ASSUMPTION-flagged), the requests inbox (full SOC-08 lifecycle — **walked live at
  the consolidated pass**: a real accept formed a real friendship), the Find/Add hub (PersonRow
  6-state spine · **QrCard** via the one sanctioned dep `react-native-qrcode-svg`, rule-08 justified,
  G-M glance queued · InviteLanding both branches live). **C1** (the feed-dead `.url()` schema
  outlier) fixed in `77ff89a` — the first impression renders.
- **P10 WTP + Top-10 + Discover** (`00da8ee`+`2c592ba`, Opus) — the Collection TOP view goes
  CURATED (`/me/lists` · ARRANGE re-rank · CardPicker · cap states; the hours-sorted placeholder
  retired), the Profile Top-3 + the 0050 three doors, the **DISCOVER keycap live as the 5th tab**
  (board-grounded), UP NEXT full (queue · reorder · rec-accept · now-playing pin), DISCOVER
  browse-slice (trending live · upcoming honest-empty→**now live via P7's rider**, content flows on
  next fetch), the CAT-12 rail (same — P7's rider made it live). **A4 divergence recorded:** TOP-
  arrange renders as a vertical rank list, not the board's grid-drag — owner call at the walk.
- **P11 achievements** (`1590018`+`e29d8a6`, Opus) — the 14-artboard trophy case (sections · VIEW
  ALLs · sealed `???` D3 with jest no-leak assertions · tier colours off the themed tokens),
  CelebrationMoment (reduce-motion-safe; **refetch-delta trigger** ASSUMPTION — M7 push replaces it),
  profile teasers self + friend. **GAP-4/C3**: count-from-genesis makes satisfied-but-unfired
  counters read "3/1" — the owner's OQ-151 ruling; note **PLAYER TWO sits at 1/1 on the demo account:
  the owner's first friend-accept fires a live celebration**.

## Parvati (the verification trail — full verdicts in [`m6-review-notes.md`](../m6-review-notes.md))
- **P13 solo pass:** 3 🚩 (F1 env-migration timing — resolved · F2 nav · F3 credit-tap) → fixed +
  re-verified. HIGH board fidelity.
- **The consolidated quiet-stack walk (P8–P12 + residuals):** **4 🚩 / bulk-solid.** C1 feed-dead
  (a one-line zod `.url()` outlier — "the whole first impression", fixed) · C2 settings nav (fixed)
  · C3 over-target progress (→ OQ-151, owner) · C4 friend-shape gaps (fixed server+client).
  **Walked live:** the requests lifecycle end-to-end · SOC-11 with the CARD-22 readout · the compare
  marquee · UNBLOCK · a real report 201 · InviteLanding both branches · the sealed ??? zero-leak ·
  both residuals (F3 tap-flip ✓ · DISCOVER 5th-tab pip ✓). **First-article verdict:** "if C1 is
  fixed before he walks it, P8 is a PASS" — C1 is fixed.
- **jest at head: 70 suites / 501 tests** (the night's client delta: 46/359 → 70/501).

## 🎨 The owner's-eye list (iteration lane, not blockers)
1. **A4** — TOP-arrange list vs the board's grid-drag (deliberate simplification; restore the grid?).
2. Default cards render as flat olive blocks in Profile Top-3/pinned contexts (the CARD-18 default's
   look at small set-piece sizes).
3. The P8 requests banner doesn't refetch-on-mount on web (RTK cache; a freshly-arrived request
   needs a focus/mutation) · search fires on Enter only · VERSION reads 0.0.0.
4. RankChip `#1` vs the board's bare `1` · "1 ADOPTIONS" grammar · MEMBER-SINCE vs the board's
   CONTRIBUTOR-SINCE tagline (P13, contract has no tagline field).
5. ReportSheet carries a grab handle vs the board's handle-less drawer (matches the shipped
   ConfirmSheet convention).
6. **§1.5 catalog debt (the docs pass, component-map 0.13):** four code-first names have no
   design-spec §1.5 entry — `FriendActionsSheet` · `RelationshipAction` · `TrendRow` ·
   `NowPlayingPin`. Rides the next design-spec touch (with OQ-143's footnote errand).

## ⛔ The owner-walk checklist (the morning's gates — only the device/owner can judge)
1. **The FIRST-ARTICLE FRIENDS walk** (P8 alone first, per the standing rule — the overnight
   mass-production deviation makes this walk the pattern-ratifying gate): the feed grammar + peek
   rhythm · the requests banner · PersonRow clarity · QR fidelity · InviteLanding copy · the
   RecommendSheet (OQ-075 ASSUMPTION).
2. **The friend loop with a second real account:** search → request → accept (**this fires PLAYER
   TWO's celebration — judge the CelebrationMoment live**) → feed tick → profile → collection →
   SOC-11 → compare → adopt-from-friend.
3. **The curated Top-10 feel** (drag re-rank on device — the gesture is unit-tested math, visually
   unjudged) + the A4 list-vs-grid call.
4. **The achievements taste gates:** the trophy case · the sealed ??? mystery · tier colours under a
   non-Midnight theme (STANDARD must re-theme) · reduce-motion celebration.
5. **The safety pair end-to-end on device:** report a card → confirm copy · block → invisibility →
   Settings → BLOCKED → unblock.
6. **C3/OQ-151:** look at "FIRST PRINT 3/1" live and rule (accept / activation-sweep / copy).
