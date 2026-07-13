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
