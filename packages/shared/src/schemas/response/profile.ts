import { z } from 'zod';
import { privacySchema, roleSchema, adminTierSchema, relationshipSchema } from '../common';
import { gamertagViewSchema } from './gamertag';
import { collectionCardSchema, friendCollectionCardSchema } from './collection';
import { stickerCompositionSchema } from '../device';

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
 *
 * M6 walk-fix — the F-19/F-20 payload-side class: the pin's `card` resolves through the SAME
 * origin-union resolver the collection items use, so it carries the M5 FLATTENED fields the shape
 * always admitted (`collectionCardSchema.imageUrl/thumbUrl`, nullable) — an OWN design rides
 * `composition` (+ imageUrl once published), an ADOPTED equipped design rides the flattened image
 * ONLY (never the foreign composition, OQ-122). The client's EntryCard consumes imageUrl/composition
 * as-is; a pin serialized WITHOUT them read as the default face (the owner-walk NOW PLAYING bug) —
 * never hand-render a card face from partial fields (F-20).
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
 * SOC-04 — one Top-10 entry inlined on `/me` (M6 P5, api-contract line 68). `card` = the OWNER's
 * equipped-design rider (may carry `composition` — a self-view, never cross-user, CARD-15). The
 * Profile renders the top 3 of this array as set-pieces; VIEW TOP 10 renders all of it.
 */
export const selfTopTenEntrySchema = z
  .object({
    rank: z.number().int().min(1).max(10),
    gameId: z.string().uuid(),
    title: z.string(),
    card: collectionCardSchema,
  })
  .strict();
export type SelfTopTenEntry = z.infer<typeof selfTopTenEntrySchema>;

/**
 * SOC-04 — one Top-10 entry inlined on `/users/:id` (friend/full shape only, M6 P5). `card` is the
 * FLATTENED friend-view rider (never `composition` — OQ-122/CARD-15), the SAME resolution
 * `/users/:id/collection` uses (P2's friend-collection card resolution).
 */
export const friendTopTenEntrySchema = z
  .object({
    rank: z.number().int().min(1).max(10),
    gameId: z.string().uuid(),
    title: z.string(),
    card: friendCollectionCardSchema,
  })
  .strict();
export type FriendTopTenEntry = z.infer<typeof friendTopTenEntrySchema>;

/**
 * DEV-02/04 (decision 0012, M6 C4) — the friend's device payload on the friend/full `/users/:id` shape
 * (the THEIR-DEVICE row + the "view in their device" chrome toggle). The contract names the shell field
 * `shellId` (the wire name; the owner-side `/me/device` uses `activeShellId`). Cosmetic-only — no
 * private data rides a device config.
 */
export const friendDeviceSchema = z
  .object({
    shellId: z.string(),
    screenThemeId: z.string(),
    stickerComposition: stickerCompositionSchema,
  })
  .strict();
export type FriendDevice = z.infer<typeof friendDeviceSchema>;

/**
 * WTP-03 (M6 C4) — the friend's Now-Playing pin, expanded like the self shape's `nowPlaying` but with
 * the FLATTENED friend-view card (never `composition` — OQ-122/CARD-15, the P2 friend-collection card
 * resolution). Null when the friend has no pin (or the pinned game left their shelf).
 */
export const friendGameExpansionSchema = z
  .object({
    gameId: z.string().uuid(),
    title: z.string(),
    hours: z.number().int().nonnegative(),
    card: friendCollectionCardSchema,
  })
  .strict();
export type FriendGameExpansion = z.infer<typeof friendGameExpansionSchema>;

/**
 * GET /me self-view. `avatarUrl: null` ⇒ the default monogram (PROF-08). The self-view is the only
 * shape exposing `role` + `adminTier` (PROF-09 — tier is private), `usernamePending` (AUTH-09, the
 * SIWA completion gate), and `emailVerified` (AUTH-08, the Settings resend banner). M3 adds the
 * REAL `stats` + the expanded `favouriteGame`/`nowPlaying`; M6 P5 adds the real `top10` (SOC-04 — all
 * ≤10 carded entries, ordered by rank; `[]` for a fresh account, never a phantom). The achievements /
 * contributions teasers remain deferred (M7).
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
    top10: z.array(selfTopTenEntrySchema),
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
 * for: bio, privacy, favourite genres, gamertags (PROF-02), and the honest friends-count. M6 P5 adds
 * the FLATTENED `top10` (SOC-04 — never `composition`, the same friend-view card resolution
 * `/users/:id/collection` uses).
 */
