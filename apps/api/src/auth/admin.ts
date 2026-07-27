import type { RequestHandler } from 'express';
import { AuthFailedError, ForbiddenError } from '../errors/AppError';
import * as adminRepo from '../repositories/admin-repo';

// SYS-08 — the admin-tier gate (M6 P7 admin console v1, decision 0081). The ONE new piece of auth the
// console needs: `role ∈ user|admin` + `adminTier ∈ 1..4` have existed since M2 (schema + /me), but
// until now NOTHING read them for authorization.
//
// WHY THE TIER IS READ FROM THE DB, NOT THE JWT: the access token carries only `sub` (auth/tokens.ts),
// and that is the right call to keep — a role baked into a stateless token stays valid until the token
// expires, so a revoked admin would keep their powers for the rest of the access-token TTL. One
// indexed primary-key read per admin request is a price worth paying on a surface with a handful of
// callers, and it means a tier revoked out-of-band (decision 0033 — assignment is SQL/runbook) takes
// effect on the NEXT request.
//
// The tiers are NESTED (SYS-08): Admin I Content ⊂ II Catalog ⊂ III Support ⊂ IV Platform. So a route
// declaring `requireAdminTier(2)` admits tiers 2, 3 and 4.

export type AdminTier = 1 | 2 | 3 | 4;

/**
 * The pure tier predicate (unit-tested directly — the gate's logic must be provable without Express
 * or a database). `role` must be exactly `'admin'` and `adminTier` must meet the requirement; a
 * `user` with a stray tier, an `admin` with no tier, and an out-of-range tier all FAIL CLOSED.
 */
export function meetsAdminTier(
  role: string | null | undefined,
  adminTier: number | null | undefined,
  required: AdminTier,
): boolean {
  if (role !== 'admin') return false;
  if (typeof adminTier !== 'number' || !Number.isInteger(adminTier)) return false;
  if (adminTier < 1 || adminTier > 4) return false;
  return adminTier >= required;
}

/**
 * The middleware. MUST be mounted AFTER `resolvePrincipal` (which owns the 401 for a missing/invalid
 * bearer) — this handler owns only the 403. A soft-deleted account (AUTH-07) is refused even if its
 * row still says admin.
 *
 * The refusal is a plain FORBIDDEN with no detail: an admin surface must not tell a prober whether
 * they were "close" (wrong tier) or not staff at all.
 */
export function requireAdminTier(required: AdminTier): RequestHandler {
  return (req, _res, next) => {
    const principal = req.principal;
    if (!principal) {
      // Defensive: a route that forgot resolvePrincipal must fail closed, not throw a 500 later.
      next(new AuthFailedError());
      return;
    }
    adminRepo
      .findActorRoleRow(principal.userId)
      .then((row) => {
        if (!row || row.deletedAt || !meetsAdminTier(row.role, row.adminTier, required)) {
          next(new ForbiddenError());
          return;
        }
        next();
      })
      .catch(next);
  };
}
