import type { Request, Response } from 'express';
import type {
  CreateCardRequest,
  CreateStylePresetRequest,
  UpdateCardRequest,
  UpdateStylePresetRequest,
} from '@ingame/shared';
import * as cardService from '../services/card-service';
import * as presetService from '../services/style-preset-service';

// Card + style-preset controllers (CARD-14/15/24, COL-06 — decision 0066) — thin: resolve the actor
// from the verified principal, delegate. The actor id is NEVER read from the body (SYS-01).

function actorOf(req: Request): string {
  const principal = req.principal;
  if (!principal) throw new Error('resolvePrincipal must run before this controller.');
  return principal.userId;
}

export async function createCard(req: Request, res: Response): Promise<void> {
  const card = await cardService.createDraft(actorOf(req), req.validated as CreateCardRequest);
  res.status(201).json(card);
}

export async function patchCard(req: Request, res: Response): Promise<void> {
  const card = await cardService.updateCard(
    actorOf(req),
    req.params.cardId!,
    req.validated as UpdateCardRequest,
  );
  res.json(card);
}

export async function savePrivate(req: Request, res: Response): Promise<void> {
  res.json(await cardService.savePrivate(actorOf(req), req.params.cardId!));
}

export async function deleteCard(req: Request, res: Response): Promise<void> {
  await cardService.deleteCard(actorOf(req), req.params.cardId!);
  res.json({ ok: true });
}

export async function getMyCards(req: Request, res: Response): Promise<void> {
  res.json(await cardService.listMyCards(actorOf(req)));
}

export async function getEntryCards(req: Request, res: Response): Promise<void> {
  res.json(await cardService.listCardsForEntry(actorOf(req), req.params.entryId!));
}

export async function getStylePresets(req: Request, res: Response): Promise<void> {
  res.json(await presetService.listPresets(actorOf(req)));
}

export async function createStylePreset(req: Request, res: Response): Promise<void> {
  const preset = await presetService.createPreset(
    actorOf(req),
    req.validated as CreateStylePresetRequest,
  );
  res.status(201).json(preset);
}

export async function patchStylePreset(req: Request, res: Response): Promise<void> {
  const preset = await presetService.updatePreset(
    actorOf(req),
    req.params.presetId!,
    req.validated as UpdateStylePresetRequest,
  );
  res.json(preset);
}

export async function deleteStylePreset(req: Request, res: Response): Promise<void> {
  await presetService.deletePreset(actorOf(req), req.params.presetId!);
  res.json({ ok: true });
}
