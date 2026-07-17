# M6 — Parvati build-vs-design review notes

## P13 — Contributor profile (`app/contributor/[id].tsx`, commit b40bb26 on m6) — 2026-07-16

**Verdict:** 3 🚩 flag · 6 ✅ expected · 4 🎨 polish. Measured vs the M6 DoD (§8 P13 line + E8a), the
`contributor-states.html` board, and `GET /users/:id/contributions` (api-contract 0.69 / shared
`contributionsResponseSchema`). Reviewed from the running Expo-web app (:8082) + jest + curl + DB.
**Board fidelity: HIGH** on the P13 client itself. **Blockers: YES** — one server-side blocker + one nav
regression, both keep the M6 DoD from being signed as-is.

### 🚩 Flag (owed at M6)

| # | Element | Bucket | Finding + repro | Fix | Lane |
|---|---------|--------|-----------------|-----|------|
| F1 | Cross-user views (P3 · P3b · P4) | ABSENT (500) | Every non-self contributor read **HTTP 500s**. `GET /users/cd711b88…/contributions` → `SERVER_ERROR`; self=200, bogus=404. API log: `getContributions → getRelationship → pendingDirection (relationship-repo.ts:57)` queries table **`friend_requests` which does not exist** in dev DB. Client correctly degrades to L2 SIGNAL LOST. | **Not P13** — server/DB. `friend_requests` is defined in schema.ts + migrations **0013/0014** but the dev DB `local_ingame` only has `friendships` → **migrations 0013+ never applied**. Apply migrations to the shared dev DB (server lane owns it tonight). | Server / dev-DB migration |
| F2 | NavBand active state | MISPLACED | On `/contributor/[id]` the NavBand renders **fully LOCKED (opacity 0.45, all keycaps grey + non-interactive, no active key)** — confirmed live (screenshot) + code. Board draws **PROFILE-active** on every state. Root: `ShellNav.tsx:43-55` — `/contributor` matches none of `onCollection`/`onProfile`/`onStore` → `locked=true`. The manifest's screen-comment claim "NavBand stays PROFILE-active" is factually wrong. | Add `pathname.startsWith('/contributor')` to `onProfile` (ShellNav.tsx:50) — it's reached FROM a profile. One line. | P13-adjacent (client) |
| F3 | Gallery BY-credit → contributor route (E8a) | MISPLACED/absent (web) | Tapping the gallery `BY {designer}` credit **opens the AdoptCardSheet, does NOT route** — verified live: clicked the credit text's exact centre → `sheetOpen=true`, URL stayed `/game`. The `View …'s contributions` aria-label is **absent from the rendered web DOM**; the credit text's nearest clickable ancestor is the OUTER cell Pressable (onInspect). The inner credit Pressable (CommunityGallery.tsx:97) loses the tap to the outer cell on RN-web. | Jest proves the wiring (onViewDesigner called in isolation) but can't catch nested-Pressable interception. **Likely native-vs-web divergence** (native responder system may let the inner win). **Verify on device**; if it repros, restructure so the name isn't a Pressable-inside-a-Pressable. AdoptCardSheet credit (standalone Pressable) is fine. | P13 (client) — device-confirm |

### ✅ Expected (deferred — proceed, cited)
- **PctPill percentile chips absent on all states** — `standing:null` server-side at M6 (CAT-10 rides M7). Manifest A4 + PctPill note; confirmed live (no TOP N% chips on P1). PctPill component built + gated correctly.
- **IdentityBlock has no bio / genre gtags** — board draws them; the CAT-07 `user` shape is `{id,username,avatarUrl,memberSince}` only (contract has no bio/gamertags). Confirmed live (only "MEMBER SINCE JUL 2026"). Contract gap, not a build miss → **OQ candidate** (widen contract, or amend board). Manifest GAP recorded.
- **GAMES ADDED rows have no card thumb** — board draws a `.gcard thumb` per row; `contributorGame = {gameId,title,collectionsCount}` carries no card. Confirmed live (title + reach + chevron only). Contract gap → **OQ candidate**. Manifest GAP recorded.
- **VIEW ALL renders over the base top-N (no cursor paging)** — cursor sub-routes drawn-not-built; terminal TailNote stands in when `count > rendered`. Manifest EXPECTED(P2 server tail). V1 confirmed live.
- **L3 Offline absent** — no SYS-10 connectivity substrate exists; sibling screens defer identically. Manifest EXPECTED.
- **DESIGN-A-CARD / P4 ADD FRIEND are non-write route-backs** — Styler needs a gameId (no gameless card door → routes `/add-game`); friend-request write is P8/P1. Manifest ASSUMPTIONs; honest non-fake actions.

### 🎨 Polish / iteration (built-app visual)
- **RankChip renders `#1 / #2 / #3`** — board `.rank` shows bare `1 / 2 / 3` (no `#`). Confirmed live.
- **"1 ADOPTIONS"** on the signature hero (and cells with count 1) — no singular grammar; board also always pluralises, so matches board, but reads awkwardly with real single-adoption seed data.
- **IdentityBlock sub reads "MEMBER SINCE"** where board says "CONTRIBUTOR SINCE '24 · INDIE FINDER" — the tagline has no field (dropped, manifest GAP); "MEMBER" vs "CONTRIBUTOR" wording is the owner's call.
- **Login flow flaky on web** + **web auth is in-memory only** (no persistent token store on web; only `persist:ingame_prefs` in localStorage) → any reload/second-read 401s. Documented RN-web friction, not P13. See qa-runbook note below.

