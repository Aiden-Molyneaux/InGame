import type {
  AdminCardModerationResponse,
  AdminCosmeticCatalogResponse,
  AdminReportItem,
  AdminReportsQuery,
  AdminReportsResponse,
  AdminSpotlightResponse,
  AdminStatsResponse,
  ReportReason,
  ReportTargetType,
  UpdateSpotlightRequest,
} from '@ingame/shared';
import { ADMIN_REPORTS_PAGE_DEFAULT } from '@ingame/shared';
import { mutation } from '../../db/mutation';
import * as adminRepo from '../../repositories/admin-repo';
import * as settingsRepo from '../../repositories/settings-repo';
import { COSMETIC_CATALOG, lookupCosmeticEntry, priceForTier } from '../../config/cosmetics';
import { NotFoundError, ValidationError } from '../../errors/AppError';
import { decodeOffsetCursor } from '../pagination';
import { describeSpotlight, readSpotlightPosture } from './spotlight-service';

// ── The ADMIN CONSOLE v1 service (M6 P7 — decision 0081) ──────────────────────────────────────────────
//
// SCOPE, deliberately: read-only ops (stats · reports) + exactly TWO privileged writes (Spotlight
// curation and the MOD-08 card takedown/restore pair). Every M7 moderation verb — resolve, suspend,
// merge, remediate, dossier, notice — is OUT, by the ruling. Resist adding one here; the console's
// value at a 12-tester beta is that it is small enough to trust.
//
// AUTHORIZATION IS NOT HERE. It is the route's `requireAdminTier(n)` (auth/admin.ts) — a single,
// greppable wall, covered by the standing admin-class authz sweep. This service assumes the caller is
// already a sufficiently-tiered admin and never re-derives that, exactly as the rest of the codebase
// assumes `resolvePrincipal` ran.

// ── Spotlight (Admin IV = P4 Config) ──────────────────────────────────────────────────────────────────

/**
 * `admin_audit_log.target_id` is a uuid column (MOD-10's shape is built for user/card/game targets),
 * but a settings KEY is not a uuid. Rather than widen the audit schema for one v1 lever, the Spotlight
 * setting gets a STABLE, hard-coded target uuid — a namespace id, greppable and stable across writes,
 * so `SELECT … WHERE target_id = …` returns the Spotlight's whole edit history. If a second setting
 * ever needs auditing, that is the moment to widen `target_id` to text, not before.
 */
export const SPOTLIGHT_AUDIT_TARGET_ID = '00000000-0000-4000-8000-00005907117d';

export async function getSpotlight(): Promise<AdminSpotlightResponse> {
  return describeSpotlight();
}

/** The picker's source: the PREMIUM catalog, flagged with what is currently curated. */
export async function listCosmeticCatalog(): Promise<AdminCosmeticCatalogResponse> {
  const posture = await readSpotlightPosture();
  const curated = new Set(posture.ids);
  return {
    items: COSMETIC_CATALOG.filter((e) => e.tier !== null).map((e) => ({
      id: e.id,
      type: e.type,
      name: e.name,
      tier: e.tier!,
      price: priceForTier(e.tier),
      spotlighted: curated.has(e.id),
    })),
  };
}

/**
 * PUT /admin/spotlight — replace the curated list (MOD-10 audited as `spotlight.update`).
 *
 * Validation the schema cannot express: every id must resolve to a PREMIUM catalog entry (a free or
 * unknown id is refused, 422 — the store's Spotlight grid is a premium shelf), and the list must not
 * repeat an id. An EMPTY list is accepted on purpose (the newest-N fallback keeps the shelf full; the
 * console warns, the server permits — the ruled posture).
 */
export const updateSpotlight = mutation(
  { name: 'admin.spotlight.update', specIds: ['SYS-04', 'SYS-08', 'MOD-10', 'ECON-01'] },
  async (ctx, actorId, input: UpdateSpotlightRequest): Promise<AdminSpotlightResponse> => {
    const seen = new Set<string>();
    for (const id of input.ids) {
      if (seen.has(id)) {
        throw new ValidationError(`Duplicate Spotlight id "${id}".`, 'duplicate_cosmetic_id');
      }
      seen.add(id);
      const entry = lookupCosmeticEntry(id);
      if (!entry) {
        throw new ValidationError(
          `"${id}" is not a premium cosmetic id.`,
          'unknown_cosmetic_id',
        );
      }
    }

    await settingsRepo.putSetting(settingsRepo.SETTING_KEYS.spotlightIds, input.ids, ctx.tx);
    // MOD-10 — the audit row commits with the write (F16). The target is the setting itself; the
    // curated ids live on the settings row, so the audit reason carries only the SIZE of the change.
    await ctx.audit({
      action: 'spotlight.update',
      target: { type: 'server_setting', id: SPOTLIGHT_AUDIT_TARGET_ID },
      reason: `spotlight_ids set to ${input.ids.length} id(s)`,
    });
    await ctx.emit({
      eventType: 'admin.spotlight_updated',
      entityRef: { type: 'server_setting', id: SPOTLIGHT_AUDIT_TARGET_ID },
      payload: { count: input.ids.length },
    });
    void actorId; // the actor rides the audit + event rows (stamped by the mutation seam)
    return describeSpotlight(ctx.tx);
  },
);

// ── Stats (Admin III = P3 Support) ────────────────────────────────────────────────────────────────────

