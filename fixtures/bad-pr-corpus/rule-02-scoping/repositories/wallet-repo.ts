// DELIBERATELY BAD (rule-02-scoping). A repository reads ANOTHER user's row by id with NO SYS-01
// scoped helper — the prototype's exact original cross-user vulnerability. `wallets` is user-owned
// (NOT on the F32 global-table manifest), so this fails closed in CI (CONVENTIONS rule 2).
import { eq } from 'drizzle-orm';
import { wallets } from './schema';

export async function getAnyWallet(exec: any, walletId: string) {
  // ❌ no asActor()/ownedBy() — a caller can read someone else's wallet by guessing its id
  return exec.select().from(wallets).where(eq(wallets.id, walletId));
}