### ✅ Matches (confirmed live on P1 self-populated)
Section ORDER exactly per board: header CONTRIBUTIONS → `‹ RETURN TO PROFILE` back-seam → IdentityBlock →
STATS (4 boxless tiles GAMES/CARDS/ADOPTIONS/REACHED) → SIGNATURE CARD hero (MOST ADOPTED eyebrow +
title + `n ADOPTIONS` + cream VIEW CARD) → CARDS DESIGNED `/cell` grid + VIEW ALL → GAMES ADDED rows +
VIEW ALL. **Flattened card images render** (signature hero + 3 grid cards, no blank cells). L2 LoadError
(SIGNAL LOST + RETRY, exact board copy). MOD-09 Unavailable (bogus uuid → GO BACK, no retry). V1 VIEW ALL
cards (header swap, `‹ CONTRIBUTIONS` back-seam, listsum "All 3 cards … · 1 adoptions in all"). Block
reachable via the sheet ⋯ overflow (SOC-09 confirm). Community gallery renders the BY-credit + adopt sheet.

### jest
`npm -w @ingame/mobile test` → **46 suites / 359 passed** ✅ (state matrix P1/P2/P2b/P3b/P4/MOD-09/L2/VIEW-ALL
+ E8a credit-tap wiring all assert real render/handler output — covers the states the server-500 blocked live).

### qa-runbook lessons (this run)
1. **Never drive expo-router with `history.pushState` if you then need to test the app's OWN `router.push`** — manual pushState desyncs expo-router's in-memory route state, so subsequent in-app navigations silently no-op. pushState is fine for READ-ONLY state inspection; it poisons router-based tap tests. Use real UI taps for routing checks.
2. **Web auth is in-memory only** (no secure-store on web) — the token survives ~one authed read after login; a reload or slow gap → 401 app-wide. Do cross-user checks back-to-back immediately after login; don't interleave slow DB/curl work.
3. **Coordinate scaling**: `computer` screenshot space (1568×773) ≠ JS `getBoundingClientRect` viewport (1600×789), ~0.98×. Scale JS-measured coords before `computer.left_click`, or prefer ref-based clicks.
4. **A 500 on a cross-user read looked like the token quirk** — curl with a fresh token + the API log (`.devstack/api.log`) distinguished a real server 500 (missing relation) from the web session quirk in one shot. Reach for curl+log before blaming the browser.

---

## THE CONSOLIDATED M6 WALK (P8–P12 + residuals) — 2026-07-17

**Reviewed from** the running Expo-web app (:8082, one login session, real taps · ref-based clicks) + jest +
curl + DB. Migrations 0013+ **are now applied** (the P13-F1 blocker is RESOLVED — every table exists; every
cross-user read is 200, no 500s all night; API did not restart under me). Seed: demo_curator_m3
(`demo@ingame.app`) ↔ demo_curator2 friends; achievements seeded (demo earned:1, inProgress:11). All test
mutations (friend req/accept, block, report, invites) **cleaned up — DB restored to seed** (friendships 3 ·
requests 2 · blocks 0 · reports back to the 1 pre-existing junk `card/1111` row that predates this session).

