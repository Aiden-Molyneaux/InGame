import type { Request, Response } from 'express';
import type { AddListItemRequest, RerankListRequest } from '@ingame/shared';
import * as listService from '../services/list-service';

// SOC-04 Top-10 list controllers (M6 P5) — thin: resolve the actor from the verified principal,
// delegate. The actor id is NEVER read from the body (SYS-01).

function actorOf(req: Request): string {
  const principal = req.principal;
  if (!principal) throw new Error('resolvePrincipal must run before this controller.');
  return principal.userId;
}

export async function getLists(req: Request, res: Response): Promise<void> {
  res.json(await listService.listLists(actorOf(req)));
}

export async function addListItem(req: Request, res: Response): Promise<void> {
  const item = await listService.addListItem(
    actorOf(req),
    req.params.id!,
    req.validated as AddListItemRequest,
  );
  res.status(201).json(item);
}

export async function removeListItem(req: Request, res: Response): Promise<void> {
  await listService.removeListItem(actorOf(req), req.params.id!, req.params.gameId!);
  res.json({ ok: true });
}

export async function rerankList(req: Request, res: Response): Promise<void> {
  await listService.rerankList(actorOf(req), req.params.id!, req.validated as RerankListRequest);
  res.json({ ok: true });
}
