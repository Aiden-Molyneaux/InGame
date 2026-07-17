import { createRecommendationSchema } from '@ingame/shared';
import { defineRoute, type RouteDef } from '../http/defineRoute';
import { validateBody } from '../http/validate';
import { asyncHandler } from '../http/asyncHandler';
import { resolvePrincipal } from '../auth/principal';
import { rateLimit } from '../http/rateLimit';
import {
  postRecommendation,
  getRecommendations,
  deleteRecommendation,
  getFeed,
} from '../controllers/recommendation-controller';

// SOC-05 recommendations + SOC-06 feed (M6 P4). POST /recommendations mutates + carries the
// `recommendations:create` bucket (20/day, decision 0076 §0.7); DELETE dismiss mutates. Both mutating
// routes declare their standing SYS-07 actor-B 4xx authz test id (paired by the rule-4 inventory-diff
// lint). GET /me/recommendations + GET /me/feed are SELF-scoped reads (the actor's own inbox / aggregated
// friend activity) — not cross-principal (they never return another principal's owner-private data; the
// feed's friend summaries are public allowlists), so no authzTest is required.

export const recommendationRoutes: RouteDef[] = [
  defineRoute({
    method: 'post',
    path: '/recommendations',
    mutates: true,
    authzTest: 'authz:recommendation_create',
    specIds: ['SOC-05', 'SOC-09', 'MOD-09', 'SYS-01', 'SYS-02', 'SYS-05', 'SYS-07'],
    handler: [
      resolvePrincipal,
      rateLimit('recommendations:create'),
      validateBody(createRecommendationSchema),
      asyncHandler(postRecommendation),
    ],
  }),
  defineRoute({
    method: 'get',
    path: '/me/recommendations',
    mutates: false,
    crossPrincipal: false,
    specIds: ['SOC-05', 'SYS-01'],
    handler: [resolvePrincipal, asyncHandler(getRecommendations)],
  }),
  defineRoute({
    method: 'delete',
    path: '/me/recommendations/:recId',
    mutates: true,
    authzTest: 'authz:recommendation_dismiss',
    specIds: ['SOC-05', 'SYS-01', 'SYS-07'],
    handler: [resolvePrincipal, asyncHandler(deleteRecommendation)],
  }),
  defineRoute({
    method: 'get',
    path: '/me/feed',
    mutates: false,
    crossPrincipal: false,
    specIds: ['SOC-06', 'SYS-01'],
    handler: [resolvePrincipal, asyncHandler(getFeed)],
  }),
];