### 🚩 FLAG (owed at M6)

| # | Surface | Element | Bucket | Finding + repro | Fix |
|---|---------|---------|--------|-----------------|-----|
| C1 | **P8 (FIRST ARTICLE)** | Activity feed | ABSENT (parse-fail) | **THE HEADLINE. The feed-first landing is DEAD.** `/me/feed` returns **200 with real rows**, but the client renders **SIGNAL LOST**. Root: `packages/shared/src/schemas/response/feed.ts:38-39` types `card.imageUrl`/`thumbUrl` as **`z.string().url()`**, but the server emits **relative** media paths (`/media/cards/…/full.png`). Every `published_card` feed row fails the zod parse → `transformResponse` throws → whole `getFeed` errors. Confirmed live (console `ZodError: invalid_string url @ items[n].objects[m].card.imageUrl`). **EVERY other card schema uses plain `z.string().nullable()`** (cards.ts:63/101/159/210 · collection.ts:19/99 · profile.ts:198/216) — feed.ts is the lone `.url()` outlier. Same latent bug: `feed.ts:63` `avatarUrl.url()` (breaks any actor w/ a relative avatar; passes now only because avatars are null) + **`recommendations.ts:17-18`** `imageUrl/thumbUrl.url()` (will break the RecRow surfaces the moment a rec carries a card thumb). | `.url()` → plain `z.string()` in feed.ts (38/39/63) + recommendations.ts (17/18). One-line-per-line, no data change. |
| C2 | **P12** | NavBand on `/settings` + `/settings/blocked` | MISPLACED | The NavBand renders **locked/inert** on both Settings pages — confirmed live (tapping the PROFILE keycap does NOT navigate; only the back-seam works). Root: `ShellNav.tsx:83` `locked = !(onCollection‖onProfile‖onStore‖onFriends‖onDiscover)`; `/settings` matches **none** of the predicates (60-76). **This is the exact class the P13-F2 fix addressed for `/contributor`** — Settings is a Profile sub-surface reached from the Profile header, but was left out of `onProfile` (which now lists `/profile`,`/device`,`/contributor`,`/achievements`). Traps the user on Settings (back-seam only). | Add `pathname.startsWith('/settings')` to `onProfile` (ShellNav.tsx:60-64). One line — same shape as the F2 fix. |
| C3 | **P11** | IN PROGRESS meters (GAP-4, live) | UNPOLISHED/data | The known GAP-4 **reads as broken live.** The IN PROGRESS section shows all 3 top items with **full bars and met/exceeded counts yet unearned**: FIRST PRINT **3/1**, SHELF STARTER **31/5**, PLAYER TWO **1/1**. Count-from-genesis + ACH-08 no-retro-grant → thresholds crossed pre-engine never fire. To a beta user this looks like the achievement engine is broken (clearly-complete milestones stuck "in progress"). Also makes a live celebration **not cheaply demonstrable** (all near-threshold milestones are historically past-crossed → a new action can't re-fire them; genuinely-in-progress ones need many actions). | Owner call: seed/backfill posture (grant the historically-crossed ones on a one-time migration, OR clamp the IN-PROGRESS display so `current` never exceeds `target`, OR exclude already-satisfied-but-unearned from IN PROGRESS). Server/seed lane. |
| C4 | **P9** | Friend `/users/:id` stats + device (server) | ABSENT | Live friend/full shape carries `bio·gamertags·friendsCount·mutualFriendsCount·relationship·top10` but **NO `stats` (null) · NO device · NO now-playing** (curl-confirmed). P2's packet description (§3 P2) says the friend/full shape serves "device · stats+percentiles · top10 · now-playing · achievements teaser". Client **honestly** degrades to the AS-1 one-line note. **Owner decision, not a client defect** — accept the descope (record it) or build the friend stat/device serializer. (achievements teaser + top10 ARE now served.) | Owner: accept-descope-and-record, or widen the friend serializer (server lane). |

### ✅ Expected / working (proceed) — the bulk of M6 is solid

- **P8** roster (`FRIENDS 1`, FriendRow COMPARE+⋮) · 6-action sheet (VIEW/COMPARE/RECOMMEND/UNFRIEND/REPORT/BLOCK) · **RecommendSheet** compose (17-game collection picker + note 500-max + submit) · search (fires on **Enter**, exact-match → PersonRow) · PersonRow `none`→+ADD / `outgoing`→REQUESTED (live) · **requests inbox lifecycle walked LIVE**: incoming RequestRow (ACCEPT/DECLINE) → **accept → friendship created** (verified server-side) · QR (`react-native-qrcode-svg` renders) + invite mint (`POST /me/invites` live, TTL-7d copy) · **InviteLanding** both branches: happy (SenderSummary + one-tap ADD, relationship-aware) AND INVALID/EXPIRED terminal. FRIENDS keycap routes + active pip.
- **P9** friend profile (IdentityBlock + bio + PSN/PC/XBOX gtags + `N FRIENDS · M MUTUAL` + FRIEND tag + VIEW COLLECTION/COMPARE doors + ⋯→ReportSheet) · friend Collection (read-only browse tools, no Add/Arrange, EntryCard faces) · **SOC-11 entry detail** — the standout: **CARD-22 equipped readout LIVE** (BASE·GRADIENT · FRAME·ORNATE GOLD · PLATE·SLAB · FONT·CHAKRA, the §0.2 denormalization) + gated readout (HOURS/STATUS/SINCE + NOTES·RATING 🔒 PRIVATE) + ADOPT (re-pointed M5 AdoptCardSheet, 3 PX price) + single-game compare (300 vs 0, `68% vs —`) · **Compare** — the marquee: FaceOff (900 vs 0 HRS · split bar · YOU LEAD +900 verdict · games 17/+15/2) + 2 ComparePairs (their card·hrs·your card) + FriendsLeaderboard (isMe lit). **AS-1 answer: yes — the one-line note is the right honesty for the client** (it just needs the C4 owner decision behind it).
- **P10** Discover UP NEXT (Now-Playing pin + LOG HOURS · queue row + IN-COLLECTION tag + drag-reorder · ADD FROM COLLECTION) · DISCOVER room (UPCOMING honest EXPECTED-empty w/ M7 cite, no notify toggle · TRENDING live — rank chips, BY @designer, ▲AdoptCount, non-commerce) · SectionSwitch toggle · **DISCOVER keycap live + active pip = 5th tab (residual b ✓)** · Collection TOP curated (COL-13, placeholder retired: #1 headliner + ARRANGE + `1/10 SEATED` + DONE) · CardPicker (search + ✓ toggle, sources own collection) · Profile Top-3 from `me.top10` (Hades #1 rank chip) + three doors.
- **P11** trophy case (SUMMARY 1/11/0-of-6 · TierLegend PRESTIGE-gold/STANDARD-amber/SECRET-magenta · EARNED Contributor · VIEW ALLs) · **sealed D3 ??? sheet — zero leak** (magenta lock + "This one's a secret…") · profile teasers (self `1 EARNED` + friend `0 EARNED`).
- **P12** Settings shell (§0.10 slice: EMAIL unverified-state · USERNAME · SIGN OUT · BLOCKED USERS count · TERMS/PRIVACY/VERSION · DEV-04 footnote; deferred rows absent not disabled) · BLOCKED page (empty + populated, SOC-09 "They're never told" note) · **UNBLOCK ConfirmSheet** (calm/amber tone) → **live DELETE verified** · **ReportSheet (user) filed a real report end-to-end → 201** (reasons ABUSIVE/IMPERSONATION/SPAM · submit-dormant-until-reason validation · block-alongside past the OR divider · ReportConfirm "THANKS — REPORT FILED / WE'LL TAKE A LOOK / …this profile may be hidden" — **§0.5-compliant, no review-speed promise**).
- **Residual F3 — FIXED (verified live):** gallery `BY {designer}` credit tap → **URL flips to `/contributor`, AdoptCardSheet stays CLOSED**, contributor screen loads. (The P13-F3 web nested-Pressable interception is gone.)
- **Residual F2 — FIXED (code):** `ShellNav.tsx:63` `onProfile` now includes `/contributor` → PROFILE-active. (But see C2 — `/settings` is the next member of that same list left out.)

### 🎨 Polish / iteration (built-app)
- **P10 A4 divergence** — TOP-ARRANGE renders as a **vertical rank list** (grip+rank+card+title+REMOVE), NOT the board's 3-up grid-with-grips. Deliberate simplification (manifest A4, owed-for-parvati) → owner accept/reject.
- **Default cards render as flat olive blocks** in Profile Top-3 / PINNED FAVOURITE (Hades = a `DEFAULT` card) — no art, no title on the face at that size. Reads oddly against the styled cards elsewhere.
- **P8 requests staleness (web)** — the FRIENDS-tab requests banner + `/add-friends` preview read a `getFriendRequests` query that does **not refetch on mount/nav** (only a mutation or `refetchOnFocus` refreshes it). A freshly-arrived request needs a mutation/tab-focus to appear. Web artifact; native AppState-focus likely refreshes. Verify on device.
- **P8 search fires on Enter only** (not on-type) — acceptable, but the docked field gives no affordance that Return is required.
- **P12 report transient 401→201** — the live report POST logged a `401` then a `201` (web in-memory-token quirk; client succeeded on retry). Confirm it's not a double-submit on device.
- **P12 VERSION** row shows placeholder `0.0.0`.
- **Theme note (not a defect):** the demo user's device theme (GRAPE/midnight) accent renders **amber**, so every screen-`primary` (LOG HOURS · RETRY · +ADD · ADD FRIEND · VIEW COLLECTION · verdict pill · UNBLOCK) is amber not the board's orange. This is DEV-04 re-theming working (`scr.accent`), NOT gold/F-02 misuse — the commerce gold (wallet PX, adopt price chip) stays distinctly gold.

### FIRST-ARTICLE verdict — P8 (what the owner will feel tomorrow)
**He opens the FRIENDS tab first and the feed — the entire "feed-first" landing — says SIGNAL LOST.** That is
the first thing he sees, and it's a one-line schema bug (C1), not a design miss. Everything *around* the feed
is genuinely good: the roster→actions-sheet→RecommendSheet flow is clean, the requests lifecycle accepts a
real friend live, the QR/invite/InviteLanding chain is polished and complete, and the copy voice is on. If C1
is fixed before he walks it, P8 first-article is a **pass** — the surface is coherent, the grammar reads, the
banner rhythm and PersonRow clarity land. If C1 is NOT fixed, the very first impression is "the headline
feature is broken," and the taste read gets poisoned before he reaches the good parts. **Fix C1 first; it is
cheap and it is the whole first impression.**

### jest
`npm -w @ingame/mobile test` → **69 suites / 493 passed** ✅ (matches the expected 69/493).

### qa-runbook lessons (this run)
1. **A 200 that renders SIGNAL LOST = a client zod-parse failure, not a network/auth issue.** `read_network_requests` showed `/me/feed` 200 while the screen showed LoadError — the tell was `read_console_messages` surfacing the `ZodError`. When a lifecycle-error state contradicts a 200, read the console before blaming the server or the token. (This caught C1, the headline bug, in one shot.)
2. **Ref-based clicks (`find`/`read_page` → `computer left_click ref`) are far more reliable than coordinate clicks on RN-web** — the device-frame reflows between screenshots (viewport 1568×772↔773↔1634×805), so screenshot coords drift; refs don't. But refs go **stale across state-preserving tab mounts** — re-`read_page` after each navigation; a ref from a previously-mounted screen silently no-ops.
3. **State-preserving tabs pollute `read_page`/`find`** — the Collection/Profile/etc. tabs stay mounted under the active screen, so `find` returns duplicate/stale matches from other tabs. Prefer the most-recently-numbered ref, and screenshot to confirm which screen is actually fronted.
4. **RTK cache defeats "arrived-while-open" checks on web** — an inbox/list that fetched empty on mount won't show a DB-inserted row until an invalidating mutation or a route remount (`refetchOnMountOrArgChange`). To light up an incoming-request inbox I sent a *different* real friend request (invalidated the `FriendRequests` tag) → the refetch then surfaced both. For blocked-list I navigated away+back to force the remount refetch.
5. **The screenshot tool intermittently times out (`CDP Page.captureScreenshot timed out 30000ms`)** roughly every other call this session — a second immediate call succeeds. Not fatal, but budget for the retry.
