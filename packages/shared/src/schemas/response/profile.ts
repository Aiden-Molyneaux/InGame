import { z } from 'zod';
import { privacySchema, roleSchema, adminTierSchema, relationshipSchema } from '../common';

// RESPONSE/VIEW schemas — owned by the F06 privacy serializer (decision 0051/F06/F23, the sanctioned
// divergence from the request half). Each is an ALLOWLIST of fields per the PROF-03 privacy state:
// the serializer (apps/api) emits exactly these shapes, and the standing relationship-matrix test
// asserts the field-set for actor-B (not just a 4xx on writes).

/**
 * GET /me self-view (the F29 read exemplar). `avatarUrl: null` ⇒ the default monogram (PROF-08).
 * The self-view is the only shape that exposes `role` + `adminTier` (PROF-09 — tier is private).
 * (The full /me payload — stats, top10, favouriteGame, … — is M2-foundation build-out.)
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
  })
  .strict();
export type SelfProfile = z.infer<typeof selfProfileSchema>;

/**
 * Non-friend / limited public shape (PROF-03): `{ username, avatarUrl, memberSince,
 * mutualFriendsCount }` — nothing else leaks. `staff: true` is the generic public trust badge
 * (PROF-09 — tier NOT disclosed).
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

/** Friend / full shape (PROF-05): the public allowlist + the friend-visible additions. */
export const friendProfileSchema = publicProfileSchema
  .extend({
    bio: z.string(),
    privacy: privacySchema,
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
