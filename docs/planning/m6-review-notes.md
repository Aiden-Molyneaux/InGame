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

---

## AUTH EPIC (M6) — Parvati build-vs-design: sign-in (changed) · forgot-password (NEW) · choose-username (NEW) — 2026-07-19

**Verdict:** 0 🚩 flag · (deferred N/A) · 3 🎨 polish/owner-eye. Measured vs the auth-epic-manifest (§2/§3 + P-C/P-E test lists), sign-in's field grammar, and the reused welcome-auth seal-block grammar. Per the manifest ASSUMPTION there is **no forgot-password / choose-username mockup board** (welcome-auth W7/W8 depict the SUPERSEDED emailed-LINK flow), so both NEW screens are judged on **derived-grammar consistency**, NOT pixel-parity — consistent with the builders' recorded assumption.
**Reviewed from** the running Expo-web app (:8082, device-frame chrome) + source read + curl (server contract) + api.log. **Capture caveat:** the Chrome window is fixed ~1600px wide, so the InGame device frame renders **landscape**; phone-width (390px) proportion could not be captured (resize_window did not shrink the CSS viewport). Structural/grammar/order parity is viewport-independent and was fully assessed; phone-column layout was not.

### 🚩 Flag — NONE. All three surfaces render and behave to grammar + contract.

### 🎨 Polish / owner-eye (built-app)
- **choose-username — CLAIM enabled while advisory reads "USERNAME NOT AVAILABLE".** `canClaim = wellFormed && !fieldError`; the advisory availability line is NOT a fieldError, so the primary stays enabled on a known-taken name. **By-design (AUTH-11: advisory never gates submit; the authoritative PATCH /me returns the inline `username_taken` error)** and identical to sign-in's create-account behavior — recorded as owner-eye only, not a defect. If the owner wants a known-taken name to disable CLAIM, that's a design change to both screens.
- **Primary buttons read brown when disabled.** The orange `--primary` (`rgb(255,159,67)`, 0069-correct) dims to a muted brown at ~30% ink in the disabled state (SEND CODE / VERIFY / SET PASSWORD / CLAIM / SIGN IN while their gate is unmet). Reads slightly "already-brown" rather than obviously-disabled at a glance — token-level, iteration lane.
- **Green "USERNAME AVAILABLE" advisory renders lime/yellow-green** (`theme.brand.success`) — consistent with sign-in's create advisory; noted for the owner's eye only (matches, not a divergence).

### ✅ Matches (present · placed · on-grammar — confirmed live)
- **sign-in (changed):** FORGOT? TertiaryLink present, orange, docked on the password label row, routes to `/forgot-password` (no longer `comingSoon`). **Apple button + OR-divider correctly ABSENT on web** — both live inside one `mode==='signin' && appleAvailable` conditional and `appleAvailable` can only flip true in an iOS-gated effect, so on web the whole S2-i block is gone: SIGN IN flows straight into the swap footer, **no orphaned OR divider.** No console errors.
- **forgot-password (NEW, all 4 beats reached live):** ScreenHead "RESET PASSWORD"; context-aware ‹ back seam (SIGN IN → EMAIL → CODE); enumeration-neutral copy ("If that address has an account, a 6-digit code is on its way…"); S1 email→SEND CODE advances neutrally; S2 6-digit field, VERIFY gated (disabled <6 digits, orange at 6), **wrong-code (000000) → inline neutral error "That code is invalid or has expired."** + reddened field, **RESEND cooldown "RESEND IN 27S" counting down → "RESEND CODE" link**; S3 new-password field + SHOW toggle; **terminal seal-block** (accent circle-check glyph · "ALL SET" · "PASSWORD UPDATED" · honest "every other session was signed out" · "RETURN TO SIGN IN") — the reused welcome-auth seal grammar. Real code (604316) pulled from the stub-email log; full request→verify→confirm ran green against the live server.
- **choose-username (NEW):** ScreenHead "CHOOSE YOUR HANDLE"; intro with the 3–20 rule; USERNAME field; **advisory line both states live** (taken → "USERNAME NOT AVAILABLE" red · fresh → "USERNAME AVAILABLE" green); CLAIM HANDLE primary; **correctly NO skip / NO back-seam** (AUTH-09 — handle chosen before entry). **Claim contract server-verified via curl:** POST /auth/apple (fresh mock subject) → new user `usernamePending:true`; PATCH /me {username} → `usernamePending:false` + cooldown set (the exact CLAIM call; client then `router.replace('/(tabs)/collection')`).
- F-06 scale honored across both new screens (intro 11 · advisory 9 · seal title 15); orange non-commerce primary (0069); square chrome (F-07).

