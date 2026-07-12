import { createLookRequestSchema, patchDeviceRequestSchema } from '@ingame/shared';
import { defineRoute, type RouteDef } from '../http/defineRoute';
import { validateBody } from '../http/validate';
import { asyncHandler } from '../http/asyncHandler';
import { resolvePrincipal } from '../auth/principal';
import { rateLimit } from '../http/rateLimit';
import {
  getDevice,
  patchDevice,
  getLooks,
  createLook,
  deleteLook,
} from '../controllers/device-controller';

// The M4 §3.5 Device-editor route inventory (DEV-01..05 — decision 0030; F30 — DATA, not regex-scraped).
// device_configs + device_looks are USER-OWNED — every write declares its standing SYS-07 actor-B 4xx
// test. GET /me/device + GET /me/device/looks are own-only reads (never another principal's data), so
// they carry no authzTest. Applying a look = the client PATCHes /me/device (no dedicated apply route);
// the M5 premium KEEP rides POST /cosmetics/acquire-batch — NOT registered here (that's M5).

export const deviceRoutes: RouteDef[] = [
  defineRoute({
    method: 'get',
    path: '/me/device',
    mutates: false,
    crossPrincipal: false, // own device only
    specIds: ['DEV-01', 'DEV-03', 'SYS-01'],
    handler: [resolvePrincipal, asyncHandler(getDevice)],
  }),
  defineRoute({
    method: 'patch',
    path: '/me/device',
    mutates: true,
    authzTest: 'authz:device_update',
    specIds: ['DEV-01', 'DEV-02', 'DEV-03', 'DEV-04', 'SYS-01', 'SYS-02', 'SYS-07'],
    handler: [
      resolvePrincipal,
      rateLimit('device:write'),
      validateBody(patchDeviceRequestSchema),
      asyncHandler(patchDevice),
    ],
  }),
  defineRoute({
    method: 'get',
    path: '/me/device/looks',
    mutates: false,
    crossPrincipal: false, // own looks only
    specIds: ['DEV-05', 'SYS-01'],
    handler: [resolvePrincipal, asyncHandler(getLooks)],
  }),
  defineRoute({
    method: 'post',
    path: '/me/device/looks',
    mutates: true,
    authzTest: 'authz:device_look_create',
    specIds: ['DEV-05', 'SYS-01', 'SYS-02', 'SYS-04', 'SYS-07'],
    handler: [
      resolvePrincipal,
      rateLimit('device:write'),
      validateBody(createLookRequestSchema),
      asyncHandler(createLook),
    ],
  }),
  defineRoute({
    method: 'delete',
    path: '/me/device/looks/:lookId',
    mutates: true,
    authzTest: 'authz:device_look_delete',
    specIds: ['DEV-05', 'SYS-01', 'SYS-07'],
    handler: [resolvePrincipal, rateLimit('device:write'), asyncHandler(deleteLook)],
  }),
];
