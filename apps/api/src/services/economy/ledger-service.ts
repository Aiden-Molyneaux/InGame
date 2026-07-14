import type {
  DailyBonusResponse,
  LedgerEntry,
  LedgerReason,
  LedgerResponse,
  WalletLedgerQuery,
  WalletResponse,
} from '@ingame/shared';
import { WALLET_LEDGER_PAGE_DEFAULT } from '@ingame/shared';
import { mutation } from '../../db/mutation';
import type { Executor } from '../../db/client';
import * as economyRepo from '../../repositories/economy-repo';
import * as entitlementRepo from '../../repositories/entitlement-repo';
import { InsufficientBalanceError } from '../../errors/AppError';
import {
  DAILY_BONUS,
  SPEND_FLOOR,
  STARTING_GRANT,
  ladderRewardForCount,
} from '../../config/economy';
import type { CurrencyLedgerRow } from '../../db/schema';

// The ECON-07 ledger service — the ONE seam through which the currency balance ever changes (decision
// 0072/0073). Every effect is a transaction of { SELECT wallet FOR UPDATE (lazy-materialize the 10-PX
// starting grant on first touch — decision 0074) → floor-check spends → UPDATE balance + INSERT one ledger row }, so
// `sum(ledger.delta) == wallet.balance` is a standing invariant (ECON-07). The `credit`/`debit`
// primitives are exec-based so P2 (IAP) / P3 (adopt) / P4 (acquire) call them INSIDE their own
// mutation's transaction (passing `ctx.tx`); this file owns the wallet-only endpoints + the ECON-11
// service op. wallets + currency_ledger are USER-OWNED — every path is actor-scoped (SYS-01).

// ── UTC-day helpers (ECON-02, decision 0051/F44 — no per-user-tz state in v2) ────────────────────────
/** The UTC-day idempotency key for a claim, `YYYY-MM-DD`. */
function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
/** The next UTC-midnight after `d` — when the next daily bonus becomes available. */
function nextUtcResetAt(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0),
  );
}

// ── The balance-change primitives (exec-based — P2/P3/P4 reuse these inside their own mutations) ─────
export interface CreditArgs {
  amount: number; // > 0
  reason: LedgerReason;
  refType?: string | null;
  refId?: string | null;
  periodKey?: string | null;
}
export interface DebitArgs {
  amount: number; // > 0
  reason: LedgerReason;
  refType?: string | null;
  refId?: string | null;
  /** The minimum balance this debit may leave. Default: the spend floor (0 — no spending into debt).
   *  P2's refund reversal passes REFUND_FLOOR; operator adjustments pass undefined (unfloored). */
  floor?: number;
}

/**
 * Apply one signed delta to the caller's wallet inside `exec`'s transaction: materialize+lock the
 * wallet, floor-check debits, write the new balance + one ledger row. Returns the post-change balance.
 * Debits below `floor` raise INSUFFICIENT_BALANCE {shortBy}; credits are never floored.
 */
async function applyDelta(
  exec: Executor,
  actorId: string,
  args: {
    delta: number;
    reason: LedgerReason;
    refType?: string | null;
    refId?: string | null;
    periodKey?: string | null;
    floor?: number;
  },
): Promise<{ balance: number; ledgerRow: CurrencyLedgerRow }> {
  const wallet = await economyRepo.ensureWalletForUpdate(exec, actorId);
  const newBalance = wallet.balance + args.delta;
  if (args.delta < 0 && args.floor !== undefined && newBalance < args.floor) {
    throw new InsufficientBalanceError(args.floor - newBalance); // shortBy = the PX still needed
  }
  await economyRepo.updateBalance(exec, actorId, newBalance);
  const ledgerRow = await economyRepo.insertLedgerRow(exec, actorId, {
    delta: args.delta,
    reason: args.reason,
    refType: args.refType ?? null,
    refId: args.refId ?? null,
    periodKey: args.periodKey ?? null,
  });
  return { balance: newBalance, ledgerRow };
}

/**
 * M5 F-3 (§4 audit LOW) — `credit`/`debit` take a POSITIVE integer amount by contract; a 0/negative/
 * fractional amount is corrupted upstream content (e.g. a bad `store_products.pixels`), and with no DB
 * CHECK constraints it would silently drain or fabricate balance. Throws a plain Error BEFORE any DB
 * touch (nothing locked, nothing written). The signed-delta path (`adjustPixels`, ECON-11) is the one
 * deliberate exception and calls `applyDelta` directly.
 */
function assertPositiveAmount(amount: number, op: 'credit' | 'debit'): void {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(
      `ledger.${op}: amount must be a positive integer (got ${amount}) — refusing a corrupted delta (ECON-07).`,
    );
  }
}

/** Credit the caller's wallet (an earn — never refused). P2/P3/P4 call this inside their mutation tx. */
export function credit(
  exec: Executor,
  actorId: string,
  args: CreditArgs,
): Promise<{ balance: number; ledgerRow: CurrencyLedgerRow }> {
  assertPositiveAmount(args.amount, 'credit');
  return applyDelta(exec, actorId, {
    delta: args.amount,
    reason: args.reason,
    refType: args.refType,
    refId: args.refId,
    periodKey: args.periodKey,
  });
}

