import { defineRoute, type RouteDef } from '../http/defineRoute';
import { asyncHandler } from '../http/asyncHandler';
import { resolvePrincipal } from '../auth/principal';
import { getUser, getContributions } from '../controllers/users-controller';

// GET /users/:id — the FIRST target-id route (G-D). `crossPrincipal: true` marks it as returning
// ANOTHER principal's data, so the rule-4 inventory-diff lint requires a standing authz test that hits
// it as actor-B and asserts a 4xx (the collapse) AND the limited SHAPE (F06/SYS-07) — the read-path
// guard M1 could not yet write.
export const usersRoutes: RouteDef[] = [
  defineRoute({
    method: 'get',
    path: '/users/:id',
    mutates: false,
    crossPrincipal: true,
    authzTest: 'authz:get_user',
    specIds: ['PROF-03', 'PROF-05', 'SOC-09', 'MOD-09', 'AUTH-07', 'SYS-07'],
    handler: [resolvePrincipal, asyncHandler(getUser)],
  }),
  // GET /users/:id/contributions — the CAT-07 contributor profile (M5 goes-live). A cross-principal
  // read with the SAME MOD-09/SOC-09/AUTH-07 non-disclosure collapse; its authz test hits it as
  // actor-B (a blocked target → the generic collapse, indistinguishable from unknown).
  defineRoute({
    method: 'get',
    path: '/users/:id/contributions',
    mutates: false,
    crossPrincipal: true,
    authzTest: 'authz:get_contributions',
    specIds: ['CAT-07', 'CAT-09', 'CAT-10', 'PROF-03', 'SOC-09', 'MOD-09', 'AUTH-07', 'SYS-07'],
    handler: [resolvePrincipal, asyncHandler(getContributions)],
  }),
];
