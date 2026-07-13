import {
  createCardRequestSchema,
  createStylePresetRequestSchema,
  updateCardRequestSchema,
  updateStylePresetRequestSchema,
} from '@ingame/shared';
import { defineRoute, type RouteDef } from '../http/defineRoute';
import { validateBody } from '../http/validate';
import { asyncHandler } from '../http/asyncHandler';
import { resolvePrincipal } from '../auth/principal';
import { rateLimit } from '../http/rateLimit';
import {
  createCard,
  patchCard,
  savePrivate,
  deleteCard,
  getMyCards,
  getEntryCards,
  getStylePresets,
  createStylePreset,
  patchStylePreset,
  deleteStylePreset,
  publishCard,
  getGameGallery,
  adoptCard,
} from '../controllers/card-controller';

// The M4 card-substrate route inventory (CARD-14/15/24 + COL-06 — decision 0066; F30 — DATA, not
// regex-scraped). card_designs + style_presets are USER-OWNED — every write declares its standing
// SYS-07 actor-B 4xx test. The M5 routes (publish/unpublish/adopt/share-image, the gallery,
// card-bases) are NOT registered yet — they land with their milestones, not as stubs.

export const cardRoutes: RouteDef[] = [
  defineRoute({
    method: 'post',
    path: '/cards',
    mutates: true,
    authzTest: 'authz:card_create',
    specIds: ['CARD-14', 'CARD-24', 'SYS-01', 'SYS-02', 'SYS-07'],
    handler: [
      resolvePrincipal,
      rateLimit('cards:write'),
      validateBody(createCardRequestSchema),
      asyncHandler(createCard),
    ],
  }),
  defineRoute({
    method: 'patch',
    path: '/cards/:cardId',
    mutates: true,
    authzTest: 'authz:card_update',
    specIds: ['CARD-14', 'CARD-20', 'CARD-24', 'SYS-01', 'SYS-02', 'SYS-07'],
    handler: [
      resolvePrincipal,
      rateLimit('cards:write'),
      validateBody(updateCardRequestSchema),
      asyncHandler(patchCard),
    ],
  }),
  defineRoute({
    method: 'post',
    path: '/cards/:cardId/save-private',
    mutates: true,
    authzTest: 'authz:card_save_private',
    specIds: ['CARD-04', 'CARD-15', 'SYS-01', 'SYS-07'],
    handler: [resolvePrincipal, rateLimit('cards:write'), asyncHandler(savePrivate)],
  }),
  defineRoute({
    method: 'delete',
    path: '/cards/:cardId',
    mutates: true,
    authzTest: 'authz:card_delete',
    specIds: ['CARD-14', 'COL-06', 'SYS-01', 'SYS-07'],
    handler: [resolvePrincipal, rateLimit('cards:write'), asyncHandler(deleteCard)],
  }),
  defineRoute({
    method: 'get',
    path: '/me/cards',
    mutates: false,
    crossPrincipal: false, // own designs only
    specIds: ['CARD-14', 'SYS-01'],
    handler: [resolvePrincipal, asyncHandler(getMyCards)],
  }),
  // M5 §1 publish thread (decision 0073 §1 spike) — publish · gallery · adopt.
  defineRoute({
    method: 'post',
    path: '/cards/:cardId/publish',
    mutates: true,
    authzTest: 'authz:card_publish',
    specIds: ['CARD-15', 'CARD-20', 'SYS-01', 'SYS-07'],
    handler: [resolvePrincipal, rateLimit('cards:write'), asyncHandler(publishCard)],
  }),
  defineRoute({
    method: 'get',
    path: '/games/:gameId/cards',
    mutates: false,
    crossPrincipal: true, // OQ-122 — the community gallery returns OTHER principals' published cards
    authzTest: 'authz:game_gallery_read',
    specIds: ['CARD-15', 'OQ-122', 'SYS-01', 'F06'],
    handler: [resolvePrincipal, asyncHandler(getGameGallery)],
  }),
  defineRoute({
    method: 'post',
    path: '/cards/:cardId/adopt',
    mutates: true,
    authzTest: 'authz:card_adopt',
    specIds: ['CARD-04', 'ECON-03', 'SYS-01', 'SYS-07'],
    handler: [resolvePrincipal, rateLimit('cards:write'), asyncHandler(adoptCard)],
  }),
  defineRoute({
    method: 'get',
    path: '/me/collection/:entryId/cards',
    mutates: false,
    crossPrincipal: false, // own entry → own designs (actor-B hits the same 404)
    specIds: ['COL-06', 'SYS-01'],
    handler: [resolvePrincipal, asyncHandler(getEntryCards)],
  }),
  defineRoute({
    method: 'get',
    path: '/me/style-presets',
    mutates: false,
    crossPrincipal: false,
    specIds: ['CARD-24', 'SYS-01'],
    handler: [resolvePrincipal, asyncHandler(getStylePresets)],
  }),
  defineRoute({
    method: 'post',
    path: '/me/style-presets',
    mutates: true,
    authzTest: 'authz:style_preset_create',
    specIds: ['CARD-24', 'SYS-01', 'SYS-02', 'SYS-04', 'SYS-07'],
    handler: [
      resolvePrincipal,
      rateLimit('cards:write'),
      validateBody(createStylePresetRequestSchema),
      asyncHandler(createStylePreset),
    ],
  }),
  defineRoute({
    method: 'patch',
    path: '/me/style-presets/:presetId',
    mutates: true,
    authzTest: 'authz:style_preset_update',
    specIds: ['CARD-24', 'SYS-01', 'SYS-02', 'SYS-07'],
    handler: [
      resolvePrincipal,
      rateLimit('cards:write'),
      validateBody(updateStylePresetRequestSchema),
      asyncHandler(patchStylePreset),
    ],
  }),
  defineRoute({
    method: 'delete',
    path: '/me/style-presets/:presetId',
    mutates: true,
    authzTest: 'authz:style_preset_delete',
    specIds: ['CARD-24', 'SYS-01', 'SYS-07'],
    handler: [resolvePrincipal, rateLimit('cards:write'), asyncHandler(deleteStylePreset)],
  }),
];
