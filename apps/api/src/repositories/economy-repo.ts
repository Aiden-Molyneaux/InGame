import { and, desc, eq, sum } from 'drizzle-orm';
import type { LedgerReason } from '@ingame/shared';
import { getDb, type Executor } from '../db/client';
import { asActor, ownedBy } from '../db/scoped';
import { STARTING_GRANT } from '../config/economy';
import {
  currencyLedger,
  wallets,
  type CurrencyLedgerRow,
  type WalletRow,
} from '../db/schema';

// Economy repository — `wallets` + `currency_ledger` are USER-OWNED (owner key = user_id; NOT on the
// F32 manifest — rule-2 fails closed). Every read/write here is actor-scoped (SYS-01): actor B
// reaching for actor A's wallet/ledger gets the same nothing an unknown id gets (no existence oracle).
// M5 P1 substrate (decision 0072/0073). The wallet is the single serialization point — a debit locks
// the row with SELECT … FOR UPDATE so N parallel spends against a one-spend balance can't all pass.

export interface LedgerInsert {
  delta: number;
  reason: LedgerReason;
  refType?: string | null;
  refId?: string | null;
  periodKey?: string | null;
}

/**
 * Materialize-and-lock the caller's wallet, returning the row locked FOR UPDATE (ECON-02/07). On the
 * FIRST touch the row is created with the 5-PX starting balance AND its `starting_grant` ledger row —
 * both in the caller's transaction, so the grant lands exactly once even under the F36 concurrent
 * first-touch race (INSERT … ON CONFLICT DO NOTHING; the loser sees no inserted row and re-selects).
 * The subsequent SELECT … FOR UPDATE serializes concurrent balance changes on the row.
 */
export async function ensureWalletForUpdate(
  exec: Executor,
  actorId: string,
): Promise<WalletRow> {
  const actor = asActor(actorId);
  // Actor-stamped bare insert (rule-2: a brand-new actor-owned row is not an IDOR vector). ON CONFLICT
  // DO NOTHING returns the row ONLY when THIS call created it — the winner writes the starting grant.
  const created = await exec
    .insert(wallets)
    .values({ userId: actor.actorId, balance: STARTING_GRANT })
    .onConflictDoNothing({ target: wallets.userId })
    .returning();
  if (created.length > 0) {
    await exec.insert(currencyLedger).values({
      userId: actor.actorId,
      delta: STARTING_GRANT,
      reason: 'starting_grant',
    });
  }
  // Lock the row (existing or just-created) for the balance update. Scoped to the actor (SYS-01).
  const rows = await exec
    .select()
    .from(wallets)
    .where(ownedBy(actor, wallets.userId))
    .for('update');
  return rows[0]!;
}

/** Read the caller's wallet row WITHOUT materializing it (the pure GET path). Null when never touched. */
export async function findWallet(
  actorId: string,
  exec: Executor = getDb(),
): Promise<WalletRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .select()
    .from(wallets)
    .where(ownedBy(actor, wallets.userId))
    .limit(1);
  return rows[0] ?? null;
}

/** Set the caller's wallet balance (only ever called inside the FOR-UPDATE critical section). */
export async function updateBalance(
  exec: Executor,
  actorId: string,
  balance: number,
): Promise<void> {
  const actor = asActor(actorId);
  await exec
    .update(wallets)
    .set({ balance, updatedAt: new Date() })
    .where(ownedBy(actor, wallets.userId));
}

/** Append one ledger row (actor-stamped bare insert — the append-only ECON-07 history). */
export async function insertLedgerRow(
  exec: Executor,
  actorId: string,
  entry: LedgerInsert,
): Promise<CurrencyLedgerRow> {
  const actor = asActor(actorId);
  const rows = await exec
    .insert(currencyLedger)
    .values({
      userId: actor.actorId,
      delta: entry.delta,
      reason: entry.reason,
      refType: entry.refType ?? null,
      refId: entry.refId ?? null,
      periodKey: entry.periodKey ?? null,
    })
    .returning();
  return rows[0]!;
}

/** Whether a period-stamped ledger row already exists for (actor, reason, period) — the ECON-02 pre-check. */
export async function findLedgerByPeriod(
  actorId: string,
  reason: LedgerReason,
  periodKey: string,
  exec: Executor = getDb(),
): Promise<CurrencyLedgerRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .select()
    .from(currencyLedger)
    .where(
      ownedBy(
        actor,
        currencyLedger.userId,
        and(eq(currencyLedger.reason, reason), eq(currencyLedger.periodKey, periodKey)),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** A page of ledger rows, newest-first (ECON-07). Offset-based (`limit`+`offset`); +1 probes for more. */
export async function listLedger(
  actorId: string,
  limit: number,
  offset: number,
  exec: Executor = getDb(),
): Promise<CurrencyLedgerRow[]> {
  const actor = asActor(actorId);
  return exec
    .select()
    .from(currencyLedger)
    .where(ownedBy(actor, currencyLedger.userId))
    .orderBy(desc(currencyLedger.seq)) // monotonic insertion order — stable even for same-tx rows
    .limit(limit)
    .offset(offset);
}

/**
 * The caller's ledger row matching (reason, refType, refId), or null — the ECON-09 refund-reversal
 * idempotency probe (has this receipt already been reversed?). Read under the wallet FOR UPDATE lock so
 * the check + the reversal are serialized (a replayed refund reverses exactly once, F36).
 */
export async function findLedgerByRef(
  actorId: string,
  reason: LedgerReason,
  refType: string,
  refId: string,
  exec: Executor = getDb(),
): Promise<CurrencyLedgerRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .select()
    .from(currencyLedger)
    .where(
      ownedBy(
        actor,
        currencyLedger.userId,
        and(
          eq(currencyLedger.reason, reason),
          eq(currencyLedger.refType, refType),
          eq(currencyLedger.refId, refId),
        ),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** ECON-07 reconcile substrate — the summed ledger delta for the actor (== the wallet balance). */
export async function sumLedgerDelta(
  actorId: string,
  exec: Executor = getDb(),
): Promise<number> {
  const actor = asActor(actorId);
  const rows = await exec
    .select({ total: sum(currencyLedger.delta) })
    .from(currencyLedger)
    .where(ownedBy(actor, currencyLedger.userId));
  return Number(rows[0]?.total ?? 0);
}
