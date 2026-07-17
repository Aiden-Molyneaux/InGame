import { z } from 'zod';
import type {
  PublicProfile,
  FriendProfile,
  FriendCollectionResponse,
  FriendsWhoOwnResponse,
  CreateFriendRequest,
  OkResponse,
} from '@ingame/shared';
import {
  publicProfileSchema,
  friendProfileSchema,
  friendCollectionResponseSchema,
  friendsWhoOwnResponseSchema,
} from '@ingame/shared';
import { api } from './api';

// P9 friend-view endpoints (SOC-02/11 · COL-10/11 · CAT-09c · api-contract §Social/Catalog). INJECTED
// into the base `api` slice from its own file (the communityApi/contributorApi/settingsApi precedent) —
// the concurrent server track owns api.ts, so this packet touches it zero times. `enhanceEndpoints` adds
// the two tags the base slice doesn't declare (User · FriendCollection); `injectEndpoints` merges into
// the same reducer/middleware.
//
// CROSS-USER = FLATTENED-ONLY (OQ-122 / CARD-15): every friend-view shape carries `imageUrl`/`thumbUrl`
// + equipped LABELS, NEVER `composition` — a friend's cards render as images (+ the CARD-22 readout),
// never live skia. The shapes physically exclude composition (the F06 serializer allowlist).

// GET /users/:id serves a UNION (ARCH A1): FriendProfile (friend/full) OR PublicProfile (non-friend/
// limited). A blocked/suspended/deleted/unknown target is a generic 404 (MOD-09), surfaced as the RTK
// error (never a body). The friend shape is the SUPERSET, so it is tried FIRST — a `.strict()` public
// parse would reject the friend shape's extra keys (bio/privacy/gamertags/friendsCount). The screen
// discriminates on `'friendsCount' in data`.
const userProfileSchema = z.union([friendProfileSchema, publicProfileSchema]);
export type UserProfile = PublicProfile | FriendProfile;

/** Runtime discriminator — the friend/full shape carries `friendsCount` (the limited shape never does). */
export function isFriendProfile(p: UserProfile): p is FriendProfile {
  return 'friendsCount' in p;
}

const friendApi = api
  .enhanceEndpoints({ addTagTypes: ['User', 'FriendCollection'] })
  .injectEndpoints({
    endpoints: (build) => ({
      // GET /users/:id (PROF-03/05) — the friend/full vs non-friend/limited profile. Parsed at the seam
      // (the union). Cross-principal → invalidated by a friend-request write so the relationship chip
      // re-reads. `providesTags` is per-id so a request to user A doesn't refetch user B.
      getUser: build.query<UserProfile, string>({
        query: (userId) => `/users/${userId}`,
        transformResponse: (raw): UserProfile => userProfileSchema.parse(raw),
        providesTags: (_res, _err, userId) => [{ type: 'User', id: userId }],
      }),

      // GET /users/:id/collection (COL-10/11) — the friend-view shelf, read-only, privacy-gated. The
      // owner-only fields (notes/rating/platforms/percentComplete/addedAt) are NOT on the shape (the F06
      // allowlist) — the client can't render them because they don't exist here. Parsed at the seam.
      getUserCollection: build.query<FriendCollectionResponse, string>({
        query: (userId) => `/users/${userId}/collection`,
        transformResponse: (raw): FriendCollectionResponse =>
          friendCollectionResponseSchema.parse(raw),
        providesTags: (_res, _err, userId) => [{ type: 'FriendCollection', id: userId }],
      }),

      // GET /catalog/games/:id/friends-who-own (CAT-09c) — the Game-page named friends-who-own list. The
      // friend gate + PROF-03 hours-gating live server-side (rooted at the actor's friend set); blocked
      // friends are absent by construction. Cached per gameId.
      getFriendsWhoOwn: build.query<FriendsWhoOwnResponse, string>({
        query: (gameId) => `/catalog/games/${gameId}/friends-who-own`,
        transformResponse: (raw): FriendsWhoOwnResponse => friendsWhoOwnResponseSchema.parse(raw),
      }),

      // POST /friends/requests (SOC-08) — the LIVE ADD FRIEND write. Returns { ok:true } (201). The 409
      // family (SELF_TARGET · ALREADY_FRIENDS · REQUEST_PENDING · REQUEST_COOLDOWN{cooldownUntil}) surfaces
      // as the RTK error; the RelationshipAction maps it. Invalidates ['User', target] so the relationship
      // chip re-reads its authoritative state (outgoing / friend on auto-accept).
      createFriendRequest: build.mutation<OkResponse, string>({
        query: (toUserId) => ({
          url: '/friends/requests',
          method: 'POST',
          body: { toUserId } satisfies CreateFriendRequest,
        }),
        invalidatesTags: (_res, _err, toUserId) => [{ type: 'User', id: toUserId }],
      }),
    }),
  });

export const {
  useGetUserQuery,
  useGetUserCollectionQuery,
  useGetFriendsWhoOwnQuery,
  useCreateFriendRequestMutation,
} = friendApi;

export { friendApi };
