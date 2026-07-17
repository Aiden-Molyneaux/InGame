import { defineRoute, type RouteDef } from '../http/defineRoute';
import { asyncHandler } from '../http/asyncHandler';
import { resolvePrincipal } from '../auth/principal';
import { getTrendingCards } from '../controllers/card-controller';

// Discover routes (DISC-04). GET /discover/trending-cards is a cross-principal READ — it returns OTHER
// principals' published cards ranked by adoption (OQ-055), block-filtered per the caller (SOC-09). Its
// standing authz test hits it as actor-B and asserts the gate (unauthenticated → 401; the F06/SYS-07
// obligation for a cross-principal read). NON-COMMERCE: counts, never prices.
export const discoverRoutes: RouteDef[] = [
  defineRoute({
    method: 'get',
    path: '/discover/trending-cards',
    mutates: false,
    crossPrincipal: true,
    authzTest: 'authz:trending_cards_read',
    specIds: ['DISC-04', 'CARD-05', 'CAT-05', 'SOC-09', 'OQ-055', 'SYS-01', 'F06'],
    handler: [resolvePrincipal, asyncHandler(getTrendingCards)],
  }),
];
