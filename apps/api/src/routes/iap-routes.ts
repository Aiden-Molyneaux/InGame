import { iapValidateRequestSchema } from '@ingame/shared';
import { defineRoute, type RouteDef } from '../http/defineRoute';
import { validateBody } from '../http/validate';
import { asyncHandler } from '../http/asyncHandler';
import { resolvePrincipal } from '../auth/principal';
import { rateLimit } from '../http/rateLimit';
import { validatePurchase, getStore, webhook } from '../controllers/iap-controller';

// The M5 P2 IAP + Store route inventory (ECON-06/09/10 — decision 0072/0073; F30 — DATA, not
// regex-scraped). store_products is GLOBAL; iap_receipts + wallets are USER-OWNED.
//  - GET /store — an OWN-only read (the `purchased` flags are the caller's own receipts; never another
//    principal's data), so crossPrincipal:false + no authzTest; resolvePrincipal makes anon → 401.
//  - POST /iap/validate — mutates (grant/restore); declares its SYS-07 actor-B authz test + the
//    `iap:validate` 10/min bucket (decision 0073 §0.7); body validated via the shared schema.
//  - POST /iap/webhook — server-to-server. The RevenueCat SIGNATURE is its auth (verified in-service
//    over the raw body), so it carries NO resolvePrincipal + NO rate limit; a bad/absent signature →
//    401 with zero state change. defineRoute still requires an authzTest id for a mutating route — the
//    bad-signature 401 IS that standing test (authz:iap_webhook).

export const iapRoutes: RouteDef[] = [
  defineRoute({
    method: 'get',
    path: '/store',
    mutates: false,
    crossPrincipal: false, // own purchased flags only
    specIds: ['ECON-07', 'ECON-10', 'SYS-01'],
    handler: [resolvePrincipal, asyncHandler(getStore)],
  }),
  defineRoute({
    method: 'post',
    path: '/iap/validate',
    mutates: true,
    authzTest: 'authz:iap_validate',
    specIds: ['ECON-06', 'ECON-10', 'SYS-01', 'SYS-02', 'SYS-07'],
    handler: [
      resolvePrincipal,
      rateLimit('iap:validate'),
      validateBody(iapValidateRequestSchema),
      asyncHandler(validatePurchase),
    ],
  }),
  defineRoute({
    method: 'post',
    path: '/iap/webhook',
    mutates: true,
    authzTest: 'authz:iap_webhook', // the RC signature is the auth; a bad-signature 401 is its standing test
    specIds: ['ECON-06', 'ECON-09', 'SYS-01'],
    handler: [asyncHandler(webhook)], // NO resolvePrincipal / NO rateLimit — signature-gated, server-to-server
  }),
];