/** Debit the caller's wallet (a spend). Refuses below `floor` (default 0) with INSUFFICIENT_BALANCE. */
export function debit(
  exec: Executor,
  actorId: string,
  args: DebitArgs,
): Promise<{ balance: number; ledgerRow: CurrencyLedgerRow }> {
  assertPositiveAmount(args.amount, 'debit');
  return applyDelta(exec, actorId, {
    delta: -args.amount,
    reason: args.reason,
    refType: args.refType,
    refId: args.refId,
    floor: args.floor ?? SPEND_FLOOR,
  });
}

// ── Wallet-only endpoints (GET /me/wallet · GET /me/wallet/ledger · POST /me/daily-bonus) ────────────

/**
 * GET /me/wallet (ECON-02/07) — a PURE READ (never materializes; the wallet + starting grant land on
 * the first economic MUTATION). An un-touched wallet reports the STARTING_GRANT effective balance and
 * an available bonus; a touched wallet reports its real row. `dailyBonus.available` = no CLAIM (standing
 * `daily_claim` OR a ladder `milestone` step) for today's UTC-day — the one-claim-a-day ceiling spans
 * both phases. While the Newcomer Ladder is in progress (decision 0074), `ladderStep` (the NEXT step,
 * 1..7) and `ladderReward` (its PX + any filled cosmetic slot) are present so the client renders the
 * escalation; both are ABSENT once the ladder is complete (the veteran +1/day view is unchanged).
 */
export async function getWallet(actorId: string): Promise<WalletResponse> {
  const wallet = await economyRepo.findWallet(actorId);
  const now = new Date();
  const claimed = await economyRepo.findClaimForDay(actorId, utcDayKey(now));
  const ladder = ladderRewardForCount(await economyRepo.countLadderClaims(actorId));
  return {
    balance: wallet?.balance ?? STARTING_GRANT,
    dailyBonus: {
      available: claimed === null,
      amount: DAILY_BONUS,
      nextResetAt: nextUtcResetAt(now).toISOString(),
      ...(ladder && {
        ladderStep: ladder.step,
        ladderReward: {
          pixels: ladder.pixels,
          ...(ladder.cosmeticId ? { cosmeticId: ladder.cosmeticId } : {}),
        },
      }),
    },
  };
}

