import { and, count, desc, eq, gte, isNotNull, isNull, lt, or, sum, type SQL } from 'drizzle-orm';
import { getDb, type Executor } from '../db/client';
import { asActor, ownedBy } from '../db/scoped';
import {
  cardAdoptions,
  cardDesigns,
  collectionEntries,
  currencyLedger,
  games,
  reports,
  users,
  wallets,
  type ReportRow,
  type UserRow,
} from '../db/schema';

// ── The ADMIN CONSOLE's data access (M6 P7 v1 — decision 0081) ────────────────────────────────────────
//
// THIS FILE IS THE FIFTH SYS-01 DOOR, and the only one that admits a cross-user WRITE. Everything here
// reads (or, once, writes) data belonging to OTHER principals, gated NOT by a row predicate but by
// `requireAdminTier(n)` at the route + the standing admin-class authz sweep + a MOD-10 audit row on
// every write. The rule-2 lint recognizes the `// SYS-01-ADMIN-OP` marker ONLY inside this file
// (tools/lint/rules/rule-02-scoping.mjs), so the widening cannot leak into an ordinary repository.
//
// KEEP THIS FILE SMALL. Its whole safety argument is "one short file a reviewer can read in a sitting."
// If a query here starts needing options/branches, that is a signal the console is outgrowing v1 — go
// back to the proposal, not to this file.
//
// The two OWN-ROW helpers at the top (`findActorRoleRow`, `stampLastSeen`) are ordinary SYS-01-scoped
// access — the caller reads/writes their OWN row — and carry no marker.

/** The role/tier fields `requireAdminTier` gates on (SYS-08). The actor reads their OWN row. */
export interface ActorRoleRow {
  role: string;
  adminTier: number | null;
  lastSeenAt: Date | null;
  deletedAt: Date | null;
}

