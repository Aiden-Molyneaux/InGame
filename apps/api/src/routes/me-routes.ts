import {
  patchMeRequestSchema,
  createGamertagRequestSchema,
  updateGamertagRequestSchema,
  avatarCompositionRequestSchema,
  blockUserRequestSchema,
} from '@ingame/shared';
import { defineRoute, type RouteDef } from '../http/defineRoute';
import { validateBody } from '../http/validate';
import { asyncHandler } from '../http/asyncHandler';
import { resolvePrincipal } from '../auth/principal';
import {
  getMe,
  patchMe,
  getGamertags,
  createGamertag,
  patchGamertag,
  deleteGamertag,
  saveAvatarDraft,
  publishAvatar,
} from '../controllers/me-controller';
import {
  postBlock,
  deleteBlock,
  unfriend,
  getFriends,
  getFriendRequests,
  getBlocks,
  getCompare,
} from '../controllers/social-controller';

// The `/me` route inventory (DATA, not regex-scraped — F30). `mutates` is explicit; every mutating
// route declares its standing SYS-07 authz test id (paired by the rule-4 inventory-diff lint against a
// test that hits the route as actor-B asserting 4xx). All `/me*` routes resolve the actor from the
// verified principal ONLY.

export const meRoutes: RouteDef[] = [
  defineRoute({
    method: 'get',
    path: '/me',
    mutates: false,
    crossPrincipal: false, // self-view only — never returns another principal's data
    specIds: ['PROF-01', 'PROF-05', 'SYS-01'],
    handler: [resolvePrincipal, asyncHandler(getMe)],
  }),
  defineRoute({
    method: 'patch',
    path: '/me',
    mutates: true,
    authzTest: 'authz:patch_me',
    specIds: ['PROF-01', 'PROF-03', 'PROF-06', 'SYS-01', 'SYS-02', 'SYS-07', 'AUTH-09'],
    handler: [resolvePrincipal, validateBody(patchMeRequestSchema), asyncHandler(patchMe)],
  }),

  // PROF-02 gamertag CRUD
  defineRoute({
    method: 'get',
    path: '/me/gamertags',
    mutates: false,
    crossPrincipal: false,
    specIds: ['PROF-02', 'SYS-01'],
    handler: [resolvePrincipal, asyncHandler(getGamertags)],
  }),
  defineRoute({
    method: 'post',
    path: '/me/gamertags',
    mutates: true,
    authzTest: 'authz:create_gamertag',
    specIds: ['PROF-02', 'SYS-01', 'SYS-07', 'MOD-07'],
    handler: [resolvePrincipal, validateBody(createGamertagRequestSchema), asyncHandler(createGamertag)],
  }),
  defineRoute({
    method: 'patch',
    path: '/me/gamertags/:id',
    mutates: true,
    authzTest: 'authz:update_gamertag',
    specIds: ['PROF-02', 'SYS-01', 'SYS-07', 'MOD-07'],
    handler: [resolvePrincipal, validateBody(updateGamertagRequestSchema), asyncHandler(patchGamertag)],
  }),
  defineRoute({
    method: 'delete',
    path: '/me/gamertags/:id',
    mutates: true,
    authzTest: 'authz:delete_gamertag',
    specIds: ['PROF-02', 'SYS-01', 'SYS-07'],
    handler: [resolvePrincipal, asyncHandler(deleteGamertag)],
  }),

  // PROF-08 avatar draft/publish (shape-stubs)
  defineRoute({
    method: 'post',
    path: '/me/avatar/draft',
    mutates: true,
    authzTest: 'authz:avatar_draft',
    specIds: ['PROF-08', 'SYS-01', 'SYS-07'],
    handler: [resolvePrincipal, validateBody(avatarCompositionRequestSchema), asyncHandler(saveAvatarDraft)],
  }),
  defineRoute({
    method: 'post',
    path: '/me/avatar/publish',
    mutates: true,
    authzTest: 'authz:avatar_publish',
    specIds: ['PROF-08', 'SYS-01', 'SYS-07'],
    handler: [resolvePrincipal, validateBody(avatarCompositionRequestSchema), asyncHandler(publishAvatar)],
  }),

  // SOC-09 block/unblock (M5 F-2 — the endpoints the M2 substrate deferred). USER-OWNED writes on
  // `user_blocks`; each declares its standing SYS-07 actor-B 4xx test. The `userId` (POST body /
  // DELETE path) is the TARGET, never the actor (the actor is the verified principal).
  defineRoute({
    method: 'post',
    path: '/me/blocks',
    mutates: true,
    authzTest: 'authz:block_create',
    specIds: ['SOC-09', 'MOD-09', 'SYS-01', 'SYS-02', 'SYS-07'],
    handler: [resolvePrincipal, validateBody(blockUserRequestSchema), asyncHandler(postBlock)],
  }),
  defineRoute({
    method: 'delete',
    path: '/me/blocks/:userId',
    mutates: true,
    authzTest: 'authz:block_delete',
    specIds: ['SOC-09', 'SYS-01', 'SYS-07'],
    handler: [resolvePrincipal, asyncHandler(deleteBlock)],
  }),

  // SOC-01/08 the actor's OWN social-graph reads (self-scoped; not cross-principal — public summaries of
  // the actor's own friends/requests/blocks). GET /me/blocks is the Settings BLOCKED page (MOD-09
  // lone-exception affordance).
  defineRoute({
    method: 'get',
    path: '/me/friends',
    mutates: false,
    crossPrincipal: false,
    specIds: ['SOC-01', 'SYS-01'],
    handler: [resolvePrincipal, asyncHandler(getFriends)],
  }),
  defineRoute({
    method: 'get',
    path: '/me/friends/requests',
    mutates: false,
    crossPrincipal: false,
    specIds: ['SOC-08', 'SYS-01'],
    handler: [resolvePrincipal, asyncHandler(getFriendRequests)],
  }),
  defineRoute({
    method: 'get',
    path: '/me/blocks',
    mutates: false,
    crossPrincipal: false,
    specIds: ['SOC-09', 'MOD-09', 'SYS-01'],
    handler: [resolvePrincipal, asyncHandler(getBlocks)],
  }),
  // GET /me/compare/:friendId (SOC-03) — the collection face-off against a friend. Cross-principal:
  // returns the friend's hours/games/cards. A KNOWN non-friend → 409 NOT_FRIENDS; a blocked / suspended
  // / deleted / unknown target collapses to the generic 404 (MOD-09). Its authz test hits it as actor-B.
  defineRoute({
    method: 'get',
    path: '/me/compare/:friendId',
    mutates: false,
    crossPrincipal: true,
    authzTest: 'authz:get_compare',
    specIds: ['SOC-03', 'PROF-03', 'SOC-09', 'MOD-09', 'CARD-22', 'SYS-07'],
    handler: [resolvePrincipal, asyncHandler(getCompare)],
  }),
  // SOC-08 unfriend (decision 0010 — silent to the target). The `:userId` is the friend to drop.
  defineRoute({
    method: 'delete',
    path: '/me/friends/:userId',
    mutates: true,
    authzTest: 'authz:unfriend',
    specIds: ['SOC-08', 'SYS-01', 'SYS-07'],
    handler: [resolvePrincipal, asyncHandler(unfriend)],
  }),
];
