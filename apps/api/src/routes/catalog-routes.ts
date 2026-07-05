import { createGameRequestSchema } from '@ingame/shared';
import { defineRoute, type RouteDef } from '../http/defineRoute';
import { validateBody } from '../http/validate';
import { asyncHandler } from '../http/asyncHandler';
import { resolvePrincipal } from '../auth/principal';
import { rateLimit } from '../http/rateLimit';
import { getGenres, searchCatalog, getPopular, createGame } from '../controllers/catalog-controller';

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
