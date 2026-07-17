import { createFriendRequestSchema } from '@ingame/shared';
import { defineRoute, type RouteDef } from '../http/defineRoute';
import { validateBody } from '../http/validate';
import { asyncHandler } from '../http/asyncHandler';
import { resolvePrincipal } from '../auth/principal';
import { postFriendRequest, acceptFriendRequest } from '../controllers/social-controller';

// SOC-01/08 friend-request lifecycle (M6 §1 spike). Mutating routes → each declares its standing SYS-07
// actor-B 4xx authz test id (paired by the rule-4 inventory-diff lint). The actor is the verified
// principal ONLY; `toUserId` (POST body) / `:id` (accept path) are the target / the request, never the actor.

export const friendsRoutes: RouteDef[] = [
  defineRoute({
    method: 'post',
    path: '/friends/requests',
    mutates: true,
    authzTest: 'authz:friend_request_create',
    specIds: ['SOC-01', 'SOC-08', 'SYS-01', 'SYS-07'],
    handler: [resolvePrincipal, validateBody(createFriendRequestSchema), asyncHandler(postFriendRequest)],
  }),
  defineRoute({
    method: 'post',
    path: '/friends/requests/:id/accept',
    mutates: true,
    authzTest: 'authz:friend_request_accept',
    specIds: ['SOC-01', 'SOC-08', 'SYS-01', 'SYS-07'],
    handler: [resolvePrincipal, asyncHandler(acceptFriendRequest)],
  }),
];
