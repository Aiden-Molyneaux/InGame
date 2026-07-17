import { z } from 'zod';
import {
  ACHIEVEMENT_TIERS,
  ACHIEVEMENT_KINDS,
  type AchievementDefView,
  type MeAchievementsResponse,
  type UserAchievementsResponse,
} from '@ingame/shared';
import { api } from './api';

// P11 achievements-read endpoints (ACH-01..06/09 · api-contract §Achievements 0.36). INJECTED into the
// base `api` slice from its own file (the contributorApi/friendApi precedent) — the concurrent server
// track owns api.ts + packages/shared, so this packet touches api.ts ZERO times. `enhanceEndpoints`
// adds the two tags the base slice doesn't declare; `injectEndpoints` merges into the same reducer.
//
// ZOD AT THE SEAM (GAP-3): @ingame/shared exports the P6 achievement **TS interfaces** but no response
// **zod** schemas (only `achievementCriterionSchema`, a loose record). So the client declares local
// parse schemas here — built from the shared `ACHIEVEMENT_TIERS`/`ACHIEVEMENT_KINDS` enum constants so a
// tier/kind drift is caught — and casts the parsed result to the shared interface (the criterion is read
// opaquely by the UI, so the loose-record parse is safe). If the server track later publishes shared
// response schemas, swap these out.

const tierEnum = z.enum(ACHIEVEMENT_TIERS);
const kindEnum = z.enum(ACHIEVEMENT_KINDS);
const rewardSchema = z.object({
  badge: z.literal(true),
  pixels: z.number().int().optional(),
  cosmetic: z.object({ assetId: z.string(), earnOnly: z.literal(true) }).optional(),
});
// The criterion is trusted seed data read opaquely by the client (tier/name/progress/reward drive the
// UI, never the criterion shape) — a loose passthrough, mirroring shared `achievementCriterionSchema`.
const criterionSchema = z.record(z.unknown());

const defSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  description: z.string(),
  criterion: criterionSchema,
  tier: tierEnum,
  kind: kindEnum,
  reward: rewardSchema,
});
// A masked secret def (OQ-005 pole A): id + the secret markers ONLY — no name/criterion/reward. Tried
// first (its `locked:true` literal makes it disjoint from a full def, which never carries `locked`).
const maskedSecretSchema = z.object({
  id: z.string(),
  kind: z.literal('secret'),
  tier: z.literal('secret'),
  locked: z.literal(true),
});
const defViewSchema = z.union([maskedSecretSchema, defSchema]);
const achievementsResponseSchema = z.object({ achievements: z.array(defViewSchema) });

const progressSchema = z.object({ current: z.number(), target: z.number(), unit: z.string() });
const earnedSchema = defSchema.extend({ unlockedAt: z.string() });
const inProgressSchema = defSchema.extend({ progress: progressSchema });
const meAchievementsResponseSchema = z.object({
  summary: z.object({
    earned: z.number().int().nonnegative(),
    inProgress: z.number().int().nonnegative(),
    secretsFound: z.number().int().nonnegative(),
    secretsTotal: z.number().int().nonnegative(),
  }),
  earned: z.array(earnedSchema),
  inProgress: z.array(inProgressSchema),
  secrets: z.object({ found: z.array(earnedSchema), lockedCount: z.number().int().nonnegative() }),
});

// GET /users/:id/achievements — earned-only friend/self, honest-count-only limited (PROF-03/SOC-09). The
// showcase row carries `key` (the client maps key→glyph — GAP-2; the contract draws `glyph`).
const showcaseSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  tier: tierEnum,
  unlockedAt: z.string(),
});
const userAchievementsResponseSchema = z.union([
  z.object({ summary: z.object({ earned: z.number().int().nonnegative() }), locked: z.literal(true) }),
  z.object({ summary: z.object({ earned: z.number().int().nonnegative() }), earned: z.array(showcaseSchema) }),
]);

// The GET /achievements payload wraps the defs (`{ achievements: [...] }`); the client reads the array.
export interface AchievementsResponse {
  achievements: AchievementDefView[];
}

const achievementsApi = api
  .enhanceEndpoints({ addTagTypes: ['MeAchievements', 'AchievementDefs', 'UserAchievements'] })
  .injectEndpoints({
    endpoints: (build) => ({
      // GET /achievements — the visible definitions + masked secrets. Rarely changes; tagged so a future
      // seed edit can invalidate it. Parsed at the seam then cast (criterion read opaquely).
      getAchievementDefs: build.query<AchievementsResponse, void>({
        query: () => '/achievements',
        transformResponse: (raw): AchievementsResponse =>
          achievementsResponseSchema.parse(raw) as AchievementsResponse,
        providesTags: ['AchievementDefs'],
      }),
      // GET /me/achievements — the caller's trophy case (summary + earned/inProgress/secrets, bounded).
      // The CelebrationHost also subscribes to this (the refetch-delta trigger seam, ARCH-A4).
      getMyAchievements: build.query<MeAchievementsResponse, void>({
        query: () => '/me/achievements',
        transformResponse: (raw): MeAchievementsResponse =>
          meAchievementsResponseSchema.parse(raw) as MeAchievementsResponse,
        providesTags: ['MeAchievements'],
      }),
      // GET /users/:id/achievements — a friend's showcased earned (or honest-count-only limited /
      // blocked-404). Per-id tag so user A's read doesn't refetch user B.
      getUserAchievements: build.query<UserAchievementsResponse, string>({
        query: (userId) => `/users/${userId}/achievements`,
        transformResponse: (raw): UserAchievementsResponse =>
          userAchievementsResponseSchema.parse(raw) as UserAchievementsResponse,
        providesTags: (_res, _err, userId) => [{ type: 'UserAchievements', id: userId }],
      }),
    }),
  });

export const {
  useGetAchievementDefsQuery,
  useGetMyAchievementsQuery,
  useGetUserAchievementsQuery,
} = achievementsApi;

export { achievementsApi };
