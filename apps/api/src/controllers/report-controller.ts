import type { Request, Response } from 'express';
import type { CreateReportRequest } from '@ingame/shared';
import * as reportService from '../services/report-service';

// MOD-01 report-capture controller (M6 P7) — thin: resolve the actor from the verified principal,
// delegate. The actor id is NEVER read from the body (SYS-01).

function actorOf(req: Request): string {
  const principal = req.principal;
  if (!principal) throw new Error('resolvePrincipal must run before this controller.');
  return principal.userId;
}

export async function postReport(req: Request, res: Response): Promise<void> {
  const { reportId } = await reportService.createReport(actorOf(req), req.validated as CreateReportRequest);
  res.status(201).json({ ok: true, reportId });
}
