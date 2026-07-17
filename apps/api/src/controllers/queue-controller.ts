import type { Request, Response } from 'express';
import type { AddQueueItemRequest, ReorderQueueRequest } from '@ingame/shared';
import * as queueService from '../services/queue-service';

// WTP-01/02 queue controllers (M6 P5) — thin: resolve the actor from the verified principal,
// delegate. The actor id is NEVER read from the body (SYS-01).

function actorOf(req: Request): string {
  const principal = req.principal;
  if (!principal) throw new Error('resolvePrincipal must run before this controller.');
  return principal.userId;
}

export async function getQueue(req: Request, res: Response): Promise<void> {
  res.json(await queueService.listQueue(actorOf(req)));
}

export async function addQueueItem(req: Request, res: Response): Promise<void> {
  const item = await queueService.addItem(actorOf(req), req.validated as AddQueueItemRequest);
  res.status(201).json(item);
}

export async function reorderQueue(req: Request, res: Response): Promise<void> {
  await queueService.reorder(actorOf(req), req.validated as ReorderQueueRequest);
  res.json({ ok: true });
}

export async function deleteQueueItem(req: Request, res: Response): Promise<void> {
  await queueService.removeItem(actorOf(req), req.params.itemId!);
  res.json({ ok: true });
}
