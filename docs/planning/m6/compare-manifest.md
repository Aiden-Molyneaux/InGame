# P9 — Compare screen manifest (SOC-03 · the marquee return-driver)

> **Packet:** M6 P9 (client · Opus). **Branch:** `m6`. **Scope:** `apps/mobile/**` only.
> **Board:** `compare-hours/compare-states.html` (converged Versus / head-to-head — P1–P5 + L1/L2).
> **Spec:** SOC-03 · PROF-03 (omission semantics). **Server seam (LIVE, P2 — bad9a63):**
> `GET /me/compare/:friendId` → `CompareResponse` (totals face-off · shared-set `games` · `leaderboard`);
> vs a non-friend/self → `409 NOT_FRIENDS`; blocked/suspended/deleted/unknown → `404` (MOD-09).

## Route + files (all new)
- `app/compare/[friendId].tsx` — the **Compare** screen (reached from the friend profile's COMPARE action).
- `src/store/compareApi.ts` — `getCompare` (injectEndpoints; never api.ts; zod-parsed at the seam).
- `src/components/compare/FaceOff.tsx` — **CompareHeader + CompareTotals** fused (the duel hero: both totals, the split-margin bar, the verdict pill, the games sub-face-off).
- `src/components/compare/ComparePair.tsx` — **ComparePair/CompareRow** (one card-vs-card matchup: their card · centered hours, winner orange · your card).
- `src/components/compare/FriendsLeaderboard.tsx` — **FriendsLeaderboard/LeaderRow** (the ranked ladder, your row lit; `isMe`).
- Test: `src/compare-route.test.tsx` (under `src/`, NOT `app/`).

## ARCH callouts
- **A1 — NON-COMMERCE, no gold anywhere.** Comparing creates no card, spends no PX (ECON-01/F-02). Every accent is the on-screen orange (`scr.accent`); the verdict pill borrows the NowTag orange-fill grammar; `EntryCard` (F-20) is the card face on both sides. Completion % is OUT (hours + games only).
- **A2 — omission branches are BUILT, forward-compat even if inert at M6.** The data model carries no per-facet hide toggle yet (privacy is friends|public only, OQ-117 deferred), so a friend always exposes both axes to a friend — but the PROF-03 omission rendering is built and unit-tested against every posture, so the day a per-facet setting lands the client already renders it honestly. Branches: `totals.theirHours`/`totals.leader` absent → the hours duel drops out (verdict → HOURS PRIVATE, no split bar); `games` absent → the matchups become a lock-well; `leaderboard` absent → the ranking section omits; per-game `theirHours` absent → that row's hours read as a tie/hidden.
- **A3 — tapping a card opens the Game page.** Per the board: your card → your Game page (`/game/:gameId`); their card → their friend-view entry detail (`/user/[friendId]/entry/:gameId`, SOC-11). Same target wherever a card appears in Compare.
- **A4 — the leaderboard is inline (P3 = a section, not a separate route).** The board draws P3 RANKINGS as its own artboard, but structurally it is the `leaderboard` array already in the compare payload; it renders as a section on the one Compare screen (the "ALL ›" tertiary is a scroll-to / no second fetch). No `/rankings` route at M6.

## STATE-BY-STATE
| State | Board | Status | Notes |
|---|---|---|---|
| P1 has-overlap (the model) | P1 | **OWED** | FaceOff hero (YOU vs @friend totals · split-margin bar · verdict pill · games sub-face-off) → per-shared-game `ComparePair` rows (their card · hours-vs, winner orange · your card) → FriendsLeaderboard. |
| P2 no-shared-games | P2 | **OWED** | totals still duel; the matchups section becomes a doorway: **BROWSE {NAME}'S COLLECTION** (→ `/user/[friendId]/collection`) + **RECOMMEND A GAME** (EXPECTED — see GAP-1). Both orange, no gold. |
| P3 friends leaderboard | P3 | **OWED** | the ranked ladder, `isMe` row lit with the orange rail; the header tertiary (HOURS · GAMES) is a **display note** at M6 (the games-axis re-sort is a client toggle only if `leaderboard` carries games — it does; wired). |
| P4 Skeleton (loading) | P4 | **OWED** | `Skeleton` solid fills in the face-off + matchup shapes; the frame is reserved so the duel doesn't reflow. |
| P5 privacy-limited (hours hidden) | P5 | **OWED (branch A2)** | `theirHours`/`leader` omitted → verdict = HOURS PRIVATE, matchups → a lock-well, friend off the hours ladder; the **games** face-off still settles. |
| P5b collection hidden | P5 caption | **OWED (branch A2)** | `games` + `theirGames` omitted → the whole matchup section is a lock; your totals survive. |
| L1 Signal-Lost (load error) | L1 | **OWED** | `LoadError` + RETRY (retryable network failure). |
| L2 Offline (read-from-cache) | L2 | **OWED** | the OFFLINE strip; the last-synced comparison stays readable (read-only — nothing to gate); outbound actions dimmed. |
| NOT_FRIENDS (409) | (spec) | **OWED** | a `409 NOT_FRIENDS` (comparing a non-friend/self) → a calm "You can only compare with friends" state + a door back. Distinct from the 404 unavailable. |
| unavailable (404, MOD-09) | (spec) | **OWED** | blocked/suspended/deleted/unknown → the generic `Unavailable`, no RETRY. |

## ASSUMPTIONS
- **AS-1** — the split-margin bar width derives from `yourHours / (yourHours + theirHours)` (guarded against divide-by-zero → 50/50). Illustrative on the board; computed live here.
- **AS-2** — the verdict pill copy: `leader==='you'` → "YOU LEAD · +{Δ} HRS"; `'them'` → "{NAME} LEADS · +{Δ} HRS"; `'tie'` → "DEAD EVEN"; omitted → "HOURS PRIVATE".
- **AS-3** — the RANKINGS "ALL ›" + the HOURS/GAMES axis tertiary are in-screen (scroll / client re-sort), not routes — the leaderboard array is already in the payload (ARCH A4).
- **AS-4** — the compare screen renders the **FRIENDS** nav pip active (board grammar); FRIENDS is inert until P8 (shared with the friend-view manifest AS-2).

## GAPs
- **GAP-1 (P4 recommend)** — the P2 "RECOMMEND A GAME" nudge needs `POST /recommendations` + the compose sheet (P4 server + P8/OQ-075 client). At M6 the button routes to the friend's collection / is a quiet EXPECTED CTA (no fake write). Where: P4 `recommendations` + P8 recommend-compose.
- **GAP-2 (OQ-117)** — per-facet hours/collection privacy has no data-model toggle yet; the omission branches are built + tested but not reachable from real data until OQ-117 lands. The single seam is `resolveCompareVisibility` on the server (flagged by P2). Client is ready.

## BOOT (browser :8082, real taps)
- demo → compare with demo_curator2 (seed friends). Confirm the FaceOff totals + at least one `ComparePair` matchup + the leaderboard render with **live numbers** (P2's smoke used this pair). Card-tap → the Game page / entry detail. Result in the receipt.