function toLedgerEntry(row: CurrencyLedgerRow): LedgerEntry {
  return {
    id: row.id,
    type: row.reason as LedgerReason,
    delta: row.delta,
    refType: row.refType,
    refId: row.refId,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Decode the opaque next-page cursor (an offset token) — defensively floored at 0. */
function decodeCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  const n = Number.parseInt(cursor, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** GET /me/wallet/ledger (ECON-07) — a page of transactions, newest-first, offset-cursor-paginated. */
export async function listLedger(
  actorId: string,
  query: WalletLedgerQuery,
): Promise<LedgerResponse> {
  const limit = query.limit ?? WALLET_LEDGER_PAGE_DEFAULT;
  const offset = decodeCursor(query.cursor);
  const rows = await economyRepo.listLedger(actorId, limit + 1, offset); // +1 probes for a next page
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    items: page.map(toLedgerEntry),
    nextCursor: hasMore ? String(offset + limit) : null,
  };
}

/**
 * @mutation — POST /me/daily-bonus (ECON-02, decision 0074): claim the Store daily bonus, idempotent
 * per UTC-day. ONE claim button throughout, but the reward escalates:
 *   • claims 1–7 = the Newcomer Ladder — grant `NEWCOMER_LADDER_STEPS[n]` PX as ONE `milestone` ledger
 *     row (`refType='newcomer_ladder'`, `refId=String(step)`, `periodKey=UTC-day`) + the earned-only
 *     cosmetic entitlement when the step's slot is filled (empty slot → PX only). The ladder NEVER
 *     lapses — a missed day just delays the next step (progress = the lifetime `countLadderClaims`).
 *   • claim 8+ = the standing +1-PX `daily_claim` (unclaimed days LAPSE — no banking, no streaks, v2).
 * The wallet-row FOR UPDATE lock serializes concurrent claims; the same-day pre-check (`findClaimForDay`
 * spans BOTH reasons) + the `(user, reason, period)` partial-unique index make a second same-day grant
 * impossible under either phase (F36). The ladder count is probed UNDER the lock so two parallel ladder
 * claims can't each advance a step — the loser re-reads the just-written row and no-ops.
 */
export const claimDailyBonus = mutation(
  { name: 'wallet.claimDailyBonus', specIds: ['ECON-02', 'ECON-07', 'COSM-03', 'SYS-01'] },
  async (ctx, actorId): Promise<DailyBonusResponse> => {
    const now = new Date();
    const periodKey = utcDayKey(now);
    const nextResetAt = nextUtcResetAt(now).toISOString();
    const wallet = await economyRepo.ensureWalletForUpdate(ctx.tx, actorId); // lock + first-touch grant
    const already = await economyRepo.findClaimForDay(actorId, periodKey, ctx.tx);
    if (already) {
      // Already claimed today (either phase) — idempotent no-op (still emit so the seam stays honest).
      await ctx.emit({
        eventType: 'wallet.daily_claimed',
        entityRef: { type: 'wallet', id: wallet.id },
        payload: { granted: false },
      });
      return { granted: false, pixels: 0, balance: wallet.balance, nextResetAt };
    }

    // Which phase? The lifetime ladder count (probed under the lock) picks the next step, or null once
    // the ladder is complete — then the standing +1/day takes over.
    const ladder = ladderRewardForCount(await economyRepo.countLadderClaims(actorId, ctx.tx));

    if (ladder) {
      const newBalance = wallet.balance + ladder.pixels;
      await economyRepo.updateBalance(ctx.tx, actorId, newBalance);
      await economyRepo.insertLedgerRow(ctx.tx, actorId, {
        delta: ladder.pixels,
        reason: 'milestone',
        refType: 'newcomer_ladder',
        refId: String(ladder.step),
        periodKey, // the same-UTC-day idempotency key covers ladder claims too (period-unique index)
      });
      // The free earned-only cosmetic — only when the roster pass has filled this step's slot. An empty
      // slot no-ops gracefully (the grant is PX-only). Idempotent insert (defence-in-depth under lock).
      if (ladder.cosmeticId) {
        await entitlementRepo.insertEntitlement(ctx.tx, actorId, {
          cosmeticId: ladder.cosmeticId,
          source: 'earned',
        });
      }
      await ctx.emit({
        eventType: 'wallet.daily_claimed',
        entityRef: { type: 'wallet', id: wallet.id },
        payload: {
          granted: true,
          amount: ladder.pixels,
          ladderStep: ladder.step,
          ...(ladder.cosmeticId ? { cosmeticId: ladder.cosmeticId } : {}),
        },
      });
      return {
        granted: true,
        pixels: ladder.pixels,
        ...(ladder.cosmeticId ? { cosmeticId: ladder.cosmeticId } : {}),
        balance: newBalance,
        nextResetAt,
      };
    }

    // The standing daily (claim 8+) — exactly the pre-0074 behaviour.
    const newBalance = wallet.balance + DAILY_BONUS;
    await economyRepo.updateBalance(ctx.tx, actorId, newBalance);
    await economyRepo.insertLedgerRow(ctx.tx, actorId, {
      delta: DAILY_BONUS,
      reason: 'daily_claim',
      periodKey,
    });
    await ctx.emit({
      eventType: 'wallet.daily_claimed',
      entityRef: { type: 'wallet', id: wallet.id },
      payload: { granted: true, amount: DAILY_BONUS },
    });
    return { granted: true, pixels: DAILY_BONUS, balance: newBalance, nextResetAt };
  },
);

// ── ECON-11 operator adjustment (service-layer op — NO route; decision 0035, OQ-080) ─────────────────
/**
 * @mutation — ECON-11 operator economy adjustment. Applies a signed delta to the TARGET user's wallet
 * (goodwill credit / bug-correction debit) as one `admin_adjustment` ledger row + one MOD-10 audit row
 * (operator + reason), atomically. UNFLOORED — the audited out-of-band correction is the ECON-09
 * clawback exception. Service-layer ONLY (no consumer endpoint; the operator tool is §10/OQ-080).
 */
export const adjustPixels = mutation(
  { name: 'economy.adjustPixels', specIds: ['ECON-11', 'ECON-07', 'MOD-10', 'SYS-01'] },
  async (
    ctx,
    operatorId,
    targetUserId: string,
    delta: number,
    reason: string,
  ): Promise<{ balance: number }> => {
    void operatorId; // the mutation actor; recorded on the audit row by ctx.audit
    const { balance } = await applyDelta(ctx.tx, targetUserId, {
      delta,
      reason: 'admin_adjustment',
    });
    await ctx.audit({
      action: 'economy.adjust_pixels',
      target: { type: 'user', id: targetUserId },
      reason,
    });
    await ctx.emit({
      eventType: 'wallet.adjusted',
      entityRef: { type: 'user', id: targetUserId },
      payload: { delta },
    });
    return { balance };
  },
);

// ── Reconcile (ECON-07 invariant helper — used by tests + a dev-only integrity check) ────────────────
/** `sum(ledger.delta) == wallet.balance`. `ok` is the ECON-07 invariant; both zero for an untouched wallet. */
export async function reconcile(
  actorId: string,
): Promise<{ balance: number; ledgerSum: number; ok: boolean }> {
  const wallet = await economyRepo.findWallet(actorId);
  const balance = wallet?.balance ?? 0;
  const ledgerSum = await economyRepo.sumLedgerDelta(actorId);
  return { balance, ledgerSum, ok: balance === ledgerSum };
}
