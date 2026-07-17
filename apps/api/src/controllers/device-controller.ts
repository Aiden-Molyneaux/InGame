import type { Request, Response } from 'express';
import type { PatchDeviceRequest } from '@ingame/shared';
import * as deviceService from '../services/device-service';

// Device editor controllers (DEV-01..05 — decision 0030) — thin: resolve the actor from the verified
// principal, delegate. The actor id is NEVER read from the body (SYS-01). SAVE CURRENT takes no body —
// the look is snapshotted server-side from the live config.

function actorOf(req: Request): string {
  const principal = req.principal;
  if (!principal) throw new Error('resolvePrincipal must run before this controller.');
  return principal.userId;
}

export async function getDevice(req: Request, res: Response): Promise<void> {
  res.json(await deviceService.getDevice(actorOf(req)));
}

export async function patchDevice(req: Request, res: Response): Promise<void> {
  res.json(await deviceService.patchDevice(actorOf(req), req.validated as PatchDeviceRequest));
}

export async function getLooks(req: Request, res: Response): Promise<void> {
  res.json(await deviceService.listLooks(actorOf(req)));
}

export async function createLook(req: Request, res: Response): Promise<void> {
  res.status(201).json(await deviceService.saveLook(actorOf(req)));
}

export async function deleteLook(req: Request, res: Response): Promise<void> {
  await deviceService.deleteLook(actorOf(req), req.params.lookId!);
  res.json({ ok: true });
}
