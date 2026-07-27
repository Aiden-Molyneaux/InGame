import { z } from 'zod';
import { boundedText } from '../sanitize';

// REQUEST/INPUT schemas for the ADMIN CONSOLE v1 surface (`/admin/*` — M6 P7, decision 0081; the
// walk-4 settlement ruling). Every route behind these schemas is additionally gated by
// `requireAdminTier(n)` (SYS-08 permission groups); the schemas own SHAPE only, never authorization.
//
// The actor is ALWAYS the authenticated admin principal (SYS-01) — no body ever carries an actor id.

// ── Spotlight curation (SYS-04 / ECON-01 / COSM-01 · Admin IV = P4 Config) ────────────────────────────

/** The Spotlight grid the store leads with is small by design; the cap is a sanity bound, not a rule. */
export const SPOTLIGHT_IDS_MAX = 24;
/** A cosmetic roster id (COSM-01) is a short slug (`marquee`, `holographic`) — never free-form text. */
export const COSMETIC_ID_MAX_LEN = 64;

/**
 * PUT /admin/spotlight — replace the curated Spotlight list, in display order (MOD-10 audited as
 * `spotlight.update`).
 *
 * `ids` is the WHOLE list (a replace, not a patch) and an EMPTY array is deliberately ACCEPTED: the
 * server's newest-N fallback guarantees a non-blank shelf, so emptying the curation is a legitimate
 * "let it auto-fill" choice. The console WARNS before saving empty; the server permits it (the
 * proposal §2 posture, ruled). Ids are validated against the premium catalog in the service (an
 * unknown id → 422), which is behaviour the schema cannot express.
 */
export const updateSpotlightRequestSchema = z
  .object({
    ids: z
      .array(z.string().trim().min(1).max(COSMETIC_ID_MAX_LEN))
      .max(SPOTLIGHT_IDS_MAX),
  })
  .strict();
export type UpdateSpotlightRequest = z.infer<typeof updateSpotlightRequestSchema>;

// ── Card takedown (MOD-08 · Admin II = P2 Catalog) ────────────────────────────────────────────────────

export const TAKEDOWN_REASON_MAX_LEN = 500;

/**
 * POST /admin/cards/:id/takedown — `{ reason }`, the api-contract §MOD row. The reason is REQUIRED
 * (an unexplained takedown is exactly what the MOD-10 audit trail exists to prevent) and is
 * moderator-facing only — it never reaches the designer's surfaces at v1 (the MOD-13 notice is M7).
 */
export const takedownCardRequestSchema = z
  .object({
    // Sanitized + bounded, then REQUIRED non-empty (a blank/whitespace reason is refused, 422).
    reason: boundedText(TAKEDOWN_REASON_MAX_LEN).pipe(z.string().min(1)),
  })
  .strict();
export type TakedownCardRequest = z.infer<typeof takedownCardRequestSchema>;

/** POST /admin/cards/:id/restore — the takedown's undo (MOD-02 hide/restore grammar). Same shape. */
export const restoreCardRequestSchema = takedownCardRequestSchema;
export type RestoreCardRequest = z.infer<typeof restoreCardRequestSchema>;

// ── Reports viewer (MOD-03/04 · Admin I = P1 Content) ─────────────────────────────────────────────────

export const ADMIN_REPORTS_PAGE_DEFAULT = 25;
export const ADMIN_REPORTS_PAGE_MAX = 100;

/**
 * GET /admin/reports?targetType=&cursor=&limit= — the READ-ONLY queue (v1 has no action verbs; those
 * are M7's console phase). Non-strict (stray params are stripped), mirroring the ledger query.
 */
export const adminReportsQuerySchema = z.object({
  targetType: z.enum(['card', 'game', 'user']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(ADMIN_REPORTS_PAGE_MAX).optional(),
});
export type AdminReportsQuery = z.infer<typeof adminReportsQuerySchema>;
