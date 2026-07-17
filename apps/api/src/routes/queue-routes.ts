import { addQueueItemRequestSchema, reorderQueueRequestSchema } from '@ingame/shared';
import { defineRoute, type RouteDef } from '../http/defineRoute';
import { validateBody } from '../http/validate';
import { asyncHandler } from '../http/asyncHandler';
import { resolvePrincipal } from '../auth/principal';
import { rateLimit } from '../http/rateLimit';
import {
  getQueue,
  addQueueItem,
  reorderQueue,
  deleteQueueItem,
} from '../controllers/queue-controller';

// The WTP-01/02 queue route inventory (M6 P5; F30 — DATA, not regex-scraped). Every write targets a
// USER-OWNED row — each declares its standing SYS-07 actor-B 4xx test. NOTE: `/me/queue/reorder`
// registers BEFORE `/me/queue/:itemId` so Express never captures "reorder" as an item id (mirrors
// collection-routes.ts).

export const queueRoutes: RouteDef[] = [
  defineRoute({
    method: 'get',
    path: '/me/queue',
    mutates: false,
    crossPrincipal: false, // own queue only
    specIds: ['WTP-01', 'SYS-01'],
    handler: [resolvePrincipal, asyncHandler(getQueue)],
  }),
  defineRoute({
    method: 'post',
    path: '/me/queue',
    mutates: true,
    authzTest: 'authz:queue_add',
    specIds: ['WTP-01', 'WTP-02', 'SYS-01', 'SYS-02', 'SYS-07'],
    handler: [
      resolvePrincipal,
      rateLimit('queue:write'),
      validateBody(addQueueItemRequestSchema),
      asyncHandler(addQueueItem),
    ],
  }),
  defineRoute({
    method: 'patch',
    path: '/me/queue/reorder',
    mutates: true,
    authzTest: 'authz:queue_reorder',
    specIds: ['WTP-01', 'SYS-01', 'SYS-02', 'SYS-07'],
    handler: [
      resolvePrincipal,
      rateLimit('queue:write'),
      validateBody(reorderQueueRequestSchema),
      asyncHandler(reorderQueue),
    ],
  }),
  defineRoute({
    method: 'delete',
    path: '/me/queue/:itemId',
    mutates: true,
    authzTest: 'authz:queue_remove',
    specIds: ['WTP-01', 'SYS-01', 'SYS-07'],
    handler: [resolvePrincipal, rateLimit('queue:write'), asyncHandler(deleteQueueItem)],
  }),
];
