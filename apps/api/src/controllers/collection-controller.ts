import type { Request, Response } from 'express';
import type {
  AddCollectionEntryRequest,
  NowPlayingRequest,
  ReorderCollectionRequest,
  UpdateCollectionEntryRequest,
} from '@ingame/shared';
import * as collectionService from '../services/collection-service';

// Collection controllers (COL-01..07, WTP-03) — thin: resolve the actor from the verified
// principal, delegate. The actor id is NEVER read from the body (SYS-01).

function actorOf(req: Request): string {
  const principal = req.principal;
  if (!principal) throw new Error('resolvePrincipal must run before this controller.');
  return principal.userId;
}

export async function getCollection(req: Request, res: Response): Promise<void> {
  res.json(await collectionService.listCollection(actorOf(req)));
}

export async function addEntry(req: Request, res: Response): Promise<void> {
  const item = await collectionService.addEntry(
    actorOf(req),
    req.validated as AddCollectionEntryRequest,
  );
  res.status(201).json(item);
}

export async function patchEntry(req: Request, res: Response): Promise<void> {
  const item = await collectionService.updateEntry(
    actorOf(req),
    req.params.entryId!,
    req.validated as UpdateCollectionEntryRequest,
  );
  res.json(item);
}

export async function deleteEntry(req: Request, res: Response): Promise<void> {
  await collectionService.removeEntry(actorOf(req), req.params.entryId!);
  res.json({ ok: true });
}

export async function reorderCollection(req: Request, res: Response): Promise<void> {
  await collectionService.reorder(actorOf(req), req.validated as ReorderCollectionRequest);
  res.json({ ok: true });
}

export async function putNowPlaying(req: Request, res: Response): Promise<void> {
  await collectionService.setNowPlaying(actorOf(req), req.validated as NowPlayingRequest);
  res.json({ ok: true });
}
