import { and, asc, eq } from 'drizzle-orm';
import { getDb, type Executor } from '../db/client';
import { storeProducts, type StoreProductRow } from '../db/schema';

// Store-catalog repository (M5 P2 · ECON-10). `store_products` is GLOBAL (on the F32 manifest — product
// definitions, not per-user state), so these reads are intentionally NOT actor-scoped (the SYS-01
// scope-lint skips global tables). The per-user `purchased` flag is derived by joining the caller's
// own receipts (iap-repo, actor-scoped) at the service layer — never here.

/** One active product by its store SKU (`productId`), or null (unknown / inactive). */
export async function findActiveProduct(
  productId: string,
  exec: Executor = getDb(),
): Promise<StoreProductRow | null> {
  const rows = await exec
    .select()
    .from(storeProducts)
    .where(and(eq(storeProducts.productId, productId), eq(storeProducts.active, true)))
    .limit(1);
  return rows[0] ?? null;
}

/** All active products, cheapest-first (the Store pack ladder — decision 0072). */
export async function listActiveProducts(exec: Executor = getDb()): Promise<StoreProductRow[]> {
  return exec
    .select()
    .from(storeProducts)
    .where(eq(storeProducts.active, true))
    .orderBy(asc(storeProducts.pixels));
}

/** M5 P10 (decision 0072) — idempotent-insert the pack ladder (dev-seed's `ensureStoreProducts`; the
 *  eventual production content-seed path too). GLOBAL content, not per-user — no actor scoping. */
export async function seedProducts(
  products: Array<{ productId: string; pixels: number; oneTime: boolean }>,
  exec: Executor = getDb(),
): Promise<void> {
  if (products.length === 0) return;
  await exec.insert(storeProducts).values(products).onConflictDoNothing({ target: storeProducts.productId });
}
