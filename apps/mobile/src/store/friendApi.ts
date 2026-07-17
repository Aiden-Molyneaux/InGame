import { z } from 'zod';
import type {
  PublicProfile,
  FriendProfile,
  FriendCollectionResponse,
  FriendsWhoOwnResponse,
  CreateFriendRequest,
  OkResponse,
  FriendsListResponse,
  FriendRequestsResponse,
  UserSearchResponse,
} from '@ingame/shared';
import {
  publicProfileSchema,
  friendProfileSchema,
  friendCollectionResponseSchema,
  friendsWhoOwnResponseSchema,
  friendsListResponseSchema,
  friendRequestsResponseSchema,
  userSearchResponseSchema,
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

// P8 (SOC-01/08) — a friend-request transition target. Accept/decline/cancel carry BOTH the
// `requestId` (the transition subject) AND the counterpart `userId` (so any open `/user/:id` profile
// re-reads its relationship chip via the per-id User tag — a request settled in the inbox must not
// leave a stale ADD/REQUESTED chip on the profile).
export type RequestTransition = { requestId: string; userId: string };

const friendApi = api
  .enhanceEndpoints({ addTagTypes: ['User', 'FriendCollection', 'Friends', 'FriendRequests'] })
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
        // The profile chip re-reads (User) AND a new outgoing request appears in the inbox (FriendRequests).
        // A mutual-pending target auto-accepts → the roster gains a friend, so Friends re-reads too.
        invalidatesTags: (_res, _err, toUserId) => [
          { type: 'User', id: toUserId },
          'FriendRequests',
          'Friends',
        ],
      }),

      // ── the P8 social-graph reads (SOC-01/08) ──────────────────────────────────────────────────
      // GET /me/friends — the accepted roster (each a PersonSummary, relationship='friend'). The rail on
      // the tab + the ALL FRIENDS list both read this; parsed at the seam.
      getFriends: build.query<FriendsListResponse, void>({
        query: () => '/me/friends',
        transformResponse: (raw): FriendsListResponse => friendsListResponseSchema.parse(raw),
        providesTags: ['Friends'],
      }),
      // GET /me/friends/requests — pending, split incoming/outgoing (each carries requestId). Drives the
      // banner count + the requests inbox.
      getFriendRequests: build.query<FriendRequestsResponse, void>({
        query: () => '/me/friends/requests',
        transformResponse: (raw): FriendRequestsResponse => friendRequestsResponseSchema.parse(raw),
        providesTags: ['FriendRequests'],
      }),
      // GET /users/search?username= — exact-match people search (SOC-07). Lazy (fired on submit, not on
      // keystroke — usernames are exact, and users:search is rate-bucketed 30/min). Transient: no tag.
      searchUsers: build.query<UserSearchResponse, string>({
        query: (username) => `/users/search?username=${encodeURIComponent(username)}`,
        transformResponse: (raw): UserSearchResponse => userSearchResponseSchema.parse(raw),
      }),

      // ── the SOC-08 request lifecycle writes ────────────────────────────────────────────────────
      // POST /friends/requests/:id/accept — you become friends; the roster + inbox + the counterpart
      // profile all re-read.
      acceptFriendRequest: build.mutation<OkResponse, RequestTransition>({
        query: ({ requestId }) => ({ url: `/friends/requests/${requestId}/accept`, method: 'POST', body: {} }),
        invalidatesTags: (_res, _err, { userId }) => ['Friends', 'FriendRequests', { type: 'User', id: userId }],
      }),
      // POST /friends/requests/:id/decline — SILENT (the sender is never told, SOC-08); the request leaves
      // the inbox + a cooldown starts (the profile re-reads as `none`/cooldown).
      declineFriendRequest: build.mutation<OkResponse, RequestTransition>({
        query: ({ requestId }) => ({ url: `/friends/requests/${requestId}/decline`, method: 'POST', body: {} }),
        invalidatesTags: (_res, _err, { userId }) => ['FriendRequests', { type: 'User', id: userId }],
      }),
      // DELETE /friends/requests/:id — cancel your own sent request; the outgoing leaves the inbox.
      cancelFriendRequest: build.mutation<OkResponse, RequestTransition>({
        query: ({ requestId }) => ({ url: `/friends/requests/${requestId}`, method: 'DELETE' }),
        invalidatesTags: (_res, _err, { userId }) => ['FriendRequests', { type: 'User', id: userId }],
      }),
      // DELETE /me/friends/:userId — unfriend, SILENT to the target (SOC-08 / decision 0010). The roster
      // drops them + the profile re-reads as `none`.
      unfriend: build.mutation<OkResponse, string>({
        query: (userId) => ({ url: `/me/friends/${userId}`, method: 'DELETE' }),
        invalidatesTags: (_res, _err, userId) => ['Friends', { type: 'User', id: userId }],
      }),
    }),
  });

export const {
  useGetUserQuery,
  useGetUserCollectionQuery,
  useGetFriendsWhoOwnQuery,
  useCreateFriendRequestMutation,
  useGetFriendsQuery,
  useGetFriendRequestsQuery,
  useLazySearchUsersQuery,
  useAcceptFriendRequestMutation,
  useDeclineFriendRequestMutation,
  useCancelFriendRequestMutation,
  useUnfriendMutation,
} = friendApi;

export { friendApi };