/** The caller's own role/tier — an OWN-row read (SYS-01-scoped; no admin marker needed). */
export async function findActorRoleRow(
  actorId: string,
  exec: Executor = getDb(),
): Promise<ActorRoleRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .select({
      role: users.role,
      adminTier: users.adminTier,
      lastSeenAt: users.lastSeenAt,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(ownedBy(actor, users.id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Stamp the caller's OWN `last_seen_at` (the crude-DAU substrate). Guarded IN SQL by the staleness
 * predicate as well as by the in-process throttle (auth/last-seen.ts): even if two requests race past
 * the throttle, the `WHERE last_seen_at IS NULL OR last_seen_at < cutoff` clause makes the second a
 * no-op write rather than a lock convoy. OWN-row write — SYS-01-scoped, no admin marker.
 */
export async function stampLastSeen(
  actorId: string,
  staleBefore: Date,
  exec: Executor = getDb(),
): Promise<void> {
  const actor = asActor(actorId);
  await exec
    .update(users)
    .set({ lastSeenAt: new Date() })
    .where(
      ownedBy(
        actor,
        users.id,
        or(isNull(users.lastSeenAt), lt(users.lastSeenAt, staleBefore)) as SQL,
      ),
    );
}

// ── GET /admin/stats (Admin III) — aggregates only, never row-level cross-user reads ──────────────────

export interface AdminStatsRow {
  usersTotal: number;
  usersNewLast24h: number;
  dau24h: number;
  cardsPublished: number;
  cardsModerationHidden: number;
  adoptions: number;
  games: number;
  collectionEntries: number;
  collectionHours: number;
  walletBalanceTotal: number;
  ledgerRowsByReason: Record<string, number>;
  reportsOpen: number;
  reportsTotal: number;
}

const n = (v: unknown): number => Number(v ?? 0);

/**
 * The whole dashboard in one call. Every figure is a COUNT/SUM — no row of any user's data leaves this
 * function, which is what keeps the stats endpoint a genuinely low-blast-radius read even though it
 * spans every table. Sequential on purpose: `exec` may be one pg client.
 *
 * Written as many small counting queries rather than a few CASE-WHEN aggregates because the rule-2
 * lint (rightly) refuses raw `sql` templates anywhere in a repository — and on a dashboard read for a
 * handful of admins, a few extra indexed COUNTs cost nothing next to that guarantee.
 */
export async function readStats(exec: Executor = getDb()): Promise<AdminStatsRow> {
  const since24h = new Date(Date.now() - 24 * 60 * 60_000);

  // SYS-01-ADMIN-OP: cross-user AGGREGATE — live accounts (Admin III; decision 0081).
  const [usersAgg] = await exec.select({ total: count() }).from(users).where(isNull(users.deletedAt));
  // SYS-01-ADMIN-OP: cross-user aggregate — signups in the last 24h (decision 0081).
  const [usersNewAgg] = await exec
    .select({ total: count() })
    .from(users)
    .where(and(isNull(users.deletedAt), gte(users.createdAt, since24h)));
  // SYS-01-ADMIN-OP: cross-user aggregate — the CRUDE 24h-active count (decision 0081).
  const [dauAgg] = await exec
    .select({ total: count() })
    .from(users)
    .where(and(isNull(users.deletedAt), gte(users.lastSeenAt, since24h)));

  // SYS-01-ADMIN-OP: cross-user aggregate — published cards (decision 0081).
  const [publishedAgg] = await exec
    .select({ total: count() })
    .from(cardDesigns)
    .where(eq(cardDesigns.status, 'published'));
  // SYS-01-ADMIN-OP: cross-user aggregate — cards currently under a MOD-08 takedown (decision 0081).
  const [hiddenAgg] = await exec
    .select({ total: count() })
    .from(cardDesigns)
    .where(isNotNull(cardDesigns.moderationHiddenAt));

  // SYS-01-ADMIN-OP: cross-user aggregate — ACTIVE adoption grants (decision 0081).
  const [adoptionsAgg] = await exec
    .select({ total: count() })
    .from(cardAdoptions)
    .where(isNull(cardAdoptions.revokedAt));

  // `games` is GLOBAL (F32 manifest) — no marker needed; the soft-deleted rows are excluded.
  const [gamesAgg] = await exec
    .select({ total: count() })
    .from(games)
    .where(isNull(games.deletedAt));

  // SYS-01-ADMIN-OP: cross-user aggregate — shelf volume + logged hours (decision 0081).
  const [collectionAgg] = await exec
    .select({ entries: count(), hours: sum(collectionEntries.hours) })
    .from(collectionEntries);

  // SYS-01-ADMIN-OP: cross-user aggregate — the total Pixels in circulation (decision 0081).
  const [walletAgg] = await exec.select({ total: sum(wallets.balance) }).from(wallets);

  // SYS-01-ADMIN-OP: cross-user aggregate — ledger row counts BY REASON (decision 0081).
  const ledgerAgg = await exec
    .select({ reason: currencyLedger.reason, rows: count() })
    .from(currencyLedger)
    .groupBy(currencyLedger.reason);

  // SYS-01-ADMIN-OP: cross-user aggregate — the report queue depth (decision 0081).
  const [reportsAgg] = await exec.select({ total: count() }).from(reports);
  // SYS-01-ADMIN-OP: cross-user aggregate — still-open reports (decision 0081).
  const [reportsOpenAgg] = await exec
    .select({ total: count() })
    .from(reports)
    .where(eq(reports.status, 'open'));

  return {
    usersTotal: n(usersAgg?.total),
    usersNewLast24h: n(usersNewAgg?.total),
    dau24h: n(dauAgg?.total),
    cardsPublished: n(publishedAgg?.total),
    cardsModerationHidden: n(hiddenAgg?.total),
    adoptions: n(adoptionsAgg?.total),
    games: n(gamesAgg?.total),
    collectionEntries: n(collectionAgg?.entries),
    collectionHours: n(collectionAgg?.hours),
    walletBalanceTotal: n(walletAgg?.total),
    ledgerRowsByReason: Object.fromEntries(ledgerAgg.map((r) => [r.reason, n(r.rows)])),
    reportsOpen: n(reportsOpenAgg?.total),
    reportsTotal: n(reportsAgg?.total),
  };
}

// ── GET /admin/reports (Admin I) — the READ-ONLY queue ────────────────────────────────────────────────

export interface AdminReportRow {
  report: ReportRow;
  reporter: Pick<UserRow, 'id' | 'username'>;
}

/** One page of reports, newest first, optionally narrowed to a target type (MOD-03/04). */
export async function listReports(
  opts: { targetType?: string; limit: number; offset: number },
  exec: Executor = getDb(),
): Promise<AdminReportRow[]> {
  const where = opts.targetType ? eq(reports.targetType, opts.targetType) : undefined;
  // SYS-01-ADMIN-OP: the cross-user moderation queue read (Admin I; MOD-03/04, decision 0081).
  const rows = await exec
    .select({ report: reports, reporterId: users.id, reporterUsername: users.username })
    .from(reports)
    .innerJoin(users, eq(users.id, reports.reporterId))
    .where(where)
    .orderBy(desc(reports.createdAt))
    .limit(opts.limit)
    .offset(opts.offset);
  return rows.map((r) => ({
    report: r.report,
    reporter: { id: r.reporterId, username: r.reporterUsername },
  }));
}

/** The unpaginated total behind the current filter (the console shows queue depth). */
export async function countReports(
  opts: { targetType?: string },
  exec: Executor = getDb(),
): Promise<number> {
  const where = opts.targetType ? eq(reports.targetType, opts.targetType) : undefined;
  // SYS-01-ADMIN-OP: cross-user aggregate — the filtered queue depth (decision 0081).
  const rows = await exec.select({ total: count() }).from(reports).where(where);
  return n(rows[0]?.total);
}

// ── POST /admin/cards/:id/takedown · /restore (Admin II) — the ONE privileged cross-user WRITE ────────

export interface ModeratedCardRow {
  id: string;
  ownerId: string;
  status: string;
  moderationHiddenAt: Date | null;
}

/** The moderation-relevant fields of ANY card, by id (never the private `composition`). */
export async function findCardForModeration(
  cardId: string,
  exec: Executor = getDb(),
): Promise<ModeratedCardRow | null> {
  // SYS-01-ADMIN-OP: a cross-user card read for the MOD-08 takedown path (Admin II, decision 0081).
  // Explicit column allowlist — the private `composition` never leaves the owner shape (OQ-122).
  const rows = await exec
    .select({
      id: cardDesigns.id,
      ownerId: cardDesigns.ownerId,
      status: cardDesigns.status,
      moderationHiddenAt: cardDesigns.moderationHiddenAt,
    })
    .from(cardDesigns)
    .where(eq(cardDesigns.id, cardId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Set/clear a card's MOD-08 moderation-hidden state. Guarded by the CURRENT state (`hide` only acts on
 * a visible card, `restore` only on a hidden one) so a double-submit is a no-op returning `null`
 * rather than a second audit row for a state that did not change. NEVER touches `status` — a restore
 * must return the card to exactly the lifecycle state its designer left it in.
 */
export async function setCardModerationHidden(
  cardId: string,
  hidden: boolean,
  exec: Executor = getDb(),
): Promise<ModeratedCardRow | null> {
  // SYS-01-ADMIN-OP: THE privileged cross-user WRITE (MOD-08 takedown/restore, Admin II; decision
  // 0081). Audited by the caller through ctx.audit inside the same transaction.
  const rows = await exec
    .update(cardDesigns)
    .set({ moderationHiddenAt: hidden ? new Date() : null })
    .where(
      and(
        eq(cardDesigns.id, cardId),
        hidden
          ? isNull(cardDesigns.moderationHiddenAt)
          : isNotNull(cardDesigns.moderationHiddenAt),
      ),
    )
    .returning({
      id: cardDesigns.id,
      ownerId: cardDesigns.ownerId,
      status: cardDesigns.status,
      moderationHiddenAt: cardDesigns.moderationHiddenAt,
    });
  return rows[0] ?? null;
}
