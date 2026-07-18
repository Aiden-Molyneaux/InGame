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
  getUpcoming,
  getFriendsActive,
  getNewReleases,
  getGameDetail,
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
  // GET /catalog/upcoming (CAT-08, M6 P7) — the search-result shape, future releaseDate only; the
  // DISC-01/NOTIF-01 notify fields are M7 (0076 §0.8). No other principal's row data crosses (the
  // aggregate CAT-09 counts + own-it flag only) — crossPrincipal:false, mirrors /catalog/popular.
  defineRoute({
    method: 'get',
    path: '/catalog/upcoming',
    mutates: false,
    crossPrincipal: false,
    specIds: ['CAT-08'],
    handler: [resolvePrincipal, asyncHandler(getUpcoming)],
  }),
  // GET /catalog/friends-active (CAT-12, M6 P7, decision 0036/0076 §0.8) — the FRIENDS ARE PLAYING
  // Add-Game rail. Rooted at the CALLER's own accepted-friend set (like /catalog/games/:id/
  // friends-who-own above) — only aggregate friendsHaveCount + game rows cross, never a friend's
  // identity, so this is kept crossPrincipal:false, consistent with that sibling route.
  defineRoute({
    method: 'get',
    path: '/catalog/friends-active',
    mutates: false,
    crossPrincipal: false,
    specIds: ['CAT-12', 'PROF-03', 'SOC-09'],
    handler: [resolvePrincipal, asyncHandler(getFriendsActive)],
  }),
  // GET /catalog/new-releases (CAT-11, M6 W-C7, OQ-150) — recently-RELEASED entries (releaseDate in the
  // PAST, most-recent first), the search-result shape, sibling of /catalog/popular; the complement of
  // /catalog/upcoming (future dates). No other principal's row data crosses (the aggregate CAT-09 counts +
  // own-it flag only) — crossPrincipal:false, mirrors /catalog/popular.
  defineRoute({
    method: 'get',
    path: '/catalog/new-releases',
    mutates: false,
    crossPrincipal: false,
    specIds: ['CAT-11'],
    handler: [resolvePrincipal, asyncHandler(getNewReleases)],
  }),
  // GET /catalog/games/:id (CAT-05/09/09c, M6 W-C5) — the game-detail AGGREGATE (canonical facts + genres +
  // CAT-05 contributor + CAT-09 counts + own-it flag + the CAT-09c named friendsWhoOwn list). Rooted at the
  // CALLER's own accepted-friend set for the folded friendsWhoOwn (the friend-visible subset they are
  // already entitled to, like GET /me/friends + the focused friends-who-own route below) — NOT a general
  // cross-principal read (a block severs the friendship, so a blocked user is absent, SOC-09). The community
  // card GALLERY is NOT served here (its own route, GET /games/:id/cards). Kept crossPrincipal:false,
  // consistent with the friends-who-own sibling.
  defineRoute({
    method: 'get',
    path: '/catalog/games/:id',
    mutates: false,
    crossPrincipal: false,
    specIds: ['CAT-05', 'CAT-09', 'PROF-03', 'SOC-09'],
    handler: [resolvePrincipal, asyncHandler(getGameDetail)],
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
