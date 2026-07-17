import { defineRoute, type RouteDef } from '../http/defineRoute';
import { asyncHandler } from '../http/asyncHandler';
import { resolvePrincipal } from '../auth/principal';
import {
  getDefinitions,
  getMyAchievements,
  getUserAchievements,
} from '../controllers/achievement-controller';

// The Achievements read routes (M6 P6 — api-contract §Achievements 0.36). The engine (unlocks/rewards)
// is not an endpoint (it runs post-commit off the event spine); these are the three read surfaces.
export const achievementRoutes: RouteDef[] = [
  // GET /achievements — the active definitions, secret-masked for the caller. Self-relative masking
  // (the caller's own unlocked secrets reveal), so it authenticates but is not cross-principal.
  defineRoute({
    method: 'get',
    path: '/achievements',
    mutates: false,
    crossPrincipal: false,
    specIds: ['ACH-01', 'ACH-03', 'ACH-09', 'SYS-01'],
    handler: [resolvePrincipal, asyncHandler(getDefinitions)],
  }),
  // GET /me/achievements — the caller's own state (self-view only).
  defineRoute({
    method: 'get',
    path: '/me/achievements',
    mutates: false,
    crossPrincipal: false,
    specIds: ['ACH-02', 'ACH-03', 'ACH-05', 'SYS-01'],
    handler: [resolvePrincipal, asyncHandler(getMyAchievements)],
  }),
  // GET /users/:id/achievements — a user's earned SHOWCASE. Cross-principal: the MOD-09/SOC-09/AUTH-07
  // non-disclosure collapse + the PROF-03 friend gate live in the service (blocked → generic 404; a
  // non-friend → honest count only; NO secret-existence leak). Its authz test hits it as actor-B.
  defineRoute({
    method: 'get',
    path: '/users/:id/achievements',
    mutates: false,
    crossPrincipal: true,
    authzTest: 'authz:get_user_achievements',
    specIds: ['ACH-05', 'PROF-03', 'SOC-09', 'MOD-09', 'AUTH-07', 'SYS-07'],
    handler: [resolvePrincipal, asyncHandler(getUserAchievements)],
  }),
];
