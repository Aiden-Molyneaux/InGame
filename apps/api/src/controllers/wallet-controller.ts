import type { Request, Response } from 'express';
import { walletLedgerQuerySchema } from '@ingame/shared';
import * as ledgerService from '../services/economy/ledger-service';

// Wallet controllers (ECON-02/07 — decision 0072/0073) — thin: resolve the actor from the verified
// principal, delegate. The actor id is NEVER read from the body/query (SYS-01). wallets +
// currency_ledger are the caller's OWN — GET /me/wallet* are own-only reads (no cross-principal path).

function actorOf(req: Request): string {
  const principal = req.principal;
  if (!principal) throw new Error('resolvePrincipal must run before this controller.');
  return principal.userId;
}

export async function getWallet(req: Request, res: Response): Promise<void> {
  res.json(await ledgerService.getWallet(actorOf(req)));
}

export async function getLedger(req: Request, res: Response): Promise<void> {
  // Query validation at the boundary (rule-3): a ZodError forwards to the 422 envelope via asyncHandler.
  const query = walletLedgerQuerySchema.parse(req.query);
  res.json(await ledgerService.listLedger(actorOf(req), query));
}

export async function claimDailyBonus(req: Request, res: Response): Promise<void> {
  res.json(await ledgerService.claimDailyBonus(actorOf(req)));
}
