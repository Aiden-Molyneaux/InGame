import type {
  AcquireBatchResponse,
  AcquireResponse,
  CosmeticsResponse,
  CosmeticType,
  Entitlement,
  EntitlementsResponse,
} from '@ingame/shared';
import { mutation } from '../../db/mutation';
import type { Executor } from '../../db/client';
import * as entitlementRepo from '../../repositories/entitlement-repo';
import * as economyRepo from '../../repositories/economy-repo';
import * as ledger from '../economy/ledger-service';
import { listCatalog, lookupCosmeticTier, priceForTier, type CosmeticTier } from '../../config/cosmetics';
import { SPEND_FLOOR, STARTING_GRANT } from '../../config/economy';
import { InsufficientBalanceError, NotFoundError } from '../../errors/AppError';
import type { UserEntitlementRow } from '../../db/schema';

// COSM-03/ECON-01 acquire + entitlements (M5 P4 — decision 0072/0073). `user_entitlements` is
// USER-OWNED — every path is actor-scoped (SYS-01). `acquireComponents` is the exec-based CORE: it
// runs INSIDE the caller's own transaction (the P3 `adopt` reuse point — decision 0072's "the whole
// point of building P4 first"), never opening its own — exactly how P1's ledger `credit`/`debit`
// primitives work. The two `@mutation`-wrapped endpoints below (`acquireCosmetic`/
// `acquireCosmeticBatch`) are thin: open ONE transaction, call the core, emit.
//
// SERIALIZATION (F36): when there is real work (a premium id not yet owned), `acquireComponents` locks
// the actor's WALLET (`economyRepo.ensureWalletForUpdate` — P1's single serialization point for this
// actor's economy) BEFORE re-reading ownership and computing the missing-set/total. Any other
// concurrent economy op for the SAME actor (another acquire, an adopt, a daily-bonus claim…) must take
// the SAME row lock, so: two parallel acquires of the same item → one charge (the loser's lock-wait
// resolves AFTER the winner commits, so it re-reads "already owned" and no-ops); two parallel batches
// sharing one item against a balance that covers only one → exactly one succeeds (the loser's
// total-vs-balance check, under its own fresh lock, sees the drained balance and refuses). A pure
// already-owned/free call never materializes or locks the wallet (mirrors GET /me/wallet's
// never-materialize posture) — see the unlocked pre-check below.
//
// FREE-ITEM SEMANTIC (flagged for the owner, P4 receipt): COSM-03 gates only PREMIUM items — a
// registered-FREE cosmetic (tier `null`) is always implicitly owned and acquiring it is a pure no-op
// (no entitlement row, no charge, no ledger row). If a future surface needs a tracked "my library" of
// free items too, that is a one-line change here (stop skipping `tier === null` ids) — not built now
// because nothing in the M5 scope reads free-item ownership.

export interface AcquireResult {
  granted: { cosmeticId: string; paid: number }[];
  totalPaid: number;
  balance: number;
}

/**
 * The exec-based acquire core (P3's adopt reuse point). Dedupes `cosmeticIds` (stable-sorted — avoids a
 * cross-transaction lock-ordering deadlock), 404s on any UNREGISTERED id (before any lock/write — a
 * cheap fail-fast, and the whole batch refuses together), skips registered-FREE ids entirely (see the
 * free-item note above), skips already-owned premium ids, then — for the remaining MISSING premium ids
 * — locks the wallet, checks the TOTAL against the current balance (so `INSUFFICIENT_BALANCE.shortBy`
 * is `total - balance`, never a partial-item figure), and on success debits ONE `acquire` ledger row
 * per item (via P1's `debit` primitive, `refType:'cosmetic'`/`refId:cosmeticId`) + inserts one
 * entitlement row per item, all inside `exec`'s transaction. Insufficient balance throws BEFORE any
 * write — the caller's transaction rolls back, so nothing lands (wallet, ledger, or entitlements).
 */
