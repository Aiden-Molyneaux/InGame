import { restoreCardRequestSchema, takedownCardRequestSchema, updateSpotlightRequestSchema } from '@ingame/shared';
import { defineRoute, type RouteDef } from '../http/defineRoute';
import { validateBody } from '../http/validate';
import { asyncHandler } from '../http/asyncHandler';
import { resolvePrincipal } from '../auth/principal';
import { requireAdminTier } from '../auth/admin';
import {
  getCosmeticCatalog,
  getReports,
  getSpotlight,
  getStats,
  postCardRestore,
  postCardTakedown,
  putSpotlight,
} from '../controllers/admin-controller';

// ── The `/admin/*` router (M6 P7 admin console v1 — decision 0081) ────────────────────────────────────
//
// The console is an EXTERNAL SPA (the owner's walk-4 ruling: one console, three tier-gated sections —
// Ops now · Moderation at M7 · Operator behind a sudo re-auth gate later). These are the Ops section's
// endpoints; M7 hangs the moderation verbs off this same router.
//
// EVERY route is `resolvePrincipal` → `requireAdminTier(n)` → handler. The tier per route follows the
// SYS-08 permission groups verbatim:
//   • Admin I  (P1 Content)  — the reports queue read.
//   • Admin II (P2 Catalog)  — the MOD-08 card takedown/restore pair.
//   • Admin III(P3 Support)  — the ops stats dashboard.
//   • Admin IV (P4 Config)   — Spotlight curation + its picker.
// Tiers are NESTED, so a tier-IV admin reaches all of it and a tier-I admin reaches only the queue.
//
// THE AUTHZ POSTURE, stated once: these reads return data belonging to OTHER principals (aggregates
// over everyone; other people's reports). That is a read class beyond SYS-01's four sanctioned doors,
// and `requireAdminTier` is the ONLY wall standing between a bug here and a cross-user leak. So EVERY
// route below — reads included — declares an authzTest and is covered by the standing admin-class
// sweep in test/integration/admin-console-slice.test.ts (each probed as a plain user → 403 and
// unauthenticated → 401). Adding a route here without adding it to that sweep is the mistake this
// comment exists to prevent.
//
// No rate-limit buckets: the surface is admin-gated (a handful of principals) and the limiter is
// IP-keyed, so a bucket here would throttle the console's own dashboard refreshes without adding
// meaningful protection. Revisit if the console ever grows a public-adjacent path.

export const adminRoutes: RouteDef[] = [
  // ── Spotlight curation (Admin IV — P4 Config) ───────────────────────────────────────────────────
  defineRoute({
    method: 'get',
    path: '/admin/spotlight',
    mutates: false,
    crossPrincipal: true, // server-wide config, not the caller's own data — sweep-covered
    authzTest: 'authz:admin_spotlight_read',
    specIds: ['SYS-04', 'SYS-08', 'ECON-01'],
    handler: [resolvePrincipal, requireAdminTier(4), asyncHandler(getSpotlight)],
  }),
  defineRoute({
    method: 'put',
    path: '/admin/spotlight',
    mutates: true,
    authzTest: 'authz:admin_spotlight_update',
    specIds: ['SYS-04', 'SYS-08', 'MOD-10', 'ECON-01'],
    handler: [
      resolvePrincipal,
      requireAdminTier(4),
      validateBody(updateSpotlightRequestSchema),
      asyncHandler(putSpotlight),
    ],
  }),
  defineRoute({
    method: 'get',
    path: '/admin/cosmetics/catalog',
    mutates: false,
    crossPrincipal: true, // the picker's source — admin-only by tier, sweep-covered
    authzTest: 'authz:admin_cosmetic_catalog',
    specIds: ['SYS-08', 'COSM-01'],
    handler: [resolvePrincipal, requireAdminTier(4), asyncHandler(getCosmeticCatalog)],
  }),

  // ── Ops stats (Admin III — P3 Support) ──────────────────────────────────────────────────────────
  defineRoute({
    method: 'get',
    path: '/admin/stats',
    mutates: false,
    crossPrincipal: true, // aggregates over every user
    authzTest: 'authz:admin_stats',
    specIds: ['SYS-08', 'MOD-04'],
    handler: [resolvePrincipal, requireAdminTier(3), asyncHandler(getStats)],
  }),

  // ── Reports queue, READ-ONLY (Admin I — P1 Content) ─────────────────────────────────────────────
  defineRoute({
    method: 'get',
    path: '/admin/reports',
    mutates: false,
    crossPrincipal: true, // other principals' reports (MOD-12 — admins see the true state)
    authzTest: 'authz:admin_reports',
    specIds: ['MOD-01', 'MOD-03', 'MOD-04', 'SYS-08'],
    handler: [resolvePrincipal, requireAdminTier(1), asyncHandler(getReports)],
  }),

  // ── MOD-08 takedown / restore (Admin II — P2 Catalog) ───────────────────────────────────────────
  defineRoute({
    method: 'post',
    path: '/admin/cards/:id/takedown',
    mutates: true,
    authzTest: 'authz:admin_card_takedown',
    specIds: ['MOD-08', 'MOD-10', 'SYS-08', 'CARD-18'],
    handler: [
      resolvePrincipal,
      requireAdminTier(2),
      validateBody(takedownCardRequestSchema),
      asyncHandler(postCardTakedown),
    ],
  }),
  defineRoute({
    method: 'post',
    path: '/admin/cards/:id/restore',
    mutates: true,
    authzTest: 'authz:admin_card_restore',
    specIds: ['MOD-02', 'MOD-08', 'MOD-10', 'SYS-08'],
    handler: [
      resolvePrincipal,
      requireAdminTier(2),
      validateBody(restoreCardRequestSchema),
      asyncHandler(postCardRestore),
    ],
  }),
];
