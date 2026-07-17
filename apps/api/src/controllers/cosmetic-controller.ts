import type { Request, Response } from 'express';
import { cosmeticsQuerySchema, type AcquireBatchRequest } from '@ingame/shared';
import * as cosmeticService from '../services/cosmetics/cosmetic-service';

// Cosmetic/entitlement controllers (COSM-03/ECON-01 — decision 0072/0073; COSM-01 library — decision
// 0075/P10) — thin: resolve the actor from the verified principal, delegate. The actor id is NEVER
// read from the body/query (SYS-01).

function actorOf(req: Request): string {
  const principal = req.principal;
  if (!principal) throw new Error('resolvePrincipal must run before this controller.');
  return principal.userId;
}

export async function getEntitlements(req: Request, res: Response): Promise<void> {
  res.json(await cosmeticService.listMyEntitlements(actorOf(req)));
}

export async function listCosmetics(req: Request, res: Response): Promise<void> {
  // Query validation at the boundary (rule-3): a ZodError forwards to the 422 envelope via asyncHandler.
  const { type } = cosmeticsQuerySchema.parse(req.query);
  res.json(await cosmeticService.listCosmeticLibrary(actorOf(req), type));
}

export async function acquireCosmetic(req: Request, res: Response): Promise<void> {
  res.json(await cosmeticService.acquireCosmetic(actorOf(req), req.params.cosmeticId!));
}

export async function acquireCosmeticBatch(req: Request, res: Response): Promise<void> {
  const { cosmeticIds } = req.validated as AcquireBatchRequest;
  res.json(await cosmeticService.acquireCosmeticBatch(actorOf(req), cosmeticIds));
}
