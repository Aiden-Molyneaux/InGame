import type { Request, Response } from 'express';
import type { IapValidateRequest } from '@ingame/shared';
import * as iapService from '../services/iap/iap-service';

// IAP + Store controllers (M5 P2 · ECON-06/09/10) — thin: resolve the actor from the verified principal
// (never the body — SYS-01), delegate. `validate` reads the zod-parsed body off `req.validated` (the
// route's validateBody chokepoint). The webhook is UN-principaled: its auth is the RC signature,
// verified in the service over the RAW body (`req.rawBody`) — so this controller never reads `req.body`.

function actorOf(req: Request): string {
  const principal = req.principal;
  if (!principal) throw new Error('resolvePrincipal must run before this controller.');
  return principal.userId;
}

export async function validatePurchase(req: Request, res: Response): Promise<void> {
  res.json(await iapService.validatePurchase(actorOf(req), req.validated as IapValidateRequest));
}

export async function getStore(req: Request, res: Response): Promise<void> {
  res.json(await iapService.getStore(actorOf(req)));
}

export async function webhook(req: Request, res: Response): Promise<void> {
  // Server-to-server: the RC signature (verified in-service over the raw bytes) IS the auth — no
  // principal. `rawBody` is captured by the express.json({ verify }) hook in app.ts.
  const raw = req.rawBody ?? Buffer.from('');
  const authHeader = req.header('authorization') ?? undefined;
  res.json(await iapService.handleWebhook(raw, authHeader));
}
