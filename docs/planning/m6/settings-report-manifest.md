# P12 — Settings §0.10 slice + the MOD-01 ReportSheet · build manifest

> **Surfaces:**
> - `app/settings.tsx` (Settings lean-list shell — the **§0.10 slice only**) + `app/settings/blocked.tsx`
>   (the SOC-09 BLOCKED page).
> - `src/components/report/ReportSheet.tsx` (+ `ReportConfirm` beat) — the app-wide `/drawer` report form,
>   target-aware (card · game · user), wired to the **card** (game-page community-card inspect) and
>   **game** (game-page overflow) contexts. **User entry rides P8/P9** — the sheet is built target-ready.
> **Boards:** `docs/design/mockups/settings/settings-states.html` (S1/S2 list · S6 BLOCKED · S7b sign-out
> ConfirmSheet — I build ONLY those; S3 unverified · S4/S5 notifications · S7 delete · S8–S13 feedback are
> later-milestone rows) · `docs/design/mockups/report-sheet/report-states.html` (A1–A3 · B1–B3 · C1–C2 · D1
> — the full converged matrix).
> **Contract:** `GET /me/blocks` · `DELETE /me/blocks/:userId` · `POST /me/blocks` (LIVE, P1) ·
> `POST /reports {targetType,targetId,reason,details?}` (**NOT built — P7, in tonight's server queue**;
> built against the drawn shape, 404s live until P7). api-contract §Social/§Moderation (0.69).
> **CLIENT-ONLY** — no `apps/api/**` / `packages/shared/**` edits (concurrent server agent owns them
> tonight). Report request/response schemas are defined **locally** in `reportApi.ts` (see GAP-R1).

Status legend: **OWED** (build it) · **PRE** (exists in code — cite) · **EXPECTED(cite)** (deferred to a
later milestone, absent/stubbed honestly) · **ASSUMPTION** (a call I made, recorded) · **GAP** (a
board/contract mismatch to flag) · **SEAM(P#)** (a live-pending server dependency).

---

## ARCH callouts

- **A1 — routes.** `app/settings.tsx` (route `/settings`) + `app/settings/blocked.tsx` (route
  `/settings/blocked`). Expo-router file-based; `settings.tsx` (leaf) + the `settings/` folder co-exist
  (a leaf route and a same-named nested route resolve independently). Reached from the Profile header
  (see A2). Both are tier-2 pages under the persistent `DeviceShell`/NavBand (the FlowHeader grammar:
  `ScreenHead` title + a `TertiaryLink chevron="leading-back"` back-seam — the app-wide pattern, add-game/
  device/game/store/contributor all use it; there is no built `FlowHeader` component).
- **A2 — Settings reach + the SIGN-OUT single home.** SIGN OUT lives on the Profile today
  (`app/(tabs)/profile.tsx:35` `signOut()` + the bottom `ScreenButton`). Per §0.10 ("sign-out homed in")
  I **relocate** the sign-out ACTION into Settings (ACCOUNT section) and **remove** the Profile's bottom
  SIGN OUT button, leaving ONE home. I **add a Settings entry point to the Profile header** (a gear
  `TertiaryLink`/icon → `/settings`) per the board's reach pattern (0076 §0.10; the profile-states M7
  EDIT/SHARE tools stay deferred — only the Settings door opens now). `logoutTeardown` stays the shared
  teardown; Settings calls it.
- **A3 — the ReportSheet is ONE component, target-driven.** `target: { type: 'card'|'game'|'user',
  id, name, reasons, ... }`. Reasons + the details-required set + the header/return copy + whether BLOCK
  shows (user only) are all derived from `target.type`. Card/game callers pass `onReport` handlers; the
  sheet owns the reason-pick → validate → in-flight → ReportConfirm → error-Toast → offline-gate states.