export async function acquireComponents(
  exec: Executor,
  actorId: string,
  cosmeticIds: string[],
): Promise<AcquireResult> {
  const uniqueIds = [...new Set(cosmeticIds)].sort();
  const tiers = new Map<string, CosmeticTier | null>();
  for (const id of uniqueIds) {
    const tier = lookupCosmeticTier(id);
    if (tier === undefined) {
      throw new NotFoundError(`Unknown cosmetic: ${id}`);
    }
    tiers.set(id, tier);
  }
  const premiumIds = uniqueIds.filter((id) => tiers.get(id) !== null);
  if (premiumIds.length === 0) {
    const wallet = await economyRepo.findWallet(actorId, exec);
    return { granted: [], totalPaid: 0, balance: wallet?.balance ?? STARTING_GRANT };
  }

  // Cheap unlocked pre-check: everything already owned → stay a pure read (no lock, no materialize).
  const ownedPre = await entitlementRepo.findOwnedCosmeticIds(actorId, premiumIds, exec);
  if (premiumIds.every((id) => ownedPre.has(id))) {
    const wallet = await economyRepo.findWallet(actorId, exec);
    return { granted: [], totalPaid: 0, balance: wallet?.balance ?? STARTING_GRANT };
  }

  // Real work (or real contention) ahead — lock the wallet FIRST, then RE-CHECK ownership under the
  // lock (closes the race window between the pre-check read above and the lock — the F36 guarantee).
  const wallet = await economyRepo.ensureWalletForUpdate(exec, actorId);
  const owned = await entitlementRepo.findOwnedCosmeticIds(actorId, premiumIds, exec);
  const missing = premiumIds.filter((id) => !owned.has(id));
  if (missing.length === 0) {
    return { granted: [], totalPaid: 0, balance: wallet.balance };
  }

  const priced = missing.map((id) => ({ id, price: priceForTier(tiers.get(id)) }));
  const total = priced.reduce((sum, p) => sum + p.price, 0);
  const projectedBalance = wallet.balance - total;
  if (projectedBalance < SPEND_FLOOR) {
    throw new InsufficientBalanceError(SPEND_FLOOR - projectedBalance); // == total - wallet.balance
  }

  const granted: { cosmeticId: string; paid: number }[] = [];
  let balance = wallet.balance;
  for (const { id, price } of priced) {
    const debited = await ledger.debit(exec, actorId, {
      amount: price,
      reason: 'acquire',
      refType: 'cosmetic',
      refId: id,
    });
    balance = debited.balance;
    await entitlementRepo.insertEntitlement(exec, actorId, { cosmeticId: id, source: 'purchase' });
    granted.push({ cosmeticId: id, paid: price });
  }
  return { granted, totalPaid: total, balance };
}

/** GET /me/entitlements — a pure read, own-only (COSM-03; no cross-principal path, no mutation). */
export async function listMyEntitlements(actorId: string): Promise<EntitlementsResponse> {
  const rows = await entitlementRepo.listMyEntitlements(actorId);
  return { items: rows.map(toEntitlementView) };
}

/**
 * GET /cosmetics — the COSM-01 library listing (decision 0075, P10): every catalog item, free +
 * premium, optionally filtered to one type. `owned` is caller-scoped (free items are always `true`;
 * premium items check the caller's own `user_entitlements` — one batched read, never per-item). A pure
 * read, own-only (the `owned` flags never expose another principal's ownership).
 */
export async function listCosmeticLibrary(actorId: string, type?: CosmeticType): Promise<CosmeticsResponse> {
  const catalog = listCatalog(type);
  const premiumIds = catalog.filter((e) => e.tier !== null).map((e) => e.id);
  const owned = await entitlementRepo.findOwnedCosmeticIds(actorId, premiumIds);
  return {
    items: catalog.map((e) => ({
      id: e.id,
      type: e.type,
      name: e.name,
      ...(e.tier ? { tier: e.tier } : {}),
      price: priceForTier(e.tier),
      owned: e.tier === null ? true : owned.has(e.id),
    })),
  };
}

function toEntitlementView(row: UserEntitlementRow): Entitlement {
  return {
    cosmeticId: row.cosmeticId,
    source: row.source as Entitlement['source'],
    createdAt: row.createdAt.toISOString(),
  };
}

