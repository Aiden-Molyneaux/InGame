import { eq } from 'drizzle-orm';
import { getDb, type Executor } from '../db/client';
import { asActor, ownedBy } from '../db/scoped';
import { iapReceipts, type IapReceiptRow } from '../db/schema';

// IAP-receipt repository (M5 P2 · ECON-06). `iap_receipts` is USER-OWNED (owner key = user_id; NOT on
// the F32 manifest — rule-2 fails closed). Every read/write is actor-scoped (SYS-01): even the webhook
// path scopes to the receipt's owner (the RC event carries `app_user_id` = our user id). The
// `receiptId` UNIQUE constraint is the authoritative cross-user + concurrency backstop — a replayed or
// hijacked receipt id can never double-grant (the ECON-06 invariant), so the insert onConflictDoNothing
// is the race arbiter and the scoped reads are the fast idempotency path.

export interface ReceiptInsert {
  platform: string;
  receiptId: string;
  productId: string;
  pixelsGranted: number;
  raw: Record<string, unknown>;
}

/** The caller's own receipt for a given `receiptId`, or null. The ECON-06 idempotency fast-path. */
export async function findOwnReceipt(
  exec: Executor,
  actorId: string,
  receiptId: string,
): Promise<IapReceiptRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .select()
    .from(iapReceipts)
    .where(ownedBy(actor, iapReceipts.userId, eq(iapReceipts.receiptId, receiptId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Whether the caller already owns ANY receipt for `productId` — the ECON-10 once-per-account check. */
export async function hasOwnReceiptForProduct(
  exec: Executor,
  actorId: string,
  productId: string,
): Promise<boolean> {
  const actor = asActor(actorId);
  const rows = await exec
    .select({ id: iapReceipts.id })
    .from(iapReceipts)
    .where(ownedBy(actor, iapReceipts.userId, eq(iapReceipts.productId, productId)))
    .limit(1);
  return rows.length > 0;
}

/** The set of productIds the caller owns a receipt for — the GET /store `purchased` flags. */
export async function listOwnPurchasedProductIds(
  actorId: string,
  exec: Executor = getDb(),
): Promise<Set<string>> {
  const actor = asActor(actorId);
  const rows = await exec
    .select({ productId: iapReceipts.productId })
    .from(iapReceipts)
    .where(ownedBy(actor, iapReceipts.userId));
  return new Set(rows.map((r) => r.productId));
}

/**
 * Record a validated receipt IF NEW (a bare, actor-stamped insert — onConflictDoNothing on the UNIQUE
 * `receiptId`). Returns the inserted row, or null when the receiptId already exists (a replay / a
 * concurrent winner / a cross-user hijack attempt) — the caller then grants NOTHING (ECON-06).
 */
export async function insertReceiptIfNew(
  exec: Executor,
  actorId: string,
  r: ReceiptInsert,
): Promise<IapReceiptRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .insert(iapReceipts)
    .values({
      userId: actor.actorId,
      platform: r.platform,
      receiptId: r.receiptId,
      productId: r.productId,
      pixelsGranted: r.pixelsGranted,
      raw: r.raw,
    })
    .onConflictDoNothing({ target: iapReceipts.receiptId })
    .returning();
  return rows[0] ?? null;
}
