import { z } from 'zod';
import { cosmeticTierSchema, cosmeticTypeSchema } from '../common';
import { reportReasonSchema, reportTargetTypeSchema } from '../request/reports';

// RESPONSE/VIEW schemas for the ADMIN CONSOLE v1 surface (`/admin/*` — M6 P7, decision 0081). These
// are the F06 serializer's contract, not a mirror of any row.
//
// THE READ CLASS (worth saying out loud): every shape here deliberately carries data ACROSS users —
// aggregates over everyone, other people's reports. That is legitimate (MOD-12: admins see the true
// state) but it is a read class beyond SYS-01's four sanctioned doors, and `requireAdminTier(n)` at
// the route is the ONLY wall. The standing admin-class authz sweep (every route probed as a plain
// user AND unauthenticated) is what keeps it honest.

// ── GET /admin/spotlight (Admin IV) ───────────────────────────────────────────────────────────────────

/**
 * The Spotlight's current posture. `ids` = what is CURATED (the stored list, or the config seed when
 * nothing is stored). `resolvedIds` = what GET /store will ACTUALLY show right now — identical to
 * `ids` when every id resolves against the premium catalog, and the newest-N fallback set when the
 * curation resolves to nothing. `source` names which of the three layers won, so the console can say
 * "you are looking at the fallback" instead of implying an empty shelf.
 */
export const adminSpotlightResponseSchema = z
  .object({
    ids: z.array(z.string()),
    resolvedIds: z.array(z.string()),
    source: z.enum(['curated', 'seed', 'fallback']),
    fallbackCount: z.number().int().nonnegative(),
  })
  .strict();
export type AdminSpotlightResponse = z.infer<typeof adminSpotlightResponseSchema>;

// ── GET /admin/cosmetics/catalog (Admin IV) — the Spotlight picker's source ────────────────────────────

/** One pickable premium cosmetic. `spotlighted` marks the ids currently in the curated list. */
export const adminCosmeticCatalogItemSchema = z
  .object({
    id: z.string(),
    type: cosmeticTypeSchema,
    name: z.string(),
    tier: cosmeticTierSchema,
    price: z.number().int().nonnegative(),
    spotlighted: z.boolean(),
  })
  .strict();
export type AdminCosmeticCatalogItem = z.infer<typeof adminCosmeticCatalogItemSchema>;

export const adminCosmeticCatalogResponseSchema = z
  .object({ items: z.array(adminCosmeticCatalogItemSchema) })
  .strict();
export type AdminCosmeticCatalogResponse = z.infer<typeof adminCosmeticCatalogResponseSchema>;

// ── GET /admin/stats (Admin III) ──────────────────────────────────────────────────────────────────────

/**
 * The read-only ops dashboard (proposal §3). Everything here is a direct aggregate over tables that
 * already exist — no event capture, no analytics infra. `dau24h` is the ONE crude addition (the
 * `users.last_seen_at` stamp): an honest "accounts seen in the last 24h", NOT a funnel metric.
 * True DAU/MAU/retention stays routed to PostHog (road-to-market §7).
 */
export const adminStatsResponseSchema = z
  .object({
    users: z
      .object({
        total: z.number().int().nonnegative(),
        newLast24h: z.number().int().nonnegative(),
        dau24h: z.number().int().nonnegative(),
      })
      .strict(),
    cards: z
      .object({
        published: z.number().int().nonnegative(),
        moderationHidden: z.number().int().nonnegative(),
        adoptions: z.number().int().nonnegative(),
      })
      .strict(),
    catalog: z.object({ games: z.number().int().nonnegative() }).strict(),
    collection: z
      .object({
        entries: z.number().int().nonnegative(),
        totalHours: z.number().int().nonnegative(),
      })
      .strict(),
    economy: z
      .object({
        walletBalanceTotal: z.number().int(),
        ledgerRowsByReason: z.record(z.string(), z.number().int().nonnegative()),
      })
      .strict(),
    reports: z.object({ open: z.number().int().nonnegative(), total: z.number().int().nonnegative() }).strict(),
    generatedAt: z.string(), // ISO-8601 UTC
  })
  .strict();
export type AdminStatsResponse = z.infer<typeof adminStatsResponseSchema>;

// ── GET /admin/reports (Admin I) — READ-ONLY (no action verbs at v1; they are M7's console phase) ─────

/**
 * One queue row. The reporter is named (MOD-12 — an admin sees the true state; the console needs to
 * spot a serial reporter), and `details` is the moderator-facing free text MOD-01 already captures.
 */
export const adminReportItemSchema = z
  .object({
    id: z.string().uuid(),
    targetType: reportTargetTypeSchema,
    targetId: z.string().uuid(),
    reason: reportReasonSchema,
    details: z.string().nullable(),
    status: z.string(),
    createdAt: z.string(), // ISO-8601 UTC
    reporter: z
      .object({ userId: z.string().uuid(), username: z.string() })
      .strict(),
  })
  .strict();
export type AdminReportItem = z.infer<typeof adminReportItemSchema>;

export const adminReportsResponseSchema = z
  .object({
    items: z.array(adminReportItemSchema),
    nextCursor: z.string().nullable(),
    total: z.number().int().nonnegative(),
  })
  .strict();
export type AdminReportsResponse = z.infer<typeof adminReportsResponseSchema>;

// ── POST /admin/cards/:id/takedown · /restore (Admin II) ──────────────────────────────────────────────

/** The takedown/restore acknowledgement — the resulting moderation state, nothing more. */
export const adminCardModerationResponseSchema = z
  .object({
    cardId: z.string().uuid(),
    hidden: z.boolean(),
    hiddenAt: z.string().nullable(), // ISO-8601 UTC, or null once restored
  })
  .strict();
export type AdminCardModerationResponse = z.infer<typeof adminCardModerationResponseSchema>;
