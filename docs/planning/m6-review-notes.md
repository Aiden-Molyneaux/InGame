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