/** @mutation — POST /cosmetics/:id/acquire (COSM-03/ECON-01): idempotent single-item acquire. */
export const acquireCosmetic = mutation(
  { name: 'cosmetic.acquire', specIds: ['COSM-03', 'ECON-01', 'ECON-07', 'SYS-01'] },
  async (ctx, actorId, cosmeticId: string): Promise<AcquireResponse> => {
    const result = await acquireComponents(ctx.tx, actorId, [cosmeticId]);
    const grant = result.granted.find((g) => g.cosmeticId === cosmeticId);
    await ctx.emit({
      // entityRef.id is a uuid column (domain_events) — cosmeticId is an opaque roster string (not a
      // uuid), so the event keys off the ACTOR (matches acquireCosmeticBatch); cosmeticId rides payload.
      eventType: 'cosmetic.acquired',
      entityRef: { type: 'user', id: actorId },
      payload: { cosmeticId, charged: Boolean(grant) },
    });
    return { cosmeticId, paid: grant?.paid ?? 0, balance: result.balance };
  },
);

/** @mutation — POST /cosmetics/acquire-batch (CARD-13 ACQUIRE ALL): atomic all-or-nothing. */
export const acquireCosmeticBatch = mutation(
  { name: 'cosmetic.acquireBatch', specIds: ['CARD-13', 'COSM-03', 'ECON-01', 'ECON-07', 'SYS-01'] },
  async (ctx, actorId, cosmeticIds: string[]): Promise<AcquireBatchResponse> => {
    const result = await acquireComponents(ctx.tx, actorId, cosmeticIds);
    await ctx.emit({
      eventType: 'cosmetic.batch_acquired',
      entityRef: { type: 'user', id: actorId },
      payload: { grantedIds: result.granted.map((g) => g.cosmeticId), totalPaid: result.totalPaid },
    });
    return result;
  },
);

// ── ECON-11 operator entitlement ops (service-layer ONLY — NO route; decision 0035/0072, OQ-080) ──────
// Mirrors `ledger-service.adjustPixels` exactly: one privileged mutation, one MOD-10 audit row, both
// atomic. `targetUserId` is the ENTITLEMENT OWNER (not the calling operator) — the same "actorId param
// is really the row owner" shape `adjustPixels` already uses for wallet writes.

/** @mutation — ECON-11 operator grant: `source:'operator_grant'`, idempotent (already-owned → no-op). */
export const grantEntitlement = mutation(
  { name: 'cosmetic.grantEntitlement', specIds: ['ECON-11', 'COSM-03', 'COSM-04', 'MOD-10', 'SYS-01'] },
  async (
    ctx,
    operatorId,
    targetUserId: string,
    cosmeticId: string,
    reason: string,
  ): Promise<{ granted: boolean }> => {
    void operatorId; // the mutation actor; recorded on the audit row by ctx.audit
    const row = await entitlementRepo.insertEntitlement(ctx.tx, targetUserId, {
      cosmeticId,
      source: 'operator_grant',
    });
    await ctx.audit({
      action: 'cosmetic.grant_entitlement',
      target: { type: 'user', id: targetUserId },
      reason,
    });
    await ctx.emit({
      eventType: 'cosmetic.entitlement_granted',
      entityRef: { type: 'user', id: targetUserId },
      payload: { cosmeticId },
    });
    return { granted: row !== null };
  },
);

/** @mutation — ECON-11 operator clawback: DELETEs the entitlement row (the ECON-09 exception). */
export const clawbackEntitlement = mutation(
  { name: 'cosmetic.clawbackEntitlement', specIds: ['ECON-11', 'COSM-03', 'MOD-10', 'SYS-01'] },
  async (
    ctx,
    operatorId,
    targetUserId: string,
    cosmeticId: string,
    reason: string,
  ): Promise<{ removed: boolean }> => {
    void operatorId;
    const removed = await entitlementRepo.deleteEntitlement(ctx.tx, targetUserId, cosmeticId);
    await ctx.audit({
      action: 'cosmetic.clawback_entitlement',
      target: { type: 'user', id: targetUserId },
      reason,
    });
    await ctx.emit({
      eventType: 'cosmetic.entitlement_clawed_back',
      entityRef: { type: 'user', id: targetUserId },
      payload: { cosmeticId },
    });
    return { removed };
  },
);