### Server / infra notes (NOT Parvati flags — routed to the server-review lane)
- **Stale `avatar_config` 500s in api.log** (`column "avatar_config" does not exist` on login/refresh/getOwnProfile/getCollection) are from an **earlier server pid**; the **current** server returned the full self-shape cleanly on /me, /auth/apple and the reset-confirm path — drift already resolved by a migration on the running instance. Informational.
- The **StubEmailProvider logs the full reset code + body** to api.log ("stub email 'sent' (log-only)") — correct dev affordance; the server reviewer should confirm the prod ResendProvider path does not log the code (manifest §1 says token-redacted).
  - **ANSWERED (orchestrator, same day):** confirmed clean. `ResendProvider` logs nothing at all; the send-failure catch (`auth-service` reset-request path) does `captureException(err)` only — the Sentry event carries the transport error (Resend's response status/text), never the outgoing subject/body, and Sentry's `beforeSend` scrubber stands behind it. Residual by design: the code rides the email **subject line** (standard OTP practice) — the only leak vector would be a future error path logging outgoing subjects; none exists today. The stub's full-body log can't run in prod (fail-closed `EMAIL_PROVIDER` floor).

### Reachability
- sign-in: FORGOT? nav ✓ · Apple/OR-divider web-absence ✓ (REACHED)
- forgot-password: S1 ✓ · S2 empty/partial-gate/6-digit-enable/wrong-code-inline/resend-cooldown ✓ · S3 ✓ · success seal ✓ (ALL REACHED)
- choose-username: field + advisory taken/available + CLAIM gate ✓ (REACHED) · claim→tabs verified server-side via curl + client code (the live-UI claim was NOT clicked to avoid renaming the demo user; web in-memory token store also blocks a true usernamePending session in the browser)

### Test data created
- One throwaway mock-SIWA user: subject `parvati.walk.siwa.1`, id `e22b9c58-b7ce-468f-85c9-089c155dcd51`, now `username: parvati_walk_1`, `usernamePending:false` (the permitted single throwaway + its claim). Safe to delete.
- Demo user password was reset **back to `InGameDemo1!`** (unchanged net) to complete the forgot-password S3→seal without altering the shared credential; its other sessions were revoked by the reset (web-only, harmless).
- `parvati_free_9z` was typed for the AVAILABLE advisory only — **never claimed** (no user created).

---

## W-5 ULTIMATE COSMETICS (M6) — Parvati build-vs-design: store merchandising · styler colour beats · KEEP reconcile — 2026-07-20

**Verdict:** 0 🚩 flag · 3 🎨 polish/owner-eye · 1 surface NOT REACHED (seed gap). Measured vs decision **0080** (ruling 3 = the spec: gold ULTIMATE chip · square hue-strip · "ANY COLOUR — YOURS TO PICK"), `ultimate-cosmetics-draft.md` §4/§2.2/§3, and the existing store/styler visual grammar (F-02 gold voice, F-07 square chrome, CosmeticSwatch precedent). No mockup board exists for the ultimate merchandising (0080 r3 IS the spec).
**Reviewed from** the running Expo-web app (:8082, device-frame chrome) captured live (claude-in-chrome), plus source read (`UltimateChip`/`HueStrip`/`ItemSheet`/`ItemTile`/`storeCopy`/`AttributeSection` + `styler/[gameId].tsx` + `config/cosmetics.ts`) and API curls (`GET /store`, login). Demo user, **zero purchases / zero publishes / zero users created** (see CREATED below).

### 🚩 Flag — NONE. Every W-5 surface matched the spec.

### ✅ Matches (present · placed · on-grammar — confirmed live)
- **Store — all 3 type aisles sort ULTIMATE first, with both tells + normal 10-PX price:**
  - **FRAMES aisle** (screenshotted): `MARQUEE ULTIMATE` renders FIRST, wearing the **inverted gold-fill ULTIMATE chip** + the square **5-step hue-strip glyph**, price **10 ◇**. Every non-ultimate frame below (GOLD 3◇, CHROME owned, EMBER GLOW 3◇, PLASMA 3◇, ORNATE GOLD owned, HOLO FOIL owned, base MARQUEE owned) shows **neither** the chip nor the glyph. a11y: `"MARQUEE ULTIMATE, FRAME, Ultimate, colour-customizable, 10 pixels"` vs base `"MARQUEE, FRAME, owned"`.
  - **NAMEPLATES aisle** (a11y-verified): `BRASS ULTIMATE` first — `"…Ultimate, colour-customizable, 10 pixels"`; base `BRASS` below, `owned`, no tell.
  - **FONTS aisle** (a11y-verified): `SCRIPT ULTIMATE` first — `"…Ultimate, colour-customizable, 10 pixels"`; base `SCRIPT` (3◇), MONO/SLAB/STENCIL below, no tell. Base SCRIPT sits **below** its ultimate — confirms the §E-amendment separate-SKU model (base kept at its tier, ultimate minted alongside at 10).
  - **NO dedicated ULTIMATE aisle** — correct (its absence IS the spec; the index is the 8 type aisles only). Aisle counts already fold the ultimates in (FRAMES 8 = 6 std + 1 showpiece + 1 ult · NAMEPLATES 2 · FONTS 5).
  - **NEW THIS WEEK featured grid** carries **no** ultimate item — correct (§4.1: featured swap is optional/config-only, not owed).
- **Store ItemSheet (MARQUEE ULTIMATE, unowned → preview-then-acquire):** title row = name · `FRAME · CATALOG` · **ULTIMATE chip** · gold-text **10 ◆** price; directly below, the colour-freedom tell = **hue-strip glyph + "ANY COLOUR — YOURS TO PICK"** (exact copy); live PreviewStage; HOLD-TO-BUY bar (NOT pressed). Non-ultimate premium ItemSheet shows neither tell (gated on `tier==='ultimate'` / `colorCustomizable` in `ItemSheet.tsx`, and confirmed absent on the base rows in-aisle).
- **Styler FRAME beat:** selecting `MARQUEE ULTIMATE` mounts the **COLOUR `ColorField`** in the section-extra slot under the rail (`COLOUR` label · seeded-gold current swatch · recents · **PICK COLOUR** · **FROM CARD** eyedropper); live preview wears the gold marquee frame; picking a colour patched `frame.color` live (swatch + recents updated, autosave fired). Base MARQUEE (owned) mounts **no** colour field.
- **Styler PLATE beat:** `BRASS ULTIMATE` mounts the COLOUR field; preview renders the brass plate in its parameterized gold-ramp default; reconcile hint climbed to **20 ◇ TO KEEP** (marquee-ult 10 + brass-ult 10).
- **Styler TITLE beat:** equipping `SCRIPT ULTIMATE` upgrades the curated ink row to **"INK — ANY COLOUR"** free-pick (curated swatch surfaced as a quick-swatch `Use #efe9d5` inside the field + PICK COLOUR + FROM CARD); any other font (CHAKRA at open) keeps the curated 6-swatch set (CREAM/MIDNIGHT/GOLD/PINK/CYAN/MOSS). The OQ-137 unlock path, working. Reconcile hint → **30 ◇** with all three ultimates equipped.
- **Styler KEEP → ReconcileSheet:** SAVE → "KEEP THIS DESIGN?" ("acquires 30 PX of premium first") → **KEEP — EQUIP IT** opens the **STANDARD "PREMIUM COMPONENTS" ReconcileSheet** listing all three rows — MARQUEE ULTIMATE · BRASS ULTIMATE · SCRIPT ULTIMATE — each wearing the **compact gold ULTIMATE chip + 10 ◇**, TOTAL **30 ◇**, "acquire all 3 · yours to keep", HOLD-TO-BUY (NOT pressed). The missing-sum math (3 × 10) is correct.
- Grammar throughout: inverted-gold chip = F-02 economy escalation via inversion (never a new token); hue-strip is square-cornered spectrum ART (F-07); copy line verbatim to 0080 r3. **No chip/glyph leak onto any 3/6/8-PX item.**

### 🎨 Polish / owner-eye (built-app, iteration lane — not blockers)
- **FRAME inline colour slider — full-hue range not conclusively exercised.** The `PICK COLOUR` inline control opened a single horizontal slider; in the brief session the reachable range read gold→cream (I landed a pale `#efe9d5`), and the coordinate-scaling of the preview frame made a saturated non-gold recolour hard to confirm by eye. The recolour **mechanism** is proven (swatch/recents/autosave all updated) and the field is the shared CR-11 `ColorField` (decision 0067) whose `OPEN PICKER` is full-spectrum — so this is almost certainly fine, but the owner should eyeball one **clearly saturated** hue (e.g. red/cyan) on the live marquee track to confirm the "ANY COLOUR" promise reads dramatically, not just as a gold tint.
- **Featured grid opportunity (not a defect):** NEW-THIS-WEEK shows the base MARQUEE (owned) but no ultimate; §4.1 permits swapping one featured slot to an ultimate at the owner's pleasure (config-only) — worth considering for the beta's most demo-able item.
- **Base vs ultimate co-listing:** in the FONTS/NAMEPLATES aisles the base (SCRIPT 3◇ / BRASS owned) sits directly under its ULTIMATE twin. Correct per the separate-SKU ruling, but the owner may want to eyeball that the near-duplicate names don't read as a dupe bug to a first-time shopper (grammar is fine; purely a taste check).

### Reachability
- Store: FRAMES aisle (screenshot) ✓ · NAMEPLATES aisle (a11y) ✓ · FONTS aisle (a11y) ✓ · MARQUEE ULTIMATE ItemSheet ✓ · non-ultimate neither-tell ✓ — **REACHED**
- Styler: FRAME ColorField+recolour ✓ · PLATE BRASS-ULT ColorField+gold plate ✓ · TITLE INK—ANY-COLOUR upgrade ✓ · KEEP ReconcileSheet (3× ULTIMATE chip @10) ✓ — **REACHED**
- **Adopt sheet ultimate row — NOT REACHED (seed gap).** Only reachable if a *published* card wears an *unowned-by-viewer* ultimate component; the three SKUs are hours old so no such seeded card exists (and adopt-from-another-designer needs a second author). Server-side the path rides ECON-03/04 verbatim (an unowned ultimate contributes its full 10 PX; `components` rows carry `tier`) per the draft §2.4 + P4. Matches the two existing recorded seed gaps (forged avatarConfig · adopted-from-another-designer). Not cheaply reachable → recorded, not forced.

### Environment / capture caveats (NOT app defects)
- **Landscape frame:** the device frame renders landscape at ~1568×705 (phone-width 390px column not reproducible; `resize_window` doesn't shrink the CSS viewport). Structural/order/grammar parity is viewport-independent and was fully assessed; phone-column proportion was not.
- **"SIGNAL LOST" on direct-nav to /store is a web-token artifact, NOT a W-5 bug.** The web build holds its auth token **in-memory**; a full page reload to `/store` loses it → the wallet query 401s → the store's `walletError` LoadError ("The shelves didn't answer"). Reaching the store via **in-app** nav (STORE keycap) preserves the token and the store loads clean (wallet 110 PX). Root-caused live (in-page fetch to `:4000` = PNA "Failed to fetch" on reload; `/api/me/*` succeed once the token is present).
- **Stale HMR console errors were red herrings.** A frozen console snapshot showed `ReferenceError: cosmeticTierSchema is not defined` (cards.bundle) and `Duplicate declaration "presetToComposition"` (styler). Both are **intermediate HMR states from the W-5 refactor** — the on-disk source is clean (`cosmeticTierSchema` defined in `schemas/common.ts:87` + imported in `response/cards.ts`; `presetToComposition` was *moved* to `src/styler/presets.ts`, imported at `[gameId].tsx:26`, zero local dup). A clean tab shows **no** console errors across the whole store+styler session. (A Metro bounce was done mid-session; the wedge was browser-side, cured by opening a fresh tab.)
- Screenshot capture intermittently timed out / returned cropped bands and once wedged the tab's content to ~144px height — a preview-renderer instability; a fresh tab recovered full-height rendering. Ref-based clicks + read_page/get_page_text were the reliable drivers throughout.

### CREATED — NONE
- **No purchases** (never held-to-buy; wallet unchanged at 110 PX), **no publishes**, **no new cards**, **no users**. The styler preview edits (marquee-ult + brass-ult + script-ult applied to one owned ELDEN RING published card) were **discarded via "LEAVE WITHOUT KEEPING → DISCARD EDITS"** — the card's list is intact (6 cards) and the edited card shows its original FRAME·CLEAN / NAMEPLATE·SLAB / FONT·CHAKRA restored. Preview-then-acquire never crossed into acquire.

### PARVATI-VERDICT: CLEAN
🚩 0 flags · 🎨 3 polish
SCREENS: store FRAMES aisle — REACHED · store NAMEPLATES aisle — REACHED · store FONTS aisle — REACHED · MARQUEE ULTIMATE ItemSheet — REACHED · non-ultimate neither-tell — REACHED · styler FRAME ColorField+recolour — REACHED · styler PLATE BRASS-ULTIMATE — REACHED · styler TITLE INK—ANY-COLOUR — REACHED · KEEP ReconcileSheet (3× compact ULTIMATE chip @10) — REACHED · Adopt sheet ultimate row — NOT REACHED (seed gap)
CREATED: NONE

---

## OWNER-WALK FIX WAVE (17 findings) — Parvati build-vs-design: game-page · collection · friend-profile · store · device-editor · styler — 2026-07-20

**Verdict:** 0 🚩 flag · 1 🎨 polish · 6 surfaces walked (5 fully REACHED, 1 sub-item NOT-REACHED on a seed gap). Measured vs the owner's own walk findings (each fix must visibly deliver what he asked) + the app's existing grammar + the uncommitted source. Demo user (demo@ingame.app). **CREATED/TOUCHED: nothing net** — no purchases, publishes, cards, users, reports, or blocks; the one device sticker nudge was restored to an identical composition; the collection coachmark flag was reset then re-dismissed back to its original `true`.
**Reviewed from** the running Expo-web app (:8082, device-frame chrome) captured live via claude-in-chrome — screenshots + DOM measurement (getBoundingClientRect / computed styles) where the skia renderer's capture froze — plus source read of the touched files.

### ✅ Delivered — each owner ask visibly met (present · placed · on-grammar)

**1. GAME PAGE (Hades own game + adopted card; Stardew)**
- **1a — adopted card cosmetics readout (CardSwitcher/EquipReadout):** the ADOPTED "Hades — Walkseed Cut" card now shows its read-only server-label readout like own cards do — `BASE · GRADIENT · FRAME · LINE · EFFECT · SOFT GLOW · PLATE · SLAB · FONT · CHAKRA` + the lock note "Adopted from walkseed_designer — adopted cards can't be edited." + UNEQUIP/SHARE/REMOVE (no EDIT). An own DRAFT card renders the same chip grammar with EDIT IN STYLER/DELETE — parity confirmed.
- **1b — "Edit catalog details" overflow → ABOUT edit mode + disclaimer:** the OWN game "…" opens GAME OPTIONS (SET AS NOW PLAYING · EDIT CATALOG DETAILS · REPORT THIS GAME · REMOVE FROM COLLECTION); EDIT CATALOG DETAILS jumps to ABOUT in edit mode with the header "EDITING CATALOG DETAILS" + the accuracy disclaimer "These facts are shared with everyone. Please edit only with accurate information — your changes are public and attributed to you." verbatim.
- **1c — explicit labeled rows + genres exactly once:** ABOUT shows STUDIO / PUBLISHER / RELEASE DATE labeled rows + a single GENRES row rendering `[ACTION][ROGUELIKE]` as chips (Hades) — no duplicate genre strip (the old meta subtitle + DISC-02 chip strip were retired, AboutTab.tsx:92-94). Stardew confirms absent-field omit: no PUBLISHER row (null), genres `[SIMULATION]`.
- **1d — community stats, absent rows omitted:** COLLECTION · FRIENDS HAVE IT (both always shown, 0 is meaningful) · AVG HOURS. avgRating / avgHours are gated `!= null` (AboutTab.tsx:149-160) — no faked zero average. Hades `1 · 0 · 96 AVG HOURS` with AVG RATING omitted; Stardew `1 · 0 · 210 AVG HOURS`, AVG RATING omitted.

**2. COLLECTION**
- **2a — equal-height header pills:** the "17 GAMES" pill and the "◇ 113" pixel counter measure identically — h=26px, top=58.97px, same gold fill + 5×8 padding recipe.
- **2b — flip hint is a layout-neutral absolute overlay:** the "Tap a card to flip it for your stats." coachmark renders `position: absolute` at top=808 (pinned above the tools bar, out of flow). Dismissing it via GOT IT moved **0 of 35** shelf card boxes (maxDelta 0px) — appear/dismiss reflow is dead (collection.tsx:387-393; the fix was reset + re-observed live).

**3. FRIEND PROFILE (walkseed_avatar / demo_curator2)**
- **3b — CONTRIBUTIONS teaser between ACHIEVEMENTS and the pin, shown at 0, routes:** "WALKSEED_AVATAR'S CONTRIBUTIONS · 0 CARDS DESIGNED" tapped → `/contributor/<id>`. (demo_curator2 shows "4 CARDS DESIGNED".)
- **3c — COMPARE HOURS is the cream/white secondary voice** (vs the orange VIEW COLLECTION primary).
- **3d — "…" opens a REAL sheet:** REPORT THIS USER with reasons (ABUSIVE PROFILE · IMPERSONATION · SPAM), a gated SUBMIT REPORT + CANCEL, and a BLOCK <user> action. The scrim-with-nothing bug is dead. (Cancelled — no report/block filed.)
- **3e — ACHIEVEMENTS count at the OWN-profile size (11, not 15):** friend "0 EARNED" and "1 EARNED" both render at fontSize **11px**, identical to the own profile's "8 EARNED" (11px). Parity confirmed.

**4. STORE**
- **4a — lead header reads SPOTLIGHT** (not NEW THIS WEEK), six items (MARQUEE · FROST · HOLOGRAPHIC · BRASS · CARBON · BERRY).
- **4b — THE INDEX — ALL AISLES is aisles-only:** 8 aisles (STICKER PACKS · EFFECTS · FINISHES · FRAMES · NAMEPLATES · FONTS · DEVICE SHELLS · SCREEN THEMES), NO top-up row inside the index.
- **4c — new bottom two-entry section routes correctly:** PIXEL TOP-UP → the TOP UP view (pixel packs 10/$1.99 … 140/$19.99 BEST RATE + STARTER PACK claimed); WALLET → the WALLET view (balance + LEDGER). Both in the Index row grammar.

**5. DEVICE EDITOR — status slot is layout-neutral through drag→release→drag**
- Selecting a placed sticker mounts the PLACING readout inside `device-status` (35.2px = readout row 18.2 + a **fixed 17px saveSlot** — device.tsx:963 constant `height`). The saveSlot reserves its 17px **even when the save-line is absent (settled)** — the direct proof the SAVING…↔settled toggle can't reflow. Driving a real transform (rotation 0°→2°→1°→0° via the discrete steppers, each firing the autosave pipeline), the status block held **exactly 35.2px (18.2 + 17)** at every step — no growth/shrink. **Left via the discard-equivalent path** (blur-commit of the restored state); the composition read back **identical to the original** (7 stickers, star rotation 0). The owner's device is untouched.

**6. STYLER (opened from Elden Ring; nothing kept — exited from PICK-A-START)**
- **6a — START FROM fan: 6 curated + DEFAULT, all coherent (taste verdict: PASS):** NEBULA (indigo, gold crescent + stars) · EMBER (coal + orange ember glow, stub frame) · HORIZON (synthwave pink/gold sun over cyan bars) · GROVE (forest botanical medallion, lime frame) · ARCADE (magenta triangle + cyan bar, pixel font) · MONOLITH (minimal gold diamond in a cream ring) — each reads as a distinct, purposeful, palette-coherent template. DEFAULT (plain floor) follows the six; the user's saved presets ride alongside after it. **Not "hideous" — a clean, cohesive set.** Genre-fit **works**: Elden Ring's genres are RPG + Soulslike; NEBULA (rpg, idx 0) and EMBER (soulslike, idx 1) tie at score 1, and the curated-order tiebreak (roster.ts:438) correctly leads NEBULA. Not a miss.
- **6b — SURPRISE ME reads coherent, not noise:** three deals → an ARCADE-family cluster (gold star + magenta diamond), a GROVE deal (green triangle + cream bars, lime/dust/arch/chakra), and another ARCADE cluster (cyan/magenta diamonds + gold star). Every deal drew its face + chrome from a single curated palette family.
- **6c — no premium cost on any start/surprise:** the reconcile/cost strip never appeared; the wallet held 113 PX throughout; every readout referenced free-tier cosmetics only (matches the startsources.test.ts zero-cost-stack guarantee).

### 🎨 Polish / owner-eye (built-app, iteration lane — not a blocker)
- **Adopted-card readout label vocabulary diverges from the own-card readout.** The cross-user/adopted path (EquipReadout.tsx:88-95) labels the nameplate slot **"PLATE"** and surfaces a **"BASE"** chip; the own-card composition path (EquipReadout.tsx:128-135) labels the same slot **"NAMEPLATE"** and omits base entirely. So flipping between an adopted card and an own card in the same switcher shows the nameplate slot renamed (PLATE↔NAMEPLATE) and a BASE chip appearing/vanishing. The core ask (adopted card shows a read-only server-label readout like own cards) IS met; this is a label-parity tidy for whoever wants the two readouts to read word-for-word identically.

### NOT-REACHED (seed gap — recorded, not forced)
- **3a — a FRIEND's PINNED FAVOURITE card.** No seeded friend/other user has a `favouriteGame` set: the dev seed pins Hades only for the self/demo user (seed-dev.ts:147), and walk-seed.ts creates walkseed_avatar/designer/ultimate with no favourite. Both reachable friend profiles (walkseed_avatar, demo_curator2) carry `favouriteGame: null` → the section is correctly absent (user/[id].tsx:415 `if (!favourite) return null`). The **self** profile's PINNED FAVOURITE hero (Destiny 2) renders, and FriendPinnedFavourite mirrors that grammar gated on a non-null payload — so the render path is present and sound, just not exercisable with the current seed.
- **1d — the AVG RATING star cell.** No game in the seed carries community ratings, so `avgRating` is null on every game walked → the star row is (correctly) omitted everywhere. The omit-behavior is confirmed on two games; the `{avgRating.toFixed(1)}★` render (AboutTab.tsx:151) couldn't be seen with populated data.

### Environment caveats (NOT app defects)
- Web reloads drop the in-memory auth token (SIGNAL LOST) — flows were run back-to-back with re-logins between them, per the qa-runbook web caveat.
- The skia card/sticker renderer intermittently froze `Page.captureScreenshot` (a preview-renderer instability, W-5-documented); a screenshot retry or a fresh tab recovered it, and DOM measurement (getBoundingClientRect / computed styles / ref-clicks) drove the frozen stretches reliably.

### PARVATI-VERDICT: CLEAN
🚩 0 flags · 🎨 1 polish
SCREENS: game-page 1a adopted-readout — REACHED · 1b edit-catalog-details+disclaimer — REACHED · 1c labeled-rows+genres-once — REACHED · 1d community-stats-omit — REACHED (AVG RATING star NOT-REACHED, seed) · collection 2a equal-height pills — REACHED · 2b flip-hint layout-neutral — REACHED · friend 3a pinned-favourite — NOT-REACHED (no friend has a pin seeded) · 3b contributions-teaser+route — REACHED · 3c compare-hours secondary voice — REACHED · 3d real report/block sheet — REACHED · 3e achievements 11px parity — REACHED · store 4a SPOTLIGHT+6 — REACHED · 4b index aisles-only — REACHED · 4c top-up/wallet rows route — REACHED · device 5 status-slot layout-neutral — REACHED · styler 6a 6-curated+DEFAULT+genre-fit — REACHED · 6b surprise coherent — REACHED · 6c no premium cost — REACHED
CREATED: NONE (device sticker nudge restored to identical; coachmark flag restored)

---

## STASH-3 WAVE (add-game card fork · full-list route · inline gallery · structural styler · row-body nav · about-disclaimer) — 2026-07-21

**Verdict:** 0 🚩 flag · 2 🎨 polish/owner-eye · 6 surfaces walked (all core beats REACHED; a few sub-items code-confirmed or NOT-REACHED on seed limits, cited). Measured vs product-spec **0.66** (add-flow completion) + api-contract **0.81** (gallery sort/cursor paging), the stash-3 source (uncommitted + local commit `6408da7`), and the app's existing grammar. Demo user (demo@ingame.app).
**Reviewed from** the running Expo-web app (:8082, claude-in-chrome at localhost:8082) captured live, plus source read + Postgres (`local_ingame`) inspection.

### 🚩 FLAG — NONE. Every stash-3 surface renders and behaves to spec.

### ✅ Matches (present · placed · on-grammar — confirmed live)

**1. ADD-GAME completed flow — the CARD FORK (walked END-TO-END, both cases)**
- **Search-status jar FIXED (live-measured):** the NO-MATCHES panel is the permanent height anchor (top=150px) with the spinner as an absolute overlay; the "NONE OF THESE?"/CREATE anchor held at top=222px across settled ↔ mid-type states — typing does NOT shift the screen (the saveSlot + coachmark idioms, working).
- **Post-add sequence:** stats/status beat ("ADDED TO YOUR SHELF" + SET A STATUS chips) → button reads **NEXT** (Next-ish, correct — a following beat) → the **CARD FORK**.
- **Populated fork** (added *Smoke Odyssey Delta*, 1 community card): header **"ADOPT A CARD — OR DESIGN YOUR OWN"** + subtitle · **"COMMUNITY CARDS — 1"** top-6 strip (the card BY SMOKEB3740, FREE) · gold **"DESIGN YOUR OWN ›"** · **"KEEP THE DEFAULT FOR NOW"** tertiary. **DESIGN YOUR OWN → the Styler for that game (`/styler/<gameId>`) → LEAVE/DISCARD returns to the fork** (verified). **KEEP THE DEFAULT → Collection** (verified). Tapping the strip card opens the **AdoptCardSheet** (DESIGNED BY SMOKEB3740 · ADOPTED 1× · HOLD-TO-ADOPT · FREE · SHARE) — adopt affordance present (not held).
- **Empty-community fork** (added *Skylanders*, card-less): the fork **still renders** — header + empty-case subtitle *"No community cards for this game yet — design your own in the Styler, or keep the default for now."* + DESIGN YOUR OWN + KEEP THE DEFAULT, **no strip / no SEE-ALL, no silent skip.** Confirmed.
- **SEE ALL {N} › door — correctly ABSENT** in both the fork and inline gallery: `CommunityGallery.tsx:103` gates it on `total > items.length` (strip N: fork 6, inline 12). Seed max is 5 community cards (Destiny 2) < both, so the door hides everywhere — a **seed limitation, not a defect**. Its target route (`/game/[id]/cards?adopt=1`) was verified directly (below).

**2. Full-list route `/game/[id]/cards`** — shell renders on direct-nav (COMMUNITY CARDS head + ‹ RETURN; LoadError on token-less reload = the documented in-memory-web-token artifact). Reached **populated** via in-app soft-nav (token preserved): **TOP (active) / NEW SectionSwitch toggle** · caller-visible count ("1 CARD" / "5 CARDS") · **"That's everything." terminal** at small N · provenance chips **BY YOU/YOURS · ADOPTED · FREE** (0.68 byViewer/adopted). **Adopt affordance gated by `?adopt=1`** (`cards.tsx:40` `canAdopt = adopt==='1'` → cells tappable → AdoptCardSheet; **CATALOG posture passes no adopt → `onPress` undefined, browse-only**, code-confirmed + cells render identically since the gating is on-tap). LOAD-MORE seam: N≤5 < GALLERY_PAGE(24) → single page + terminal, no LOAD MORE (correct; >24 not reachable in seed).

**3. Inline gallery (game-page CARDS tab, OWN posture — Hades):** **"COMMUNITY CARDS — 1"** + **"SORT: TOP ›" → toggles to "SORT: NEW ›"** live (the SORT re-read works). SEE-ALL absent at N≤12 (correct). OWN "YOUR CARDS FOR HADES — 4" (2 drafts · adopted · DESIGN NEW) with the equipped server-label readout + adopted-lock note also present. CATALOG browse-only = the same `cards`-route `canAdopt` gate (code-confirmed; not separately walked live).

**4. STYLER — the STRUCTURAL START-FROM fan (taste verdict: PASS).** Fan order exactly per `roster.ts` `START_SOURCES`: **DIAGONAL SPLIT · INSET PANEL · BANDED THIRDS** (backdrops) → **ARC BANNER** (the game's REAL title arced) · **TAG + MONOGRAM** (big monogram watermark + corner tag) · **CAPTION BLOCK** (titles) → **CENTERED EMBLEM** (ringed pixel-invader glyph = the "ringed invader") · **BADGE CLUSTER** (crown/lightning topper over a star-pipped shield = "crown-over-shield") (emblems) → **DEFAULT** last, user presets after. Each thumbnail reads as a distinct, purposeful STRUCTURE a user would reach for. **Base re-derive (the Murr fix) — VERIFIED:** changing the layer-rail BASE (indigo → white) re-derived the editor preview + all 15 frame-roster thumbnails to the new base **live**; `[gameId].tsx:503-524` feeds `currentBase = draft?.base` into the fan memo (with `currentBase` in deps) and every `START_SOURCES` compose derives tones via `tonesFromBase(base)` — **no hardcoded indigo** (the pick-a-start fan isn't re-openable mid-edit, but its tone input is that same demonstrably-re-deriving `currentBase`). **DEAL A CARD ×4:** coherent, zone-respecting (emblem lands in the layout's slot, never over the title/nameplate), varied [ARC+DIAGONAL emblem-free · INSET+BADGE+CAPTION · TAG-MONOGRAM+INSET+BADGE], one emblem-free. **LEFT via "LEAVE WITHOUT KEEPING? → DISCARD EDITS"** ("the draft is deleted") — no publishes/keeps; draft deletion confirmed (0 residue in DB).

**5. COLLECTION row-body tap (SHELF view):** **card face tap → FLIPS** (shows YOUR STATS back — HOURS/COMPLETE/STATUS/CARD ARTIST — URL stays `/collection`, no nav); **row-body tap → the Game page**; a11y label **"Open {game}"**. The card is a `FlipCard` sibling of the row-body Pressable (the P13-F3 nested-press rule). *(LIST view — a separate mode — navigates the whole row incl. the static thumb, no flip, by design: `flippableView = shelf || grid`.)*

**6. Game-page ABOUT edit disclaimer:** EDIT CATALOG DETAILS → the disclaimer now renders as the standard **InlineBanner** (full accent-bordered box: "EDITING CATALOG DETAILS" + *"These facts are shared with everyone. Please edit only with accurate information — your changes are public and attributed to you."*), **not the old left-bar box.** (Edit opened, nothing changed, DONE.)

### 🎨 Polish / owner-eye (iteration lane — not blockers)
- **DEAL TAG+MONOGRAM + BADGE CLUSTER co-occurrence reads dense.** When a deal draws the TAG+MONOGRAM layout (a large monogram watermark) *and* a BADGE CLUSTER emblem, the big "S" watermark and the shield sit close in the mid-face — legal (zones respected, no title/nameplate overlap) but slightly busy. Owner eye on whether monogram layouts should suppress/relocate the emblem.
- **SEE-ALL door + LOAD-MORE seam never render with the current seed** (max 5 community cards < strip 6 / inline 12 / page 24). Both are code-correct and their target route was verified directly, but the owner can't *see* those affordances until a game carries >6/>12/>24 published cards — a seed-content gap worth a richer walk-seed if he wants them demoable.

### Reachability
- ADD-GAME: search jar ✓ · status beat ✓ · populated fork (header/strip/DESIGN-YOUR-OWN→styler→back/keep→collection/adopt-sheet) ✓ · empty fork ✓ — **REACHED** · SEE-ALL door — NOT-REACHED (seed max 5 < strip; correctly hidden, target verified directly)
- Full-list route: shell ✓ · populated TOP/NEW/terminal/provenance ✓ · adopt-gating ?adopt=1 vs catalog ✓ (code + live) — **REACHED** · LOAD-MORE — NOT-REACHED (N<24)
- Inline gallery: OWN SORT toggle TOP↔NEW ✓ — **REACHED** · CATALOG browse-only — code-confirmed (not separately walked) · FRIEND posture — not walked (out of focus)
- STYLER: structural fan order + taste ✓ · base re-derive ✓ · DEAL ×4 ✓ · leave-without-keeping ✓ — **REACHED**
- COLLECTION row-body: card-flip ✓ · row-body nav ✓ · a11y "Open {game}" ✓ — **REACHED**
- ABOUT disclaimer InlineBanner ✓ — **REACHED**

### Environment caveats (NOT app defects)
- Direct URL nav drops the in-memory web auth token → SIGNAL LOST (documented); the full-list populated view was reached via in-app soft-nav (token preserved). The skia renderer intermittently froze `Page.captureScreenshot` (retry/JS-measurement recovered). Device frame renders landscape (phone-column proportion not assessed).

### CREATED / TOUCHED — all reversed
- **Added → removed 2 games** from demo's collection (*Smoke Odyssey Delta*, *Skylanders*; both backlog/0hrs) — removed via DB (equivalent to the standing remove path, chosen for determinism under renderer instability); **demo back to 17 games** (verified).
- **Temporarily un-soft-deleted the junk game "Smoke Odyssey Delta"** (`7556183c…`, a prior load-harness row already `deleted_at 2026-07-19T20:47:14.616Z`) to reach the *populated* add-fork with a not-in-collection card-bearing game (every live-carded game is otherwise already in demo's collection). **Restored its exact `deleted_at` + `deleted_by` after** — net zero.
- **Styler draft** on Smoke Odyssey Delta (START WITH THIS) → **discarded via DISCARD EDITS**; draft deleted (0 residue confirmed in DB).
- **No purchases** (wallet 113 unchanged) · **no publishes** · **no adoptions** (AdoptCardSheet opened + closed, never held) · **no reports/blocks** · **no users created**.
- Browser-local only: collectionView UI pref cycled (grid→list→shelf) + one card flipped — ephemeral per-browser UI state, not demo account data.

### PARVATI-VERDICT: CLEAN
🚩 0 flags · 🎨 2 polish
SCREENS: add-game search-jar — REACHED · status-beat(NEXT) — REACHED · populated fork(header/strip/design-your-own→styler→back/keep→collection/adopt-sheet) — REACHED · empty fork(no strip, no silent skip) — REACHED · SEE-ALL door — NOT-REACHED (seed max 5 < strip 6; correctly hidden, target route verified directly) · full-list TOP/NEW/terminal/provenance — REACHED · full-list adopt-gating ?adopt=1 vs catalog — REACHED (live+code) · full-list LOAD-MORE — NOT-REACHED (N<24) · inline gallery OWN SORT TOP↔NEW — REACHED · inline CATALOG browse-only — code-confirmed · styler structural fan+taste(PASS) — REACHED · styler base-re-derive(Murr) — REACHED · styler DEAL ×4 coherent/zone-respecting/emblem-free — REACHED · styler leave-without-keeping — REACHED · collection row-body nav + card-flip + a11y "Open {game}" — REACHED · about-edit disclaimer InlineBanner — REACHED
CREATED: 2 games added→removed (Smoke Odyssey Delta, Skylanders; demo back to 17) · junk game Smoke Odyssey Delta un-deleted→restored to exact deleted_at · styler draft discarded (0 residue) · no purchases/publishes/adoptions/users
