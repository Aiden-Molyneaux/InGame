import { z } from 'zod';
import { privacySchema, roleSchema, adminTierSchema, relationshipSchema } from '../common';
import { gamertagViewSchema } from './gamertag';

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
 * GET /me self-view. `avatarUrl: null` ⇒ the default monogram (PROF-08). The self-view is the only
 * shape exposing `role` + `adminTier` (PROF-09 — tier is private), `usernamePending` (AUTH-09, the
 * SIWA completion gate), and `emailVerified` (AUTH-08, the Settings resend banner). `favouriteGameId`
 * / `favouriteGenreIds` are the raw ids (the expanded favouriteGame object is M3 / catalog).
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
