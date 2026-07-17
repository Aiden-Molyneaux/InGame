import { z } from 'zod';
import { privacySchema, roleSchema, adminTierSchema, relationshipSchema } from '../common';
import { gamertagViewSchema } from './gamertag';
import { collectionCardSchema } from './collection';

// RESPONSE/VIEW schemas — owned by the F06 privacy serializer (decision 0051/F06/F23, the sanctioned
// divergence from the request half). Each is an ALLOWLIST of fields per the PROF-03 privacy state:
// the serializer (apps/api) emits exactly these shapes, and the standing relationship-matrix test
// asserts the field-set for actor-B (not just a 4xx on writes).
//
// M2 SCOPE NOTE: the api-contract /me + /users/:id friend shapes also carry stats / top10 /
// favouriteGame(expanded) / nowPlaying / device / achievements-teaser — all of which need the M3+
// catalog / collection / cards / achievements features. Those are DEFERRED; M2 emits the
// profile-core subset it has real data for. The allowlist grows as those features land.

/**
 * PROF-04 — the self-view stat block, derived from REAL collection data (M3). `cardsDesigned` /
 * `adoptionsReceived` are honest zeros until the M4/M5 card features exist. Percentile chips
 * (PROF-07) are threshold-gated and OMITTED below the population floor — absent fields, not fakes.
 * completionPct (decision 0058): beaten|completed over the NON-wishlist entries, rounded.
 */
export const selfStatsSchema = z
  .object({
    games: z.number().int().nonnegative(),
    hours: z.number().int().nonnegative(),
    completionPct: z.number().int().min(0).max(100),
    cardsDesigned: z.number().int().nonnegative(),
    adoptionsReceived: z.number().int().nonnegative(),
    friends: z.number().int().nonnegative(),
  })
  .strict();
export type SelfStats = z.infer<typeof selfStatsSchema>;

/**
 * The expanded favouriteGame / nowPlaying object (PROF-01/05, WTP-03; M3 — unblocks the PINNED
 * FAVOURITE set-piece). `entryId` is absent when the pinned game isn't on the caller's shelf;
 * `card` = the CARD-18 stub pre-M4.
 */
export const selfGameExpansionSchema = z
  .object({
    gameId: z.string().uuid(),
    entryId: z.string().uuid().optional(),
    title: z.string(),
    hours: z.number().int().nonnegative(),
    card: collectionCardSchema,
  })
  .strict();
export type SelfGameExpansion = z.infer<typeof selfGameExpansionSchema>;

/**
 * GET /me self-view. `avatarUrl: null` ⇒ the default monogram (PROF-08). The self-view is the only
 * shape exposing `role` + `adminTier` (PROF-09 — tier is private), `usernamePending` (AUTH-09, the
 * SIWA completion gate), and `emailVerified` (AUTH-08, the Settings resend banner). M3 adds the
 * REAL `stats` + the expanded `favouriteGame`/`nowPlaying`; `top10` + the achievements /
 * contributions teasers remain deferred (D3 / M4+).
 */
export const selfProfileSchema = z
  .object({
    id: z.string().uuid(),
    username: z.string(),
    avatarUrl: z.string().url().nullable(),
    bio: z.string(),
    memberSince: z.string(), // ISO-8601 UTC
    privacy: privacySchema,
    role: roleSchema,
    adminTier: adminTierSchema.nullable(),
    usernamePending: z.boolean(),
    emailVerified: z.boolean(),
    favouriteGameId: z.string().uuid().nullable(),
    favouriteGenreIds: z.array(z.string().uuid()),
    gamertags: z.array(gamertagViewSchema),
    /** PROF-06 — when the next username change is allowed (ISO-8601 UTC), or null ⇒ allowed now. */
    usernameNextChangeAt: z.string().nullable(),
    stats: selfStatsSchema,
    favouriteGame: selfGameExpansionSchema.nullable(),
    nowPlaying: selfGameExpansionSchema.nullable(),
  })
  .strict();
export type SelfProfile = z.infer<typeof selfProfileSchema>;

/**
 * Non-friend / limited public shape (PROF-03): `{ username, avatarUrl, memberSince,
 * mutualFriendsCount }` + `relationship` — nothing else leaks. `staff: true` is the generic public
 * trust badge (PROF-09 — tier NOT disclosed).
 */
