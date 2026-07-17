# P11 — Achievements screen + in-app celebration · build manifest

> **Packet:** M6 P11 (client · Opus builder) — the Achievements trophy case + the ACH-06 in-app
> celebration half. Board: `docs/design/mockups/achievements/achievements-states.html` (14 artboards).
> Spec: product-spec **ACH-01..06/09** · design-spec **§2.19 + §1.5** · api-contract **§Achievements 0.36**.
> Server LIVE (P6, commit `1899183`): the three `/achievements*` reads + the 18-def seed (12 milestones +
> 6 secret eggs). **Scope:** `apps/mobile/**` only (the server track owns `apps/api/**` + `packages/shared/**`).
>
> **Pipeline:** manifest (this) → build → murr → parvati (owed — browser lane RESERVED, see BOOT check).

---

## 0. The reads (curled live as `demo@ingame.app`, 2026-07-17)

| Endpoint | Shape (confirmed) | Notes |
|---|---|---|
| `GET /achievements` | `{ achievements: [ …def \| maskedSecret ] }` — 18 defs | secret-masked → `{id,kind:'secret',tier:'secret',locked:true}` (no name/criterion/reward). Visible def carries `criterion` + `reward{badge,pixels?,cosmetic?}`. |
| `GET /me/achievements` | `{ summary{earned,inProgress,secretsFound,secretsTotal}, earned[…def,unlockedAt], inProgress[…def,progress{current,target,unit}], secrets{found[…],lockedCount} }` | `earned`/`inProgress` are **milestone (non-secret)**; unlocked secrets live in `secrets.found`. Bounded (no cursor). Demo: `{earned:1, inProgress:11, secretsFound:0, secretsTotal:6}`. |
| `GET /users/:id/achievements` | friend/self → `{summary{earned}, earned[{id,key,name,tier,unlockedAt}]}` · non-friend/hidden → `{summary{earned}, locked:true}` · blocked/unknown → **404** | **Server sends `key`, NOT the contract-drawn `glyph`** — the client maps `key`→glyph. Confirmed live: friend `demo_curator2` → `{earned:0, earned:[]}`; bogus uuid → 404. |

