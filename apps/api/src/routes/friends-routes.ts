import { createFriendRequestSchema } from '@ingame/shared';
import { defineRoute, type RouteDef } from '../http/defineRoute';
import { validateBody } from '../http/validate';
import { asyncHandler } from '../http/asyncHandler';
import { resolvePrincipal } from '../auth/principal';
import { rateLimit } from '../http/rateLimit';
import {
  postFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
} from '../controllers/social-controller';

// SOC-01/08 friend-request lifecycle (M6 P1). Mutating routes → each declares its standing SYS-07
// actor-B 4xx authz test id (paired by the rule-4 inventory-diff lint). The actor is the verified
// principal ONLY; `toUserId` (POST body) / `:id` (accept/decline/cancel path) are the target / request,
// never the actor. POST create carries the stacked `friends:request` buckets (10/hr + 30/day — both
// must pass; the `cards:publish` precedent).

export const friendsRoutes: RouteDef[] = [
  defineRoute({
    method: 'post',
    path: '/friends/requests',
    mutates: true,
    authzTest: 'authz:friend_request_create',
    specIds: ['SOC-01', 'SOC-08', 'SYS-01', 'SYS-05', 'SYS-07'],
    handler: [
      resolvePrincipal,
      rateLimit('friends:request'),
      rateLimit('friends:request:daily'),
      validateBody(createFriendRequestSchema),
      asyncHandler(postFriendRequest),
    ],
  }),
  defineRoute({
    method: 'post',
    path: '/friends/requests/:id/accept',
    mutates: true,
    authzTest: 'authz:friend_request_accept',
    specIds: ['SOC-01', 'SOC-08', 'SYS-01', 'SYS-07'],
    handler: [resolvePrincipal, asyncHandler(acceptFriendRequest)],
  }),
  defineRoute({
    method: 'post',
    path: '/friends/requests/:id/decline',
    mutates: true,
    authzTest: 'authz:friend_request_decline',
    specIds: ['SOC-08', 'SYS-01', 'SYS-07'],
    handler: [resolvePrincipal, asyncHandler(declineFriendRequest)],
  }),
  defineRoute({
    method: 'delete',
    path: '/friends/requests/:id',
    mutates: true,
    authzTest: 'authz:friend_request_cancel',
    specIds: ['SOC-08', 'SYS-01', 'SYS-07'],
    handler: [resolvePrincipal, asyncHandler(cancelFriendRequest)],
  }),
];
