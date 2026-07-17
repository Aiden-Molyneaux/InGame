import type { Request, Response } from 'express';
import { AuthFailedError } from '../errors/AppError';
import * as inviteService from '../services/invite-service';

// SOC-10 invite controllers (M6 P3).
//   • POST /me/invites — the minter is the authenticated principal ONLY (SYS-01; unauth → 401).
//   • GET /invites/:token — OPTIONAL auth: the resolve does NOT require a session (a fresh install may
//     open the link). If a valid bearer happens to be present, `optionalPrincipal` set `req.principal`
//     so the service can apply the viewer↔sender relationship + block collapse; otherwise the viewer is
//     null and the relationship is 'none'. The token is the path param (validated defensively in the
//     service — a malformed token collapses to INVITE_INVALID, never a 422).

export async function postInvite(req: Request, res: Response): Promise<void> {
  const principal = req.principal;
  if (!principal) throw new AuthFailedError();
  const result = await inviteService.createInvite(principal.userId);
  res.status(201).json(result);
}

export async function getInvite(req: Request, res: Response): Promise<void> {
  const viewerId = req.principal?.userId ?? null; // optional — may be an unauthenticated resolver
  const result = await inviteService.resolveInvite(viewerId, req.params.token ?? '');
  res.json(result);
}