- **A4 — block reuse, no endpoint collision.** `POST /me/blocks` is already an RTK mutation
  (`useBlockUserMutation` in `communityApi.ts`). The ReportSheet's user-target BLOCK-alongside and the
  game-page's designer-block both reuse it (no second `blockUser` — a duplicate injectEndpoints name
  would collide). The BLOCKED page's `getBlocks`/`unblockUser` live in my new `settingsApi.ts` under a
  new `Blocks` tag; `unblockUser` (`DELETE /me/blocks/:userId`) invalidates `Blocks` (+ `CommunityCards`/
  `TrendingCards` so an unblocked designer's cards re-surface). **ASSUMPTION:** a block done OUTSIDE the
  blocked page (report/profile context) does not invalidate `Blocks` (communityApi's `blockUser` predates
  the tag) — the blocked page uses `refetchOnMountOrArgChange` so it's fresh on open. Recorded; not a
  correctness bug (you're never viewing the blocked list at the moment you block from a report).
- **A5 — SYS-10 offline is a WRITE-GATE, calm.** Report submit + unblock are writes → the `Offline`
  strip + a gated commit (relabelled "SUBMIT WHEN ONLINE" on the report; unblock disabled) — auto-resumes,
  never the red error surface. Reads (the blocked list, the settings list) still render from what's cached.
- **A6 — ReportSheet builds on `PulledSheet`.** Reusing the one in-screen drawer primitive buys
  keyboard-lift (the details field), scroll-lock, hardware-back, reduce-motion, and the in-screen overlay
  (never an OS Modal) for free. **POLISH deviation:** PulledSheet renders a grab handle; the board draws a
  handle-less "summoned" drawer. This matches the SHIPPED app-wide convention — the decision-0040
  `ConfirmSheet` (also "summoned" in its board) already composes PulledSheet WITH the handle. Consistency
  with the shipped grammar + the free form-handling outweigh the cosmetic delta; flagged for burt/parvati.

---

## New API slices (injectEndpoints — api.ts untouched)

### `src/store/settingsApi.ts`
- `enhanceEndpoints({ addTagTypes: ['Blocks'] })`.
- `getBlocks` → `GET /me/blocks`, `providesTags: ['Blocks']`, parses `blocksListResponseSchema`
  (shared, PRE). **LIVE (P1).**
- `unblockUser` → `DELETE /me/blocks/:userId`, `invalidatesTags: ['Blocks','CommunityCards','TrendingCards']`,
  returns `OkResponse`. **LIVE (P1).**

### `src/store/reportApi.ts`
- `submitReport` → `POST /reports`, body `{ targetType, targetId, reason, details? }`. **SEAM(P7)** —
  the route is not built yet (P7 tonight). Wired to the drawn contract shape; 404s live until P7.
- **GAP-R1 (local schemas).** No `reports` request/response schema exists in `packages/shared` (server
  agent owns it tonight; the P7 packet will add it). Per the task's build-against-the-seam rule I define
  `reportApi.ts`-local zod: `createReportRequestSchema` ({ targetType: enum card|game|user, targetId:
  string, reason: string, details?: string }.strict()) + a lenient `reportResponseSchema`
  (`z.object({}).passthrough()`) parsed at the seam. When P7 lands its shared schema, this slice should
  swap to import it (a follow-up, noted for the orchestrator).

---

## Reason enums (per target — from the boards; the client mirrors the MOD-01 details rule)

The api-contract pins only `incorrect_info` and the "duplicate" path by name. The remaining codes are a
**client ASSUMPTION** (snake_case, contract style) — the exact server enum is P7's to define. **SEAM(P7)
note for the server agent — the exact codes I coded against are below; align P7's enum or tell me.**

| target | reason label (board)          | code (assumed)     | details required? |
|--------|-------------------------------|--------------------|-------------------|
| card   | OFFENSIVE OR NSFW             | `offensive`        | no                |
| card   | WRONG GAME                    | `wrong_game`       | no                |
| card   | SPAM OR LOW-EFFORT            | `spam`             | no                |
| game   | DUPLICATE — ALREADY IN CATALOG| `duplicate`        | no                |
| game   | INCORRECT INFO                | `incorrect_info`   | **yes** (MOD-01)  |
| user   | ABUSIVE PROFILE               | `abusive_profile`  | no                |
| user   | IMPERSONATION                 | `impersonation`    | **yes** (board C1)|
| user   | SPAM                          | `spam`             | no                |

Details-required set = `{ incorrect_info, impersonation }`. The details note is **moderator-facing only**
(MOD-01 — outside MOD-07 screening); the field copy says so.

---

## State-by-state — SETTINGS board (§0.10 slice ONLY)

### S1/S2 — the Settings lean list (`app/settings.tsx`)
The board draws many rows; the §0.10 slice ships a SUBSET. Rows the board draws but M6 **defers are
ABSENT, not disabled** (0076 §0.10). Cited:

- **ACCOUNT**
  - EMAIL row — `ListRow` icon+label+value(email)+`✓ VERIFIED`/`UNVERIFIED` sub, from `GET /me`
    (`email`, `emailVerified`). **OWED.** Value = `me.email`; verified-state sub from `me.emailVerified`.
    Row is display-only (no edit page at M6 — tapping is inert; **ASSUMPTION**: email-change page is not
    in the §0.10 slice, so the row shows state without a `>` destination). The AUTH-08 resend
    **InlineBanner** (S3) is **EXPECTED(M7)** — soft-verify recovery rides the notifications/verify work;
    at M6 the row states verified/unverified honestly without the resend action.
  - USERNAME row — label + `@username` value. **OWED** (display-only; the PROF-06 change page is not in
    the slice → inert, no `>`). **ASSUMPTION** recorded.
  - SIGN OUT — an `act-key secondary` (cream `ScreenButton`) that raises the **sign-out `ConfirmSheet`**
    (S7b — calm/accent, NOT red; decision 0040 · reversible session-end). **OWED** (relocated from Profile,
    A2). On confirm → `logoutTeardown()` + `router.replace('/sign-in')`.
  - DELETE ACCOUNT — **EXPECTED(M8)** (0076 §0.3 — beta ships without in-app deletion). **ABSENT** per the
    "defer = absent" rule (not a red disabled row).
- **PRIVACY & SAFETY**
  - LIMITED PUBLIC PROFILE `Toggle` (PROF-03) — **EXPECTED(later)**. The privacy toggle is not named in the
    §0.10 slice (0076 §0.10 lists only blocked-list + account basics + legal). **ABSENT** at M6. **ASSUMPTION**
    recorded — flag if the owner wants the PROF-03 toggle pulled into the slice.
  - BLOCKED USERS row — `ListRow` with the live count → `/settings/blocked`. **OWED.** Count from
    `getBlocks().data.blocks.length` (renders when loaded; no count while loading).
- **PREFERENCES → NOTIFICATIONS** — **EXPECTED(M7)** (rides push). **ABSENT.**
- **STAFF → ADMIN CONSOLE** — **EXPECTED(M7)** (MOD-04 console). **ABSENT** (also role-gated).
- **FEEDBACK & SUPPORT** (FEEDBACK & BUG REPORTING · HELP & CONTACT) — **EXPECTED(M7)** (SYS-11 feedback is
  M7 per §7). **ABSENT.**
- **ABOUT & LEGAL**
  - TERMS OF SERVICE → `/legal/terms` (PRE route). **OWED** row.
  - PRIVACY POLICY → `/legal/privacy` (PRE route). **OWED** row.
  - VERSION — display-only `2.x` value. **OWED** (**ASSUMPTION**: a static version string; no build-info
    source is wired — I render the `expo-constants`/package version if trivially available, else a static
    placeholder; recorded).
  - The DEV-04 "screen theme is in the Device editor" footnote. **OWED** (verbatim board copy).

### S6 — the BLOCKED page (`app/settings/blocked.tsx`)
- FlowHeader `‹ RETURN TO SETTINGS` + BLOCKED title. **OWED.**
- The calm `bu-note` — "Blocked people can't find you… They're never told." **OWED** (SOC-09/MOD-09 copy).
- List rows: `Avatar` (monogram) + username + `BLOCKED {date}` + a cream UNBLOCK key. **OWED**, from
  `getBlocks` (`blockedPersonSchema`: userId·username·avatarUrl·blockedAt). avatarUrl via `resolveMediaUrl`.
- UNBLOCK → the **`ConfirmSheet`** (decision 0040 grammar; the **MOD-09 lone-exception** affordance) →
  `unblockUser(userId)` → list refresh (tag invalidation). **OWED.** Not destructive-red — unblock is a
  restorative, low-stakes action; I use the **secondary/calm** confirm tone (ASSUMPTION: unblock isn't
  "destructive"; the board's UNBLOCK key is a plain cream keycap, no red — recorded).
- **Empty state** — "No one blocked" quiet `SectionEmpty`/copy (the board defers the empty variant as
  "minor"; I ship a quiet empty since the demo DB may have zero blocks). **OWED.**
- **Loading** — `Skeleton` rows. **OWED.**
- **Offline** — the `Offline` strip (reads still render from cache if present; unblock gated). **OWED.**
- **Load error** — `LoadError` "Signal Lost" + RETRY. **OWED.**

---

## State-by-state — REPORT board (the full ReportSheet)

`ReportSheet` (`src/components/report/ReportSheet.tsx`) — composes `PulledSheet`; internal state machine:
`pick → (details) → submitting → filed | error | offline-gate`, plus (user) `blocking → blocked`.

- **A1 — card · launch, no reason** → SUBMIT dormant + the "pick a reason" hint. **OWED.**
- **A2 — game · INCORRECT INFO selected, details empty** → the `TextField/area` discloses under the
  selected reason; SUBMIT dormant while empty (MOD-01). **OWED.** Details field = `TextField` (the F-09
  named cream-inset exception, PRE).
- **A3 — game · DUPLICATE selected, no note** → SUBMIT armed (duplicate needs no note). **OWED.**
- Reason rows: flat hairline rows; selected = accent border + a `StateMark`-style corner pip (F-09; orange
  on-screen, never pink). **OWED** (rendered with theme `scr.accent`).
- **B1 — submitting / in-flight** → SUBMIT holds pressed (spinner), CANCEL dims. **OWED.**
- **B2 — filed / ReportConfirm** → the calm in-sheet confirm: accent check seal · "THANKS — REPORT FILED /
  WE'LL TAKE A LOOK" · MOD-02 soft-hide copy **without a threshold** · **console-is-M7: copy must NOT
  promise review speed** (0076 §0.5) · DONE. **OWED.**
- **B3 — submit error → Toast + RETRY** → the `Toast` (tone error, `onRetry`); drawer keeps reason+note,
  SUBMIT re-armed. **OWED** (reuse the lifecycle `Toast`).
- **C1 — user · report + BLOCK alongside** → user reasons; IMPERSONATION requires details; SUBMIT armed;
  **BLOCK** past an OR divider — an outlined alert strip (NOT a keycap, NOT a reason) → the block
  `ConfirmSheet` (SOC-09, decision 0040). **OWED** (block reuses `useBlockUserMutation`, A4).
- **C2 — post-block confirmation** → the block ReportConfirm variant: red ⊘ seal · "YOU BLOCKED {name}" ·
  severed/mutually-invisible/silent copy · MANAGE IN SETTINGS (→ `/settings/blocked`) + DONE. **OWED.**
- **D1 — offline / writes-gate** → the `Offline` strip under the header, reason+note kept, SUBMIT →
  "SUBMIT WHEN ONLINE" gated, calm (SYS-10). **OWED.**

---

## Entry-point wiring (minimal + surgical)

- **CARD report** — the game-page **community-card inspect** (`AdoptCardSheet`, the reportable *published*
  card; the board A1 card = "DESIGNED BY RIKO"). The sheet's existing `⋯` overflow currently opens the
  designer-block confirm directly; I add an optional `onReport` prop → when set, `⋯` opens a small inline
  action menu (REPORT THIS CARD / BLOCK DESIGNER). Back-compat: `onReport` absent → `⋯` keeps the direct
  block (existing tests unaffected). The container (`app/game/[id].tsx`) wires `onReport` → open
  `ReportSheet` with `target={type:'card', id:card.id, name:card.name}`. **ASSUMPTION/GAP:** the task names
  "CardDetailSheet ⋯/overflow", but `CardDetailSheet` is the *own* equipped-card enlarge (you don't report
  your own card) — the reportable card on the game page is the community card in `AdoptCardSheet` (the
  "gallery inspect context"). I wired the card-report there. Recorded for parvati.
- **GAME report** — the game-page **overflow** (`app/game/[id].tsx` "Game options" `PulledSheet`): a REPORT
  row beside SET NOW PLAYING / REMOVE. → `ReportSheet` with `target={type:'game', id:gameId, name:title}`.
  **OWED.**
- **USER report** — **EXPECTED(P8/P9).** The natural host (the friend-profile actions sheet, PROF-05
  overflow) is P8/P9, not built tonight. The `ReportSheet` is built fully **user-target-ready** (reasons,
  details, BLOCK-alongside, block/blocked confirms) but **no user entry point is wired**. Recorded.

---

## Reuse ledger (PRE — cite, don't rebuild)

- `PulledSheet` (drawer primitive) · `ConfirmSheet` (0040 confirm — unblock, sign-out, block) ·
  `ScreenButton` (keycaps; `destructive`/`secondary`/`primary`) · `TextField` (F-09 cream inset — details
  note) · `ScreenHead` + `TertiaryLink chevron="leading-back"` (FlowHeader grammar) · `Avatar` (monogram) ·
  lifecycle kit `Skeleton`/`LoadError`/`Offline`/`Toast`/`SectionEmpty`/`EmptyState` · `useBlockUserMutation`
  (communityApi) · `resolveMediaUrl` · `logoutTeardown` · theme `themedStyles`/`useTheme` (0070 tokens),
  F-06 scale (21/15/11/9).

## New files (OWED)
- `app/settings.tsx` · `app/settings/blocked.tsx`
- `src/components/report/ReportSheet.tsx` (+ the inline `ReportConfirm` beat) · `src/components/report/reasons.ts`
  (the target→reasons map)
- `src/store/settingsApi.ts` · `src/store/reportApi.ts`
- Tests: `ReportSheet.test.tsx` · `app/settings/blocked` coverage · entry-handler coverage.

## Touched files (surgical)
- `app/(tabs)/profile.tsx` — remove the bottom SIGN OUT button; add a Settings header entry point.
- `app/game/[id].tsx` — game-report overflow row + card-report `onReport` wiring + mount the `ReportSheet`.
- `src/components/game/AdoptCardSheet.tsx` — additive `onReport` prop + the `⋯` inline action menu.

---

## BOOT check (:8082 — login demo@ingame.app / InGameDemo1!, REAL taps)
1. Profile → (new) Settings door → the lean list renders (ACCOUNT · PRIVACY&SAFETY→BLOCKED · ABOUT&LEGAL).
2. Settings → BLOCKED. If the demo DB has no blocks: block a gallery designer (game page → community card
   → ⋯ → BLOCK) to create one, open BLOCKED, UNBLOCK it → list refreshes. **Leave the DB as found.**
3. Game page → community card → ⋯ → REPORT → walk reasons; game overflow → REPORT → INCORRECT INFO →
   details validation (dormant→armed) → CANCEL out. **Do NOT submit live** (POST /reports 404s until P7).
4. Sign-out ConfirmSheet raises (calm), CANCEL backs out (do not actually sign out mid-BOOT).

## BOOT outcome (2026-07-17, :8082)

- **App BOOTS with all P12 code** — sign-in renders, the DeviceShell + 5-key NavBand render, login
  succeeds (`/collection`), tab nav works (via the accessibility-tree ref; screen-coordinate taps on the
  shell nav were unreliable — the known web pushState-desync, review-notes). ✅
- **BUG CAUGHT + FIXED by the BOOT check:** `app/settings/blocked.test.tsx` (committed in the build
  commit) **broke the entire web route tree** — expo-router scans `app/**` for ROUTES and treated the
  test file as one; its `@testing-library`/jest imports don't resolve in the app bundle → the route-tree
  build failed → the dev server served `_error.bundle` (the LogBox overlay, which itself crashes on web:
  `useLogs … reading 'map'`) → a **blank app for every route**. Relocated to `src/screens/blocked.test.tsx`
  (commit `491fa5c`). **Lesson: no `*.test.tsx` under `app/` — ever.** (Also hit the standing new-`src/`-
  directory Metro trap for `src/components/report/` — a Metro restart with cache-clear resolved it.)
- **Interactive walk of Settings → BLOCKED → ReportSheet: OWED** — blocked by the **shared dev-API
  restart storm**: the concurrent server lane restarted the API **416 times** tonight (`.devstack/api.log`
  "Restarting" count; the login 500 was `column "equipped_labels" does not exist` — the server's P2
  migration 0016 in-flight), so **browser reads intermittently 500** (collection + profile both showed
  "SIGNAL LOST"; `/me` refetch kept hitting restart windows). `curl` confirms the endpoints are healthy in
  stable gaps (`GET /me` 200 · `/me/blocks` 200 · `/me/collection` 200), so this is an **environment
  condition, not P12 code**. Per the packet's fallback ("if still down after ~15 min, fall back to jest +
  record the BOOT items as owed, with the api.log evidence line"), the live walk is recorded owed. The
  Settings shell, BLOCKED page (all states), and ReportSheet matrix are **verified via jest** (they mount
  + render with mocked data) + typecheck + lint. **parvati should run the live walk once the server lane
  settles** (API stops restarting).

## Open flags for the orchestrator / parvati
- GAP-R1 — local report schemas (swap to shared when P7 lands).
- SEAM(P7) — POST /reports 404s live; the exact reason-code enum I coded against is above (align P7).
- ASSUMPTION — card-report wired on `AdoptCardSheet` (community card), not `CardDetailSheet` (own card).
- ASSUMPTION — PROF-03 privacy toggle + email/username edit pages absent from the §0.10 slice.
- POLISH — ReportSheet grab handle (PulledSheet convention vs the handle-less board drawer).
