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
  unpublishCard,
  getGameGallery,
  adoptCard,
  getShareImage,
} from '../controllers/card-controller';

// The M4 card-substrate route inventory (CARD-14/15/24 + COL-06 — decision 0066; F30 — DATA, not
// regex-scraped). card_designs + style_presets are USER-OWNED — every write declares its standing
// SYS-07 actor-B 4xx test. The M5 routes (publish/unpublish/adopt/share-image, the gallery) are P3/P9
// (decision 0072/0073) — card-bases is not registered yet; it lands with its own milestone, not as a stub.

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
  // M5 P3 publish/adopt/gallery (decision 0072/0073) — CARD-13/15/19/20, personalized pricing, SOC-09.
  defineRoute({
    method: 'post',
    path: '/cards/:cardId/publish',
    mutates: true,
    authzTest: 'authz:card_publish',
    specIds: ['CARD-13', 'CARD-15', 'CARD-19', 'CARD-20', 'SYS-01', 'SYS-05', 'SYS-07'],
    // Stacked publish rate caps (CARD-19; the `catalog:create` two-tier precedent — both must pass).
    handler: [
      resolvePrincipal,
      rateLimit('cards:publish'),
      rateLimit('cards:publish:daily'),
      asyncHandler(publishCard),
    ],
  }),
  defineRoute({
    method: 'post',
    path: '/cards/:cardId/unpublish',
    mutates: true,
    authzTest: 'authz:card_unpublish',
    specIds: ['CARD-20', 'SYS-01', 'SYS-07'],
    handler: [resolvePrincipal, rateLimit('cards:write'), asyncHandler(unpublishCard)],
  }),
  defineRoute({
    method: 'get',
    path: '/games/:gameId/cards',
    mutates: false,
    crossPrincipal: true, // OQ-122 — the community gallery returns OTHER principals' published cards
    authzTest: 'authz:game_gallery_read',
    specIds: ['CARD-05', 'CARD-15', 'ECON-03', 'OQ-122', 'SOC-09', 'SYS-01', 'F06'],
    handler: [resolvePrincipal, asyncHandler(getGameGallery)],
  }),
  defineRoute({
    method: 'post',
    path: '/cards/:cardId/adopt',
    mutates: true,
    authzTest: 'authz:card_adopt',
    specIds: ['CARD-04', 'CARD-05', 'ECON-03', 'ECON-04', 'SYS-01', 'SYS-05', 'SYS-07'],
    // Stacked adopt rate caps (decision 0073 §0.7 — closes OQ-097; both must pass).
    handler: [
      resolvePrincipal,
      rateLimit('cards:adopt'),
      rateLimit('cards:adopt:daily'),
      asyncHandler(adoptCard),
    ],
  }),
  defineRoute({
    method: 'get',
    path: '/cards/:cardId/share-image',
    mutates: false,
    crossPrincipal: true, // CARD-21 — a published/adopted card's share image can read another principal's card
    authzTest: 'authz:card_share_image',
    specIds: ['CARD-21', 'SYS-01', 'SYS-07'],
    handler: [resolvePrincipal, asyncHandler(getShareImage)],
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
