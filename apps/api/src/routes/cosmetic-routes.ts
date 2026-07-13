import { acquireBatchRequestSchema, acquireRequestSchema } from '@ingame/shared';
import { defineRoute, type RouteDef } from '../http/defineRoute';
import { validateBody } from '../http/validate';
import { asyncHandler } from '../http/asyncHandler';
import { resolvePrincipal } from '../auth/principal';
import { rateLimit } from '../http/rateLimit';
import {
  getEntitlements,
  acquireCosmetic,
  acquireCosmeticBatch,
  listCosmetics,
} from '../controllers/cosmetic-controller';

// The M5 P4 cosmetics/entitlements route inventory (COSM-03/ECON-01 — decision 0072/0073; F30 — DATA,
// not regex-scraped). `user_entitlements` is USER-OWNED — every write declares its standing SYS-07
// actor-B 4xx test. GET /me/entitlements and GET /cosmetics are own-only reads (never another
// principal's data), so neither carries an authzTest. Both acquire endpoints ride `wallet:spend`
// (30/60s, decision 0073 §0.7) — the same bucket P3's adopt rides, so a caller cannot bypass the spend
// cap by mixing acquire/adopt calls. `GET /store` premium-cosmetics content stays a P6 store-front
// concern, NOT registered here.

export const cosmeticRoutes: RouteDef[] = [
  defineRoute({
    method: 'get',
    path: '/cosmetics',
    mutates: false,
    crossPrincipal: false, // caller's own `owned` flags only; the catalog itself is public content
    specIds: ['COSM-01', 'COSM-03'],
    handler: [resolvePrincipal, asyncHandler(listCosmetics)],
  }),
  defineRoute({
    method: 'get',
    path: '/me/entitlements',
    mutates: false,
    crossPrincipal: false, // own entitlements only
    specIds: ['COSM-03', 'SYS-01'],
    handler: [resolvePrincipal, asyncHandler(getEntitlements)],
  }),
  defineRoute({
    method: 'post',
    path: '/cosmetics/:cosmeticId/acquire',
    mutates: true,
    authzTest: 'authz:cosmetic_acquire',
    specIds: ['COSM-03', 'ECON-01', 'ECON-07', 'SYS-01', 'SYS-02', 'SYS-07'],
    handler: [
      resolvePrincipal,
      rateLimit('wallet:spend'),
      validateBody(acquireRequestSchema),
      asyncHandler(acquireCosmetic),
    ],
  }),
  defineRoute({
    method: 'post',
    path: '/cosmetics/acquire-batch',
    mutates: true,
    authzTest: 'authz:cosmetic_acquire_batch',
    specIds: ['CARD-13', 'COSM-03', 'ECON-01', 'ECON-07', 'SYS-01', 'SYS-02', 'SYS-07'],
    handler: [
      resolvePrincipal,
      rateLimit('wallet:spend'),
      validateBody(acquireBatchRequestSchema),
      asyncHandler(acquireCosmeticBatch),
    ],
  }),
];
