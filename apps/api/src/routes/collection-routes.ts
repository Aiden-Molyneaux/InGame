import {
  addCollectionEntryRequestSchema,
  nowPlayingRequestSchema,
  reorderCollectionRequestSchema,
  updateCollectionEntryRequestSchema,
} from '@ingame/shared';
import { defineRoute, type RouteDef } from '../http/defineRoute';
import { validateBody } from '../http/validate';
import { asyncHandler } from '../http/asyncHandler';
import { resolvePrincipal } from '../auth/principal';
import { rateLimit } from '../http/rateLimit';
import {
  getCollection,
  addEntry,
  patchEntry,
  deleteEntry,
  reorderCollection,
  putNowPlaying,
} from '../controllers/collection-controller';

// The collection route inventory (COL-01..07 + WTP-03; F30 — DATA, not regex-scraped). Every write
// targets USER-OWNED rows — each declares its standing SYS-07 actor-B 4xx test (the G-D re-fire
// surface). NOTE: `/me/collection/reorder` registers BEFORE `/me/collection/:entryId` so Express
// never captures "reorder" as an entry id.

export const collectionRoutes: RouteDef[] = [
  defineRoute({
    method: 'get',
    path: '/me/collection',
    mutates: false,
    crossPrincipal: false, // own shelf only
    specIds: ['COL-01', 'COL-07', 'SYS-01'],
    handler: [resolvePrincipal, asyncHandler(getCollection)],
  }),
  defineRoute({
    method: 'post',
    path: '/me/collection',
    mutates: true,
    authzTest: 'authz:collection_add',
    specIds: ['COL-01', 'SYS-01', 'SYS-02', 'SYS-07'],
    handler: [
      resolvePrincipal,
      rateLimit('collection:write'), // SYS-05 (OQ-094) — shared collection-write cap
      validateBody(addCollectionEntryRequestSchema),
      asyncHandler(addEntry),
    ],
  }),
  defineRoute({
    method: 'patch',
    path: '/me/collection/reorder',
    mutates: true,
    authzTest: 'authz:collection_reorder',
    specIds: ['COL-07', 'SYS-01', 'SYS-02', 'SYS-07'],
    handler: [
      resolvePrincipal,
      rateLimit('collection:write'), // SYS-05 (OQ-094)
      validateBody(reorderCollectionRequestSchema),
      asyncHandler(reorderCollection),
    ],
  }),
  defineRoute({
    method: 'patch',
    path: '/me/collection/:entryId',
    mutates: true,
    authzTest: 'authz:collection_update',
    specIds: ['COL-02', 'COL-03', 'COL-05', 'SYS-01', 'SYS-02', 'SYS-07'],
    handler: [
      resolvePrincipal,
      rateLimit('collection:write'), // SYS-05 (OQ-094)
      validateBody(updateCollectionEntryRequestSchema),
      asyncHandler(patchEntry),
    ],
  }),
  defineRoute({
    method: 'delete',
    path: '/me/collection/:entryId',
    mutates: true,
    authzTest: 'authz:collection_remove',
    specIds: ['COL-01', 'SYS-01', 'SYS-07'],
    handler: [resolvePrincipal, rateLimit('collection:write'), asyncHandler(deleteEntry)],
  }),
  defineRoute({
    method: 'put',
    path: '/me/now-playing',
    mutates: true,
    authzTest: 'authz:now_playing',
    specIds: ['WTP-03', 'SYS-01', 'SYS-02', 'SYS-07'],
    handler: [
      resolvePrincipal,
      rateLimit('collection:write'), // SYS-05 (OQ-094)
      validateBody(nowPlayingRequestSchema),
      asyncHandler(putNowPlaying),
    ],
  }),
];
