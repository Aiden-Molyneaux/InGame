import { dailyBonusRequestSchema } from '@ingame/shared';
import { defineRoute, type RouteDef } from '../http/defineRoute';
import { validateBody } from '../http/validate';
import { asyncHandler } from '../http/asyncHandler';
import { resolvePrincipal } from '../auth/principal';
import { rateLimit } from '../http/rateLimit';
import { getWallet, getLedger, claimDailyBonus } from '../controllers/wallet-controller';

// The M5 P1 wallet route inventory (ECON-02/07 — decision 0072/0073; F30 — DATA, not regex-scraped).
// wallets + currency_ledger are USER-OWNED. GET /me/wallet + GET /me/wallet/ledger are own-only reads
// (they can never return another principal's data — the actor is the verified principal), so they
// carry no authzTest. POST /me/daily-bonus mutates → declares its standing SYS-07 actor-B 4xx test;
// it rides the fallback rate bucket (decision 0073 §0.7 — no dedicated bonus bucket). The economy
// SPEND endpoints (adopt/acquire, `wallet:spend`) are P3/P4 — NOT registered here.

export const walletRoutes: RouteDef[] = [
  defineRoute({
    method: 'get',
    path: '/me/wallet',
    mutates: false,
    crossPrincipal: false, // own wallet only
    specIds: ['ECON-02', 'ECON-07', 'SYS-01'],
    handler: [resolvePrincipal, asyncHandler(getWallet)],
  }),
  defineRoute({
    method: 'get',
    path: '/me/wallet/ledger',
    mutates: false,
    crossPrincipal: false, // own ledger only
    specIds: ['ECON-07', 'SYS-01'],
    handler: [resolvePrincipal, asyncHandler(getLedger)],
  }),
  defineRoute({
    method: 'post',
    path: '/me/daily-bonus',
    mutates: true,
    authzTest: 'authz:daily_bonus',
    specIds: ['ECON-02', 'ECON-07', 'SYS-01', 'SYS-02', 'SYS-07'],
    handler: [
      resolvePrincipal,
      rateLimit('wallet:daily-bonus'), // unknown bucket → the 60/min fallback (decision 0073 §0.7)
      validateBody(dailyBonusRequestSchema),
      asyncHandler(claimDailyBonus),
    ],
  }),
];
