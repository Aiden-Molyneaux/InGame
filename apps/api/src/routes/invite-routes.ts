import { defineRoute, type RouteDef } from '../http/defineRoute';
import { asyncHandler } from '../http/asyncHandler';
import { resolvePrincipal, optionalPrincipal } from '../auth/principal';
import { rateLimit } from '../http/rateLimit';
import { postInvite, getInvite } from '../controllers/invite-controller';

// SOC-10 invite routes (M6 P3; decision 0076 §0.6).
//   • POST /me/invites — mint (mutating; actor = the verified principal ONLY; `invites:create` 5/day).
//   • GET /invites/:token — resolve on the AUTH-LOOKUP read class. OPTIONAL auth (`optionalPrincipal` —
//     a fresh install may resolve). crossPrincipal (returns the sender's summary) → its authz test hits
//     it with a FORGED token as actor-B asserting 409 INVITE_INVALID. `invites:resolve` IP throttle
//     (SYS-05 defence-in-depth; the token is 256-bit random so guessing is infeasible regardless).
export const inviteRoutes: RouteDef[] = [
  defineRoute({
    method: 'post',
    path: '/me/invites',
    mutates: true,
    authzTest: 'authz:invite_create',
    specIds: ['SOC-10', 'SYS-01', 'SYS-05', 'SYS-07'],
    handler: [resolvePrincipal, rateLimit('invites:create'), asyncHandler(postInvite)],
  }),
  defineRoute({
    method: 'get',
    path: '/invites/:token',
    mutates: false,
    crossPrincipal: true,
    authzTest: 'authz:invite_resolve',
    specIds: ['SOC-10', 'AUTH-11', 'SOC-09', 'MOD-09', 'SYS-05', 'SYS-07'],
    handler: [optionalPrincipal, rateLimit('invites:resolve'), asyncHandler(getInvite)],
  }),
];