export async function getStats(): Promise<AdminStatsResponse> {
  const row = await adminRepo.readStats();
  return {
    users: { total: row.usersTotal, newLast24h: row.usersNewLast24h, dau24h: row.dau24h },
    cards: {
      published: row.cardsPublished,
      moderationHidden: row.cardsModerationHidden,
      adoptions: row.adoptions,
    },
    catalog: { games: row.games },
    collection: { entries: row.collectionEntries, totalHours: row.collectionHours },
    economy: {
      walletBalanceTotal: row.walletBalanceTotal,
      ledgerRowsByReason: row.ledgerRowsByReason,
    },
    reports: { open: row.reportsOpen, total: row.reportsTotal },
    generatedAt: new Date().toISOString(),
  };
}

// ── Reports viewer (Admin I = P1 Content) — READ-ONLY ─────────────────────────────────────────────────

export async function listReports(query: AdminReportsQuery): Promise<AdminReportsResponse> {
  const limit = query.limit ?? ADMIN_REPORTS_PAGE_DEFAULT;
  const offset = decodeOffsetCursor(query.cursor);
  const rows = await adminRepo.listReports({ targetType: query.targetType, limit, offset });
  const total = await adminRepo.countReports({ targetType: query.targetType });
  const items: AdminReportItem[] = rows.map(({ report, reporter }) => ({
    id: report.id,
    targetType: report.targetType as ReportTargetType,
    targetId: report.targetId,
    reason: report.reason as ReportReason,
    details: report.details,
    status: report.status,
    createdAt: report.createdAt.toISOString(),
    reporter: { userId: reporter.id, username: reporter.username },
  }));
  const nextOffset = offset + items.length;
  // nextCursor derives from the PAGE (rows < limit ⇒ done), never from `total` (P7 Murr debt): the
  // items ride an innerJoin(users) while total counts unjoined — if a join-dropping case ever appears,
  // a total-based cursor would re-issue the same offset forever and the console's Load-more would loop.
  return { items, nextCursor: items.length < limit ? null : String(nextOffset), total };
}

// ── MOD-08 takedown / restore (Admin II = P2 Catalog) ─────────────────────────────────────────────────
//
// WHAT A TAKEDOWN DOES (product-spec MOD-08, the exception clause): it HIDES the card. Concretely,
// `card_designs.moderation_hidden_at` is stamped, and two read seams honour it —
//   • `publishedOnly()` (card-repo) — so the card leaves the gallery, trending, adopt and the public
//     share path at once; and
//   • the adopted-design reads (adoption-repo) — so every ADOPTER's equipped card falls back per the
//     CARD-18 default-card guarantee. This is the one place MOD-08 deliberately breaks its own
//     "adopters keep their card" rule: the takedown exception says the pulled card falls back.
// What it does NOT do: touch `status` (a restore must return the designer's own lifecycle state
// untouched), delete anything, or revoke grants/entitlements.

async function setModeration(
  cardId: string,
  hidden: boolean,
  exec: Parameters<typeof adminRepo.setCardModerationHidden>[2],
): Promise<{ result: AdminCardModerationResponse; transitioned: boolean }> {
  const updated = await adminRepo.setCardModerationHidden(cardId, hidden, exec);
  if (updated) {
    return {
      result: {
        cardId: updated.id,
        hidden: updated.moderationHiddenAt !== null,
        hiddenAt: updated.moderationHiddenAt?.toISOString() ?? null,
      },
      transitioned: true,
    };
  }
  // The guarded UPDATE matched nothing: either the card does not exist, or it is ALREADY in the
  // requested state. Distinguish, so a double-submit is an idempotent success rather than a 404.
  const current = await adminRepo.findCardForModeration(cardId, exec);
  if (!current) throw new NotFoundError('No such card.');
  return {
    result: {
      cardId: current.id,
      hidden: current.moderationHiddenAt !== null,
      hiddenAt: current.moderationHiddenAt?.toISOString() ?? null,
    },
    transitioned: false,
  };
}

export const takedownCard = mutation(
  { name: 'admin.card.takedown', specIds: ['MOD-08', 'MOD-10', 'SYS-08', 'CARD-18'] },
  async (ctx, actorId, cardId: string, reason: string): Promise<AdminCardModerationResponse> => {
    const { result, transitioned } = await setModeration(cardId, true, ctx.tx);
    // Audit + event fire ONLY on a real transition (P7 Murr minor): a double-submit is an idempotent
    // success and must not mint a second `card.takedown` row — the guarded UPDATE is the decider.
    if (transitioned) {
      await ctx.audit({
        action: 'card.takedown',
        target: { type: 'card_design', id: cardId },
        reason,
      });
      await ctx.emit({
        eventType: 'admin.card_taken_down',
        entityRef: { type: 'card_design', id: cardId },
        payload: { cardId },
      });
    }
    void actorId;
    return result;
  },
);

export const restoreCard = mutation(
  { name: 'admin.card.restore', specIds: ['MOD-08', 'MOD-02', 'MOD-10', 'SYS-08'] },
  async (ctx, actorId, cardId: string, reason: string): Promise<AdminCardModerationResponse> => {
    const { result, transitioned } = await setModeration(cardId, false, ctx.tx);
    if (transitioned) {
      await ctx.audit({
        action: 'card.restore',
        target: { type: 'card_design', id: cardId },
        reason,
      });
      await ctx.emit({
        eventType: 'admin.card_restored',
        entityRef: { type: 'card_design', id: cardId },
        payload: { cardId },
      });
    }
    void actorId;
    return result;
  },
);
