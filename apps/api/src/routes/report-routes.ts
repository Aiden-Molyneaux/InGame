import { createReportRequestSchema } from '@ingame/shared';
import { defineRoute, type RouteDef } from '../http/defineRoute';
import { validateBody } from '../http/validate';
import { asyncHandler } from '../http/asyncHandler';
import { resolvePrincipal } from '../auth/principal';
import { rateLimit } from '../http/rateLimit';
import { postReport } from '../controllers/report-controller';

// MOD-01 report-capture route (M6 P7, decision 0076 §0.5). The one mutating route → its standing
// SYS-07 authz test id (rule-4 inventory-diff lint); the actor is the verified principal ONLY
// (`targetId` in the body is the TARGET, never the actor). `reports:create` is a per-day cap (the
// reporter-cap half of OQ-093 lands early; dedupe stays M7).

export const reportRoutes: RouteDef[] = [
  defineRoute({
    method: 'post',
    path: '/reports',
    mutates: true,
    authzTest: 'authz:report_create',
    specIds: ['MOD-01', 'SYS-01', 'SYS-05', 'SYS-07'],
    handler: [
      resolvePrincipal,
      rateLimit('reports:create'),
      validateBody(createReportRequestSchema),
      asyncHandler(postReport),
    ],
  }),
];
