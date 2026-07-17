import { z } from 'zod';
import { relationshipSchema, searchRelationshipSchema } from '../common';

// RESPONSE/VIEW schemas for the SOC-08 social-graph read surfaces (GET /me/friends ·
// /me/friends/requests · /me/blocks). Owned by the F06 privacy serializer (the sanctioned divergence
// from the request schemas). Every item is a PUBLIC-shape summary (id/username/avatar) — nothing
// friend-private crosses here; these are the actor's OWN social graph (self-owned reads).
//
// NOTE (seam): the api-contract draws `avatarRef` on the search/compare/blocks items, but every BUILT
// serializer (toPublicShape / toFriendShape / contributions) emits `avatarUrl`. To stay consistent
// with the live wire the client already consumes, these carry `avatarUrl`. Flagged to the orchestrator
// as contract drift (avatarRef vs avatarUrl) — not this packet's to resolve.

/**
 * A PersonRow-ish person summary — the shared shape behind FriendRow / RequestRow / the blocked-list
 * row. `relationship` drives the PersonRow action chrome (SOC-07). Public allowlist only.
 */
export const personSummarySchema = z
  .object({
    userId: z.string().uuid(),
    username: z.string(),
    avatarUrl: z.string().url().nullable(),
    relationship: relationshipSchema,
  })
  .strict();
export type PersonSummary = z.infer<typeof personSummarySchema>;

/** GET /me/friends (SOC-01) → the accepted-friends roster, each a PersonSummary (relationship = 'friend'). */
export const friendsListResponseSchema = z
  .object({
    friends: z.array(personSummarySchema),
  })
  .strict();
export type FriendsListResponse = z.infer<typeof friendsListResponseSchema>;

/**
 * GET /me/friends/requests (SOC-08) → the pending requests split by direction. `incoming` are requests
 * the actor may accept/decline (relationship = 'incoming'); `outgoing` are the actor's sent requests
 * they may cancel (relationship = 'outgoing'). `requestId` is the transition target.
 */
export const friendRequestItemSchema = z
  .object({
    requestId: z.string().uuid(),
    person: personSummarySchema,
    createdAt: z.string(),
  })
  .strict();
export type FriendRequestItem = z.infer<typeof friendRequestItemSchema>;

export const friendRequestsResponseSchema = z
  .object({
    incoming: z.array(friendRequestItemSchema),
    outgoing: z.array(friendRequestItemSchema),
  })
  .strict();
export type FriendRequestsResponse = z.infer<typeof friendRequestsResponseSchema>;

/**
 * GET /me/blocks (SOC-09) → the Settings blocked-list read: id/username/avatarRef + blockedAt (the
 * MOD-09 lone-exception affordance — the one place a blocked relationship IS disclosed, to the blocker
 * themselves). `relationship` is omitted (a blocked user has no public relationship value in the
 * shared enum — the block IS the state); the client renders an UNBLOCK affordance per row.
 */
export const blockedPersonSchema = z
  .object({
    userId: z.string().uuid(),
    username: z.string(),
    avatarUrl: z.string().url().nullable(),
    blockedAt: z.string(),
  })
  .strict();
export type BlockedPerson = z.infer<typeof blockedPersonSchema>;

export const blocksListResponseSchema = z
  .object({
    blocks: z.array(blockedPersonSchema),
  })
  .strict();
export type BlocksListResponse = z.infer<typeof blocksListResponseSchema>;

/**
 * GET /users/search?username= (SOC-07) → the PersonRow result. The public allowlist (id/username/
 * avatar) + the SEARCH relationship (the 6-value `searchRelationshipSchema` — see common.ts: base four
 * plus `cooldown`/`blocked`). `cooldownUntil` (ISO-8601 UTC) is present ONLY when `relationship` is
 * `cooldown` (drives the disabled-ADD microcopy). SELF is excluded from results (the contract enumerates
 * no `self` value); a blocked-either-direction user is INVISIBLE (never in results — `blocked` exists for
 * the shared component's completeness only). Exact-match → at most ONE row (usernames are unique).
 */
export const personSearchResultSchema = z
  .object({
    userId: z.string().uuid(),
    username: z.string(),
    avatarUrl: z.string().url().nullable(),
    relationship: searchRelationshipSchema,
    cooldownUntil: z.string().optional(),
  })
  .strict();
export type PersonSearchResult = z.infer<typeof personSearchResultSchema>;

export const userSearchResponseSchema = z
  .object({
    results: z.array(personSearchResultSchema),
  })
  .strict();
export type UserSearchResponse = z.infer<typeof userSearchResponseSchema>;
