import { addListItemRequestSchema, rerankListRequestSchema } from '@ingame/shared';
import { defineRoute, type RouteDef } from '../http/defineRoute';
import { validateBody } from '../http/validate';
import { asyncHandler } from '../http/asyncHandler';
import { resolvePrincipal } from '../auth/principal';
import { rateLimit } from '../http/rateLimit';
import {
  getLists,
  addListItem,
  removeListItem,
  rerankList,
} from '../controllers/list-controller';

// The SOC-04 Top-10 list route inventory (M6 P5; F30 — DATA, not regex-scraped). Every write targets
// a USER-OWNED row — each declares its standing SYS-07 actor-B 4xx test. v2 ships ONE list kind
// (`top10`) — the `:id` path segment is the STABLE KIND STRING (list-service's design note); anything
// else 404s (general lists parked §10).

export const listRoutes: RouteDef[] = [
  defineRoute({
    method: 'get',
    path: '/me/lists',
    mutates: false,
    crossPrincipal: false, // own list(s) only
    specIds: ['SOC-04', 'SYS-01'],
    handler: [resolvePrincipal, asyncHandler(getLists)],
  }),
  defineRoute({
    method: 'post',
    path: '/me/lists/:id/items',
    mutates: true,
    authzTest: 'authz:list_item_add',
    specIds: ['SOC-04', 'COL-13', 'SYS-01', 'SYS-02', 'SYS-07'],
    handler: [
      resolvePrincipal,
      rateLimit('lists:write'),
      validateBody(addListItemRequestSchema),
      asyncHandler(addListItem),
    ],
  }),
  defineRoute({
    method: 'delete',
    path: '/me/lists/:id/items/:gameId',
    mutates: true,
    authzTest: 'authz:list_item_remove',
    specIds: ['SOC-04', 'SYS-01', 'SYS-07'],
    handler: [resolvePrincipal, rateLimit('lists:write'), asyncHandler(removeListItem)],
  }),
  defineRoute({
    method: 'patch',
    path: '/me/lists/:id',
    mutates: true,
    authzTest: 'authz:list_rerank',
    specIds: ['SOC-04', 'COL-07', 'COL-13', 'SYS-01', 'SYS-02', 'SYS-07'],
    handler: [
      resolvePrincipal,
      rateLimit('lists:write'),
      validateBody(rerankListRequestSchema),
      asyncHandler(rerankList),
    ],
  }),
];
