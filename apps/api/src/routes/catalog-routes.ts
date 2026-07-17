import { createGameRequestSchema } from '@ingame/shared';
import { defineRoute, type RouteDef } from '../http/defineRoute';
import { validateBody } from '../http/validate';
import { asyncHandler } from '../http/asyncHandler';
import { resolvePrincipal } from '../auth/principal';
import { rateLimit } from '../http/rateLimit';
import {
  getGenres,
  searchCatalog,
  getPopular,
  createGame,
  getFriendsWhoOwn,
} from '../controllers/catalog-controller';

// The catalog route inventory (CAT-01..05/09; F30 — DATA, not regex-scraped). Reads serve GLOBAL
// community data (no other principal's private rows — the CAT-09 counts are anonymous aggregates /
// the caller's own relations); the one write is the CAT-03 dedup-guarded create.

export const catalogRoutes: RouteDef[] = [
  defineRoute({
    method: 'get',
    path: '/genres',
    mutates: false,
    crossPrincipal: false,
    specIds: ['CAT-04'],
    handler: [resolvePrincipal, asyncHandler(getGenres)],
  }),
  defineRoute({
    method: 'get',
    path: '/catalog/search',
    mutates: false,
    crossPrincipal: false, // aggregate counts + own-it flag only — no other principal's row data
    specIds: ['CAT-01', 'CAT-03', 'CAT-09'],
    handler: [resolvePrincipal, asyncHandler(searchCatalog)],
  }),
  defineRoute({
    method: 'get',
    path: '/catalog/popular',
    mutates: false,
    crossPrincipal: false,
    specIds: ['CAT-09'],
    handler: [resolvePrincipal, asyncHandler(getPopular)],
  }),
  // GET /catalog/games/:id/friends-who-own (CAT-09c) — the Game-page named friends-who-own list. Rooted
  // at the CALLER's own accepted-friend set (the friend-visible subset they are already entitled to, like
  // GET /me/friends) — NOT a general cross-principal read (a block severs the friendship, so a blocked
  // user is absent by construction, SOC-09). Kept crossPrincipal:false, consistent with /me/friends.
  // SEAM: the contract draws friendsWhoOwn as a FIELD on GET /catalog/games/:id (the aggregate game-detail
  // endpoint, not yet built) — served here as a focused route (flagged to the orchestrator).
  defineRoute({
    method: 'get',
    path: '/catalog/games/:id/friends-who-own',
    mutates: false,
    crossPrincipal: false,
    specIds: ['CAT-09', 'PROF-03', 'SOC-09'],
    handler: [resolvePrincipal, asyncHandler(getFriendsWhoOwn)],
  }),
  defineRoute({
    method: 'post',
    path: '/catalog/games',
    mutates: true,
    authzTest: 'authz:catalog_create',
    specIds: ['CAT-02', 'CAT-03', 'CAT-04', 'CAT-05', 'MOD-07', 'SYS-02', 'SYS-05', 'SYS-07'],
    handler: [
      resolvePrincipal,
      rateLimit('catalog:create'), // SYS-05 per-minute burst (G-K value)
      rateLimit('catalog:create:daily'), // SYS-05 per-day cap (OQ-094 — stacks with the burst)
      validateBody(createGameRequestSchema),
      asyncHandler(createGame),
    ],
  }),
];
