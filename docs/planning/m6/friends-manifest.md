# P8 · FRIENDS tab — build manifest (first article)

> Surface: the 4th tab (feed landing · roster · requests banner) + the friend-row actions sheet +
> the SOC-05 recommend compose. Board: `docs/design/mockups/friends/friends-states.html` (draft A
> "Feed-first", converged §3.3). IDs: SOC-01/05/06/08/09. Companion: `find-add-manifest.md`.
> Owner walks this ALONE before P9–P13 (§2 first-article rule).

## Routes (expo-router file tree; ShellNav treats all as the FRIENDS cluster → FRIENDS keycap active)
| route | file | board | notes |
|---|---|---|---|
| `/friends` | `app/(tabs)/friends.tsx` | friends P1/P2/Q1/P5 | THE TAB — feed landing + roster rail + requests banner. Registered in `(tabs)/_layout.tsx`. FRIENDS keycap now routes here (ShellNav ROUTES). |
| `/friends-roster` | `app/friends-roster.tsx` | friends P3/P6/P7/P8 | ALL FRIENDS list → FriendActionsSheet (VIEW/COMPARE/RECOMMEND/UNFRIEND/REPORT/BLOCK). |
| — recommend | `src/components/social/RecommendSheet.tsx` | friends P6 (SOC-05) | compose sheet (ASSUMPTION, OQ-075 — see §GAPS). |

## State-by-state (friends board)
| board state | built | status | notes |
|---|---|---|---|
| P1 feed landing (banner · rail · aggregated FeedRows) | ✅ | OWED | actor tap → `/user/[id]`; peeked card tap → `/game/[id]` (CARD-23). |
| P2 active feed (all 5 SOC-06 types) | ✅ | OWED | `added_games` +N more, `beat_game`, `completed_game`, `published_card` (EntryCard peek), `unlocked_achievement` (glyph + label; empty until P6 emits — render-capable now). |
| Q1 quiet feed (thin window) | ✅ | OWED | short digest + InviteHook nudge → `/add-friends`. |
| P5 cold-start (0 friends) | ✅ | OWED | InviteHook doorway (search field + INVITE + QR keys → hub) + "activity wakes up" line. |
| P3 roster (FriendRow + COMPARE + ⋮) | ✅ | OWED | `/friends-roster`; COMPARE → `/compare/[id]`; ⋮ → actions sheet. |
| P6 actions sheet (VIEW/COMPARE/RECOMMEND · UNFRIEND · REPORT/BLOCK) | ✅ | OWED | no SHARE (OQ-052). VIEW→`/user/[id]`, COMPARE→`/compare/[id]`, REPORT→ReportSheet(user), BLOCK→ConfirmSheet. |
| P7 UNFRIEND ConfirmSheet (silent copy) | ✅ | OWED | `ConfirmSheet` tone=destructive; DELETE `/me/friends/:userId`. |
| P8 BLOCK ConfirmSheet (silent · mutual-invisible copy) | ✅ | OWED | `ConfirmSheet`; POST `/me/blocks` (communityApi.blockUser). |
| L1 Skeleton | ✅ | OWED | `Skeleton` kit (solid fills). |
| L2 Signal Lost + RETRY | ✅ | OWED | `LoadError`. |
| L3 Offline (writes gated) | ⚠️ | PARTIAL→EXPECTED | offline READ from cache is redux-persist behavior; the explicit "OFFLINE strip + gated writes" chrome is EXPECTED (net-status wiring rides the SYS-10 pass, not built app-wide yet). Feed/roster still render from cache via redux-persist. |

## Data / API (own slices via injectEndpoints — api.ts untouched)
- `friendApi.ts` (extended): `getFriends` (GET /me/friends) · `getFriendRequests` (GET /me/friends/requests) · `acceptFriendRequest` (POST /friends/requests/:id/accept) · `declineFriendRequest` (POST /friends/requests/:id/decline) · `cancelFriendRequest` (DELETE /friends/requests/:id) · `unfriend` (DELETE /me/friends/:userId) · `searchUsers` (lazy, GET /users/search?username=). Tags: `Friends`·`FriendRequests` (+ existing `User`).
- `feedApi.ts` (new): `getFeed` (GET /me/feed?cursor=) — lazy + component-accumulated pages (wallet-ledger precedent).
- `recommendationApi.ts` (new): `createRecommendation` (POST /recommendations).
- Block/unfriend/accept invalidate `Friends`+`FriendRequests` so the rail/roster/banner re-read.

## Rules honored
- EntryCard for every card face (feed `published_card` peek, recommend picker). No hand-rendered imageUrl.
- 0069: non-commerce → NO gold. ADD/ACCEPT/RETRY = orange `primary`. UNFRIEND/BLOCK = `destructive` red. Secondary = cream.
- 0070 themed tokens from birth (`themedStyles`/`useTheme`). F-06 type scale (21/15/11/9). Hooks unconditional (F-16).
- Feed peek thumbs drop the nameplate (<9px, decision 0047) — the feed line names the game.

## ASSUMPTIONS / GAPS / EXPECTED (owner's eye)
- **ASSUMPTION (OQ-075 minimal recommend-compose):** RECOMMEND opens `RecommendSheet` — pick a game from YOUR collection (EntryCard list) + optional note (≤500) → POST /recommendations → confirm Toast. Handles 409 NOT_FRIENDS/SELF_TARGET. This is the minimal compose the plan sanctions; the richer compose is still OQ-075.
- **EXPECTED — L3 offline gated-writes chrome:** the calm OFFLINE strip + per-action gating is the SYS-10 pass (not built app-wide); cache reads work via redux-persist. Flagged, not faked.
- **EXPECTED — presence/now-playing:** CUT per owner 2026-06-18; roster reads hours + collection size only.
- **feed avatar/label:** `avatarUrl` (built serializers emit it; contract draws `avatarRef` — the P1/P2-flagged drift). `unlocked_achievement` rows render from `objects[].label`; empty until P6 emits the event.
