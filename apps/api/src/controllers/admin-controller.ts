import type { Request, Response } from 'express';
import {
  adminReportsQuerySchema,
  type TakedownCardRequest,
  type UpdateSpotlightRequest,
} from '@ingame/shared';
import * as adminService from '../services/admin/admin-service';

// Admin-console controllers (M6 P7 — decision 0081). Thin, like every other controller: resolve the
// actor from the VERIFIED principal, delegate. The tier gate has already run in the route's middleware
// chain (`requireAdminTier`), so nothing here re-checks authorization — one wall, in one place.

function actorOf(req: Request): string {
  const principal = req.principal;
  if (!principal) throw new Error('resolvePrincipal must run before this controller.');
  return principal.userId;
}

export async function getSpotlight(_req: Request, res: Response): Promise<void> {
  res.json(await adminService.getSpotlight());
}

export async function putSpotlight(req: Request, res: Response): Promise<void> {
  const body = req.validated as UpdateSpotlightRequest;
  res.json(await adminService.updateSpotlight(actorOf(req), body));
}

export async function getCosmeticCatalog(_req: Request, res: Response): Promise<void> {
  res.json(await adminService.listCosmeticCatalog());
}

export async function getStats(_req: Request, res: Response): Promise<void> {
  res.json(await adminService.getStats());
}

export async function getReports(req: Request, res: Response): Promise<void> {
  // Query validation at the boundary (rule-3): a ZodError forwards to the 422 envelope.
  const query = adminReportsQuerySchema.parse(req.query);
  res.json(await adminService.listReports(query));
}

export async function postCardTakedown(req: Request, res: Response): Promise<void> {
  const { reason } = req.validated as TakedownCardRequest;
  res.json(await adminService.takedownCard(actorOf(req), req.params.id!, reason));
}

export async function postCardRestore(req: Request, res: Response): Promise<void> {
  const { reason } = req.validated as TakedownCardRequest;
  res.json(await adminService.restoreCard(actorOf(req), req.params.id!, reason));
}
