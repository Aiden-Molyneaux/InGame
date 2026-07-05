import {
  registerRequestSchema,
  loginRequestSchema,
  appleRequestSchema,
  refreshRequestSchema,
  logoutRequestSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  verifyEmailConfirmSchema,
} from '@ingame/shared';
import { defineRoute, type RouteDef } from '../http/defineRoute';
import { validateBody } from '../http/validate';
import { asyncHandler } from '../http/asyncHandler';
import { rateLimit } from '../http/rateLimit';
import { resolvePrincipal } from '../auth/principal';
import * as auth from '../controllers/auth-controller';

// AUTH-* route inventory (F30 — data, not regex-scraped). Every state-changing auth route is
// `mutates:true` (honest inventory) and declares a standing authzTest that hits the route as ACTOR-B
// asserting 4xx — either a bad-credential 4xx (register dup / login / refresh-reuse / *-confirm) or a
// SYS-05 429-under-burst (the deliberately-NEUTRAL request endpoints, whose real guard is the limiter,
// AUTH-11). Every route is rate-limited (SYS-05 / F17). The actor is NEVER trusted from the body.

export const authRoutes: RouteDef[] = [
  defineRoute({
    method: 'post',
    path: '/auth/register',
    mutates: true,
    authzTest: 'authz:register',
    specIds: ['AUTH-01', 'AUTH-08', 'AUTH-10', 'SYS-05'],
    handler: [rateLimit('auth:register'), validateBody(registerRequestSchema), asyncHandler(auth.register)],
  }),
  defineRoute({
    method: 'post',
    path: '/auth/login',
    mutates: true,
    authzTest: 'authz:login',
    specIds: ['AUTH-02', 'AUTH-11', 'MOD-09', 'SYS-05'],
    handler: [rateLimit('auth:login'), validateBody(loginRequestSchema), asyncHandler(auth.login)],
  }),
  defineRoute({
    method: 'post',
    path: '/auth/apple',
    mutates: true,
    authzTest: 'authz:apple',
    specIds: ['AUTH-03', 'AUTH-09', 'SYS-05'],
    handler: [rateLimit('auth:apple'), validateBody(appleRequestSchema), asyncHandler(auth.apple)],
  }),
  defineRoute({
    method: 'post',
    path: '/auth/refresh',
    mutates: true,
    authzTest: 'authz:refresh',
    specIds: ['AUTH-02', 'SYS-05'],
    handler: [rateLimit('auth:refresh'), validateBody(refreshRequestSchema), asyncHandler(auth.refresh)],
  }),
  defineRoute({
    method: 'post',
    path: '/auth/logout',
    mutates: true,
    authzTest: 'authz:logout',
    specIds: ['AUTH-05', 'SYS-05'],
    handler: [rateLimit('auth:logout'), validateBody(logoutRequestSchema), asyncHandler(auth.logout)],
  }),
  defineRoute({
    method: 'post',
    path: '/auth/password-reset/request',
    mutates: true,
    authzTest: 'authz:reset_request',
    specIds: ['AUTH-04', 'AUTH-11', 'SYS-05'],
    handler: [
      rateLimit('auth:reset-request'),
      validateBody(passwordResetRequestSchema),
      asyncHandler(auth.requestPasswordReset),
    ],
  }),
  defineRoute({
    method: 'post',
    path: '/auth/password-reset/confirm',
    mutates: true,
    authzTest: 'authz:reset_confirm',
    specIds: ['AUTH-04', 'SYS-05'],
    handler: [
      rateLimit('auth:reset-confirm'),
      validateBody(passwordResetConfirmSchema),
      asyncHandler(auth.confirmPasswordReset),
    ],
  }),
  defineRoute({
    method: 'post',
    path: '/auth/verify-email/request',
    mutates: true,
    authzTest: 'authz:verify_request',
    specIds: ['AUTH-08', 'SYS-05'],
    handler: [
      rateLimit('auth:verify-request'),
      resolvePrincipal,
      asyncHandler(auth.requestEmailVerification),
    ],
  }),
  defineRoute({
    method: 'post',
    path: '/auth/verify-email/confirm',
    mutates: true,
    authzTest: 'authz:verify_confirm',
    specIds: ['AUTH-08', 'SYS-05'],
    handler: [
      rateLimit('auth:verify-confirm'),
      validateBody(verifyEmailConfirmSchema),
      asyncHandler(auth.confirmEmailVerification),
    ],
  }),
  defineRoute({
    method: 'get',
    path: '/auth/username-available',
    mutates: false,
    // A public advisory READ (no body, returns no other principal's private data) — rate-limited (AUTH-11).
    crossPrincipal: false,
    specIds: ['AUTH-11', 'MOD-07', 'SYS-05'],
    handler: [rateLimit('auth:username-available'), asyncHandler(auth.usernameAvailable)],
  }),
];
