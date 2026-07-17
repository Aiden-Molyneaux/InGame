import { defineRoute, type RouteDef } from '../http/defineRoute';
import { asyncHandler } from '../http/asyncHandler';
import { resolvePrincipal } from '../auth/principal';
import { rateLimit } from '../http/rateLimit';
import {
  getUser,
  getContributions,
  getUserCollection,
  getContributionsCards,
  getContributionsGames,
  getUserSearch,
} from '../controllers/users-controller';

// GET /users/:id — the FIRST target-id route (G-D). `crossPrincipal: true` marks it as returning
// ANOTHER principal's data, so the rule-4 inventory-diff lint requires a standing authz test that hits
// it as actor-B and asserts a 4xx (the collapse) AND the limited SHAPE (F06/SYS-07) — the read-path
// guard M1 could not yet write.
export const usersRoutes: RouteDef[] = [
  // GET /users/search?username= (SOC-07) — MUST precede `/users/:id` (else Express matches "search" as an
  // :id). Cross-principal: returns OTHER principals' public summaries (id/username/avatar) + relationship;
  // its authz test hits it UNAUTHENTICATED (actor-B with no session) asserting 401. `users:search` bucket.
  defineRoute({
    method: 'get',
    path: '/users/search',
    mutates: false,
    crossPrincipal: true,
    authzTest: 'authz:user_search',
    specIds: ['SOC-07', 'AUTH-11', 'SOC-09', 'SYS-01', 'SYS-05', 'SYS-07'],
    handler: [resolvePrincipal, rateLimit('users:search'), asyncHandler(getUserSearch)],
  }),
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
  // GET /users/:id/collection (COL-10/11) — the friend-view shelf. Cross-principal: returns the target's
  // friend-visible collection subset (never owner-only fields). A non-friend / blocked / suspended /
  // deleted / unknown target all collapse to the generic 404 (MOD-09) — its authz test hits it as actor-B.
  defineRoute({
    method: 'get',
    path: '/users/:id/collection',
    mutates: false,
    crossPrincipal: true,
    authzTest: 'authz:get_user_collection',
    specIds: ['COL-10', 'COL-11', 'SOC-11', 'PROF-03', 'SOC-09', 'MOD-09', 'AUTH-07', 'CARD-22', 'SYS-07'],
    handler: [resolvePrincipal, asyncHandler(getUserCollection)],
  }),
  // GET /users/:id/contributions/cards?cursor= (CAT-07 VIEW ALL cards) — friend-only, cursor-paginated.
  defineRoute({
    method: 'get',
    path: '/users/:id/contributions/cards',
    mutates: false,
    crossPrincipal: true,
    authzTest: 'authz:get_contributions_cards',
    specIds: ['CAT-07', 'PROF-03', 'SOC-09', 'MOD-09', 'AUTH-07', 'SYS-07'],
    handler: [resolvePrincipal, asyncHandler(getContributionsCards)],
  }),
  // GET /users/:id/contributions/games?cursor= (CAT-07 VIEW ALL games) — friend-only, cursor-paginated.
  defineRoute({
    method: 'get',
    path: '/users/:id/contributions/games',
    mutates: false,
    crossPrincipal: true,
    authzTest: 'authz:get_contributions_games',
    specIds: ['CAT-07', 'CAT-09', 'PROF-03', 'SOC-09', 'MOD-09', 'AUTH-07', 'SYS-07'],
    handler: [resolvePrincipal, asyncHandler(getContributionsGames)],
  }),
];
