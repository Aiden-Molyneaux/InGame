import { patchMeRequestSchema } from '@ingame/shared';
import { defineRoute, type RouteDef } from '../http/defineRoute';
import { validateBody } from '../http/validate';
import { asyncHandler } from '../http/asyncHandler';
import { resolvePrincipal } from '../auth/principal';
import { getMe, patchMe } from '../controllers/me-controller';

// The `/me` route inventory (DATA, not regex-scraped — F30). `mutates` is explicit; the mutating
// route declares its standing SYS-07 authz test id, which the rule-4 inventory-diff lint pairs
// against a test that hits the route as actor-B asserting 4xx (authz:patch_me).

export const meRoutes: RouteDef[] = [
  defineRoute({
    method: 'get',
    path: '/me',
    mutates: false,
    // self-view only — derives the actor from the principal; returns no other principal's data.
    crossPrincipal: false,
    specIds: ['PROF-01', 'PROF-05', 'SYS-01'],
    handler: [resolvePrincipal, asyncHandler(getMe)],
  }),
  defineRoute({
    method: 'patch',
    path: '/me',
    mutates: true,
    authzTest: 'authz:patch_me',
    specIds: ['PROF-01', 'SYS-01', 'SYS-02', 'SYS-07'],
    handler: [resolvePrincipal, validateBody(patchMeRequestSchema), asyncHandler(patchMe)],
  }),
];