export const publicProfileSchema = z
  .object({
    id: z.string().uuid(),
    username: z.string(),
    avatarUrl: z.string().url().nullable(),
    memberSince: z.string(),
    mutualFriendsCount: z.number().int().nonnegative(),
    relationship: relationshipSchema,
    staff: z.boolean().optional(),
  })
  .strict();
export type PublicProfile = z.infer<typeof publicProfileSchema>;

/**
 * Friend / full shape (PROF-05) — the public allowlist + the friend-visible additions M2 has data
 * for: bio, privacy, favourite genres, gamertags (PROF-02), and the honest friends-count.
 */
export const friendProfileSchema = publicProfileSchema
  .extend({
    bio: z.string(),
    privacy: privacySchema,
    favouriteGenreIds: z.array(z.string().uuid()),
    gamertags: z.array(gamertagViewSchema),
    friendsCount: z.number().int().nonnegative(),
  })
  .strict();
export type FriendProfile = z.infer<typeof friendProfileSchema>;

/**
 * AUTH-07 anonymized-author shape — a deleted user's still-public content (a card's `designer`, a
 * catalog entry's `createdBy`) must not leak the original username/userId. The F06 serializer maps a
 * deleted author to this constant.
 */
export const anonymizedAuthorSchema = z
  .object({
    userId: z.null(),
    username: z.literal('[deleted]'),
    deleted: z.literal(true),
  })
  .strict();
export type AnonymizedAuthor = z.infer<typeof anonymizedAuthorSchema>;

export const ANONYMIZED_AUTHOR: AnonymizedAuthor = {
  userId: null,
  username: '[deleted]',
  deleted: true,
};

// ── CAT-07 Contributor profile (GET /users/:id/contributions) — M5 P3 goes-live ────────────────────
// The pride/read surface (api-contract 0.28). Two privacy-gated shapes (PROF-03): friend/self carries
// the card/game set-pieces; non-friend carries the honest aggregate `stats` + `standing` only. The
// stats stop honest-zeroing the moment adoptions exist (decision 0072/0073). CAT-10 percentile
// `standing` is threshold-gated (PROF-07) and NULL below the cohort floor — M5 ships it null (the
// cohort ranking rides the M7 achievements/percentile engine). VIEW-ALL sub-lists stay contract-only.

/** The honest contributor aggregates (CAT-07). Live over real data — no honest-zeroing post-adoption. */
export const contributorStatsSchema = z
  .object({
    gamesAdded: z.number().int().nonnegative(), // CAT-05 catalog entries created
    cardsDesigned: z.number().int().nonnegative(), // published designs (public creations)
    totalAdoptions: z.number().int().nonnegative(), // adoptions across all their published cards (CARD-05)
    totalReached: z.number().int().nonnegative(), // collections reach across their added games (CAT-09)
  })
  .strict();
export type ContributorStats = z.infer<typeof contributorStatsSchema>;

/** One most-/top-adopted published card teaser (CARD-05). `card` = the flattened public render. */
export const contributorCardSchema = z
  .object({
    cardId: z.string().uuid(),
    gameId: z.string().uuid(),
    gameTitle: z.string(),
    adoptionCount: z.number().int().nonnegative(),
    card: z
      .object({
        id: z.string().uuid(),
        name: z.string(),
        imageUrl: z.string().nullable(),
        thumbUrl: z.string().nullable(),
        isPremium: z.boolean(),
      })
      .strict(),
  })
  .strict();
export type ContributorCard = z.infer<typeof contributorCardSchema>;

/** One top-reach added game (CAT-09). */
export const contributorGameSchema = z
  .object({
    gameId: z.string().uuid(),
    title: z.string(),
    collectionsCount: z.number().int().nonnegative(),
  })
  .strict();
export type ContributorGame = z.infer<typeof contributorGameSchema>;

export const contributionsResponseSchema = z
  .object({
    user: z
      .object({
        id: z.string().uuid(),
        username: z.string(),
        avatarUrl: z.string().url().nullable(),
        memberSince: z.string(),
      })
      .strict(),
    stats: contributorStatsSchema,
    /** CAT-10 percentile standing vs the contributor cohort — NULL below the PROF-07 floor (M5: null). */
    standing: z.null(),
    /** Friend/self only (PROF-03) — omitted on the non-friend/limited shape. */
    signatureCard: contributorCardSchema.nullable().optional(),
    topCards: z.array(contributorCardSchema).optional(),
    topGames: z.array(contributorGameSchema).optional(),
  })
  .strict();
export type ContributionsResponse = z.infer<typeof contributionsResponseSchema>;