### The `/me` teaser question (CURL-CHECK — answered)
**`GET /me` does NOT carry an `achievements` teaser.** Live keys: `id, username, avatarUrl, bio,
memberSince, privacy, role, adminTier, usernamePending, emailVerified, favouriteGameId,
favouriteGenreIds, gamertags, usernameNextChangeAt, stats, favouriteGame, nowPlaying, top10`. The
`selfProfileSchema` is `.strict()` and omits the teaser (comment: "achievements/contributions teasers
remain deferred (M7)"). **SEAM:** the self-Profile teaser reads **`GET /me/achievements` `summary`**
instead (an extra bounded query on the Profile). Recorded as **GAP-1**.

---

## 1. Architecture

- **ARCH-A1 — local-view VIEW ALL.** The section `VIEW ALL ›` opens a full-list view over the SAME
  `/me/achievements` payload (the arrays are bounded — no cursor, api 0.36). One fetch, four views
  (root · earned · inProgress · secrets); a `view` state on the route, reset when `id`/route changes.
  Mirrors the P13 contributor VIEW-ALL precedent.
- **ARCH-A2 — the tier colour is a token map, never a literal (ACH-09).** `tierColor(tier, t)`:
  `prestige → t.brand.gold` · `standard → t.scr.accent` (the **theme accent** — re-themes per DEV-04,
  NOT a hard-coded orange) · `secret → t.brand.secret` (`#e85ad0`, theme-invariant magenta, the F-05
  carve-out). Verified against the 0070 themed tokens.
- **ARCH-A3 — key→glyph client map.** The 18 seeded keys (`a1_first_print`…`b8_the_regifter`) +
  `a13/a14/a15` prestige + `b*` secrets → an SVG-glyph map (`achievementGlyphs.ts`) with a default
  fallback (unknown key → a neutral glyph) + a locked `mystery` glyph. The server sends `key`; **the
  contract draws `glyph` — flagged contract drift** (GAP-2).
- **ARCH-A4 — the celebration trigger seam (ACH-06 in-app half).** No push, no event stream at M6
  (push = M7). Poll-FREE detection: a persisted `lastSeenUnlockCount` (in `prefsSlice` — already
  persisted + purged-on-logout, the per-user-namespace guarantee) is compared against
  `summary.earned + summary.secretsFound` on each `/me/achievements` (re)fetch. A first observation
  (`null`) baselines silently; a later increase fires the moment for the **newest unlock row** (max
  `unlockedAt` across `earned` + `secrets.found`). Mounted at the app root (`CelebrationHost`) so an
  unlock celebrates app-wide; `setupListeners` + `refetchOnFocus`/`refetchOnReconnect` make returning
  to the app (or reconnecting) re-read `/me/achievements` and detect the delta **without a timer poll**.
  **ASSUMPTION-flagged** — the M7 push half replaces this detection (ASSUMPTION-1).
- **ARCH-A5 — the node-detail sheet is `PulledSheet`** (the app drawer grammar, §5.7) — the
  D1/D2/D3 `AchievementSheet` over the dimmed grid; scrim/handle/DONE dismiss.
- **ARCH-A6 — routes.** Self = `app/achievements.tsx` (reached from the self-Profile teaser). Friend =
  `app/user/[id]/achievements.tsx` (reached from the friend-Profile teaser — mirrors
  `/user/[id]/collection`). Two data sources (`/me/achievements` vs `/users/:id/achievements`), one
  component kit.

---

## 2. Per-artboard coverage (all 14)

| Board | State | Route / component | Status | Notes |
|---|---|---|---|---|
| **P1** | Self populated (top-N trophy case) | `achievements.tsx` root | **OWED ✅** | SUMMARY StatTile row (earned/inProgress/secretsFound-of-secretsTotal) → TierLegend → EARNED grid (PRESTIGE-first, top-6) → IN PROGRESS (BadgeTile+ProgressMeter, top-3) → SECRETS (found tiles + `lockedCount` MysterySlots) → REWARDS EARNED (RewardChips derived from earned/secret rewards). Each section `VIEW ALL ›`. |
| **P2** | Empty (new user · NON-gold) | `achievements.tsx` root | **OWED ✅** | `earned===0 && secretsFound===0 && inProgress===0` → the `EmptyState` hook (NON-gold, `tone:'neutral'`), "NO TROPHIES YET" + a cream VIEW MY COLLECTION (`ScreenButton/secondary`). |
| **V1** | VIEW ALL · Earned | `achievements.tsx` view='earned' | **OWED ✅** | All earned in the uniform grid, PRESTIGE-first · `‹ ACHIEVEMENTS` back-seam · listsum line. Bounded array (no cursor). |
| **V2** | VIEW ALL · In progress | view='inProgress' | **OWED ✅** | All in-progress, closest-first (sorted by progress ratio) · ProgressMeter + live count. |
| **V3** | VIEW ALL · Secrets | view='secrets' | **OWED ✅** | Found (revealed magenta) + `lockedCount` MysterySlots · "N of M found" listsum. |
| **D1** | Node detail · earned+reward | `AchievementSheet` (earned) | **OWED ✅** | tier · title · what-for (description) · when-earned (`unlockedAt`) · RewardChips (PX + cosmetic slot when present). |
| **D2** | Node detail · in progress | `AchievementSheet` (progress) | **OWED ✅** | criterion (description) · full ProgressMeter + "N TO GO" (clamped ≥0) · the PRIZE RewardChip. |
| **D3** | Node detail · locked secret | `AchievementSheet` (locked) | **OWED ✅** | **SEALED** — ??? title, generic copy, NO name/criterion/reward leak (jest-asserted). |
| **P3** | Friend-view (earned only) | `user/[id]/achievements.tsx` | **OWED ✅** | EARNED grid from `/users/:id/achievements` (key→glyph, tier colour) · `‹ RETURN TO <name>` · VIEW ALL · tap → read-only sheet (tier·name·when-earned only — the showcase row carries no description/reward). **No IN PROGRESS, no ??? leak.** |
| **P4** | Privacy-limited (PROF-03) | `user/[id]/achievements.tsx` (`locked:true`) | **OWED ✅** | Honest headline count (SUMMARY EARNED reads; IN PROGRESS / SECRETS = `—`) + the `lock-well` "ACHIEVEMENTS HIDDEN". |
| **P5** | Unlock celebration (ACH-06) | `CelebrationMoment` (root `CelebrationHost`) | **OWED ✅** | tier-coloured burst (radial+scanline backdrop, rays, notched badge, RewardChips, orange CONTINUE) · **reduce-motion-safe** (static variant, the M5 LandedMoment precedent). Trigger = ARCH-A4. |
| **L1** | Skeleton | `achievements.tsx` isLoading | **OWED ✅** | The §1.6 `Skeleton` kit (text-lines → tile-row → badge fills). |
| **L2** | LoadError (Signal Lost) | `achievements.tsx` isError | **OWED ✅** | The `LoadError` kit + RETRY (`refetch`). |
| **L3** | Offline (cached, read-only) | — | **EXPECTED** | No SYS-10 connectivity substrate exists app-wide (siblings — P13 contributor, P9 — defer identically). No writes here anyway (achievements are server-side). EXPECTED, sibling stance. |

---

## 3. Deliverables (files)

**API + data**
- `src/store/achievementsApi.ts` — `injectEndpoints` on the base slice (NEVER `api.ts`): `getAchievements`
  · `getMyAchievements` (tag `MeAchievements`) · `getUserAchievements`. **Zod at the seam** — the shared
  export carries the P6 **TS interfaces** but **no response zod schemas** (only `achievementCriterionSchema`),
  so the client declares local parse schemas built from the shared `ACHIEVEMENT_TIERS`/`ACHIEVEMENT_KINDS`
  constants (GAP-3). Catches shape drift at the seam.
- `src/components/achievements/achievementGlyphs.ts` — the key→glyph map (18 keys + default + mystery lock).

**Components** (`src/components/achievements/`)
- `tier.ts` (`tierColor`) · `BadgeTile.tsx` · `MysterySlot.tsx` · `ProgressMeter.tsx` · `RewardChip.tsx`
  · `TierLegend.tsx` · `AchievementSheet.tsx` (D1/D2/D3) · `CelebrationMoment.tsx` · `useUnlockCelebration.ts`
  · `CelebrationHost.tsx`.

**Routes**
- `app/achievements.tsx` (self) · `app/user/[id]/achievements.tsx` (friend/limited).

**Wiring (additive)**
- `app/(tabs)/profile.tsx` — self Achievements teaser section (`{earned} EARNED` off `/me/achievements`
  summary) → `/achievements` (ACH-05).
- `app/user/[id].tsx` — friend Achievements teaser strip off `/users/:id/achievements` (earned-only /
  honest-count-locked) → `/user/[id]/achievements`; replaces P9's EXPECTED(P6) achievements note.
- `src/store/prefsSlice.ts` — `lastSeenUnlockCount: number | null` + `setLastSeenUnlockCount` (persisted,
  purged on logout).
- `src/store/index.ts` — `setupListeners(store.dispatch)` (enables refetchOnFocus/Reconnect; no timer).
- `app/_layout.tsx` — mount `<CelebrationHost />` beside `<ThemedStack />` inside the DeviceShell screen
  slot (an absolute-fill overlay when a celebration is pending; renders null otherwise).

---

## 4. Statuses — ASSUMPTION / GAP / EXPECTED

- **ASSUMPTION-1** — the celebration trigger is a refetch-delta on `/me/achievements` (ARCH-A4), not a
  push. The M7 push half replaces the detection. No timer poll (owner directive). Baselines silently on
  first observation so a fresh login never re-celebrates existing unlocks.
- **GAP-1** — `/me` carries no achievements teaser; the self-Profile teaser reads `/me/achievements`
  `summary` (an extra bounded query). The exact `{unlocked}/{total}` teaser the contract draws needs a
  clean total (defs count) — the teaser renders **`{earned} EARNED`** (honest, matches the board id-sub
  voice). Widening `/me` is an M7 contract call.
- **GAP-2** — `/users/:id/achievements` sends `key`, the contract draws `glyph`. The client maps
  key→glyph (`achievementGlyphs.ts`). Contract-drift flag (the server track owns the fix or the contract
  amends).
- **GAP-3** — `@ingame/shared` exports the P6 achievement **TS interfaces** but no **response zod
  schemas**. The client declares local parse schemas in `achievementsApi.ts` (built from the shared
  `ACHIEVEMENT_TIERS`/`ACHIEVEMENT_KINDS` enums). If the server track later adds shared response schemas,
  swap the local ones out.
- **GAP-4 (data quirk, not a build miss)** — the seeded `inProgress` can carry `current > target`
  (e.g. First Print `{current:3, target:1}` — pre-engine `card.published` events with no retro-grant,
  ACH-08). The ProgressMeter clamps the bar to 100% and "N TO GO" to ≥0; the raw `current / target`
  count renders as served. Surfaced for the owner (a seed/backfill question, server-side).
- **EXPECTED (L3 Offline)** — no SYS-10 connectivity substrate; siblings defer identically.
- **EXPECTED (friend detail richness)** — the friend showcase row carries `{id,key,name,tier,unlockedAt}`
  only, so the friend node-detail sheet shows tier·name·when-earned (no description/reward — not served,
  by design: PROF-05 earned-only, no criterion/reward leak).

---

## 5. BOOT check / browser lane

**The :8082 browser lane is RESERVED for this packet** (server + agents share it; the task fences it
off). Verification is **jest + curl + typecheck + lint** — NO browser work. The visual walk (parvati)
is **owed-for-parvati**; the celebration is the arcade soul, so the taste spots to probe on device:
the tier-coloured burst (gold vs magenta vs theme-accent), the reduce-motion static variant, the
RewardChip payout row, the CONTINUE beat, and the sealed ??? sheet (no leak). Section order + PRESTIGE-first
ordering + the SECRETS `???` count-only hint are the P1 fidelity spots.

## 6. Jest plan (deltas over baseline 65 suites / 466)

`achievements-route.test.tsx` (self: section/summary matrix · P2 empty · VIEW ALL routing · D3 sealed
no-leak · ProgressMeter clamp · L1/L2) · `friend-achievements-route.test.tsx` (P3 earned-only · P4
locked lock-well · MOD-09 404 unavailable · key→glyph) · `achievement-tier.test.ts` (tier→token map,
incl. STANDARD following the theme accent) · `celebration.test.tsx` (delta trigger: baseline-silent →
fire-on-increase · newest-row pick · reduce-motion static variant · dismiss consumes).