export const friendProfileSchema = publicProfileSchema
  .extend({
    bio: z.string(),
    // NO `privacy` — F-16 / decision 0055 (api-contract /users/:id row): "neither shape exposes the
    // target's own privacy value" — the shipped serializer's stray field, dropped M6 C4 follow-up.
    favouriteGenreIds: z.array(z.string().uuid()),
    gamertags: z.array(gamertagViewSchema),
    friendsCount: z.number().int().nonnegative(),
    top10: z.array(friendTopTenEntrySchema),
    // ── M6 C4 (the PROF-05 board rows the P2 report deferred — parvati walk-round) ─────────────────
    // All three NULL-TOLERANT (nullable) so the client's existing parse keeps working before its own
    // fix-round; the server always serves stats + device (real values) and nowPlaying-or-null.
    /** PROF-04 six-pack for the TARGET (the same computation the self shape runs). PROF-07 percentile
     *  chips stay ABSENT (threshold-gated; the cohort/percentile engine rides M7 — omitted, not faked). */
    stats: selfStatsSchema.nullable(),
    /** DEV-02/04 — the THEIR-DEVICE payload (decision 0012). */
    device: friendDeviceSchema.nullable(),
    /** WTP-03 — the friend's Now-Playing pin (flattened card), or null. */
    nowPlaying: friendGameExpansionSchema.nullable(),
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

/** One top-reach added game (CAT-09). `card` (parvati board gap, P2 additive) — a flattened thumb of a
 *  representative published card for the game, drawn on the contributor board's GAMES ADDED rows when
 *  present; absent when the game has no published card. Never `composition` (OQ-122 — flattened only). */
export const contributorGameSchema = z
  .object({
    gameId: z.string().uuid(),
    title: z.string(),
    collectionsCount: z.number().int().nonnegative(),
    card: z
      .object({ imageUrl: z.string().nullable(), thumbUrl: z.string().nullable() })
      .strict()
      .optional(),
  })
  .strict();
export type ContributorGame = z.infer<typeof contributorGameSchema>;

/** GET /users/:id/contributions/cards?cursor= — the VIEW ALL cards list (CAT-07), cursor-paginated,
 *  friend-only (PROF-03). Items are the same `contributorCard` teasers, sorted by adoption. */
export const contributionsCardsPageSchema = z
  .object({
    items: z.array(contributorCardSchema),
    nextCursor: z.string().nullable(),
  })
  .strict();
export type ContributionsCardsPage = z.infer<typeof contributionsCardsPageSchema>;

/** GET /users/:id/contributions/games?cursor= — the VIEW ALL games list (CAT-07/CAT-09), cursor-
 *  paginated, friend-only (PROF-03). Items are the same `contributorGame` rows, sorted by reach. */
export const contributionsGamesPageSchema = z
  .object({
    items: z.array(contributorGameSchema),
    nextCursor: z.string().nullable(),
  })
  .strict();
export type ContributionsGamesPage = z.infer<typeof contributionsGamesPageSchema>;

/**
 * CAT-10 percentile standing vs the contributor cohort (api-contract §Catalog) — each axis
 * threshold-gated (PROF-07), the axis omitted below its floor. `percentile` = the top-N percentile
 * (25 ⇒ "TOP 25%"). Additive widening (0.69 → this P13 build): the field was `z.null()` while the
 * cohort ranking was unbuilt; the server still emits `standing: null` at M6 (the ranking rides the M7
 * percentile engine), so `null` remains valid — this only lets the P13 client render `PctPill`s the
 * moment CAT-10 computes them server-side. No server change; `null` still parses.
 */
export const contributorStandingSchema = z
  .object({
    byAdoptions: z.object({ percentile: z.number().int().min(0).max(100) }).strict().optional(),
    byGames: z.object({ percentile: z.number().int().min(0).max(100) }).strict().optional(),
    byReach: z.object({ percentile: z.number().int().min(0).max(100) }).strict().optional(),
  })
  .strict();
export type ContributorStanding = z.infer<typeof contributorStandingSchema>;

export const contributionsResponseSchema = z
  .object({
    user: z
      .object({
        id: z.string().uuid(),
        username: z.string(),
        avatarUrl: z.string().url().nullable(),
        memberSince: z.string(),
        // `bio` (parvati board gap, P2 additive) — the contributor board's IdentityBlock draws it;
        // FRIEND/FULL shape ONLY (absent on the non-friend/limited shape, PROF-03). Friend-gated.
        bio: z.string().optional(),
      })
      .strict(),
    stats: contributorStatsSchema,
    /** CAT-10 percentile standing vs the contributor cohort — NULL below the PROF-07 floor (M6: null). */
    standing: contributorStandingSchema.nullable(),
    /** Friend/self only (PROF-03) — omitted on the non-friend/limited shape. */
    signatureCard: contributorCardSchema.nullable().optional(),
    topCards: z.array(contributorCardSchema).optional(),
    topGames: z.array(contributorGameSchema).optional(),
  })
  .strict();
export type ContributionsResponse = z.infer<typeof contributionsResponseSchema>;
