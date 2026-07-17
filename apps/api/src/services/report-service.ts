import type { CreateReportRequest } from '@ingame/shared';
import { mutation } from '../db/mutation';
import * as reportRepo from '../repositories/report-repo';
import { SelfTargetError } from '../errors/AppError';

// MOD-01 report capture (M6 P7, decision 0076 §0.5). CAPTURE-ONLY: no hide, no queue read — the M7
// moderation console owns those. This service deliberately does NO target-existence lookup of any
// kind (no card/game/user fetch): a report against something the reporter can see on their own screen
// must NEVER become an existence oracle for a target that's invisible to them for an UNRELATED reason
// (soft-deleted, blocked, suspended, or simply never existed — a mistyped id, a stale deep-link,
// whatever). So an unknown/invisible targetId is ACCEPTED exactly like a real one — a moderator (M7)
// is the first principal trusted to actually look up what was reported. The ONE refusal this endpoint
// makes is SELF_TARGET on a `user` report where targetId === the reporter (the actor's own id IS
// already knowable to them, so refusing it discloses nothing new). The reason/details validity matrix
// (the MOD-01 pinned per-target enum + details-required set) is enforced entirely by the zod request
// schema (packages/shared) before this ever runs. Duplicate reports against the same target are
// accepted every time (capture-only; dedup rides M7 per OQ-093).

export const createReport = mutation(
  { name: 'reports.create', specIds: ['MOD-01', 'SYS-01', 'SYS-02', 'SYS-05', 'SYS-07'] },
  async (ctx, actorId, input: CreateReportRequest): Promise<{ reportId: string }> => {
    if (input.targetType === 'user' && input.targetId === actorId) {
      throw new SelfTargetError('You cannot report yourself.');
    }
    const row = await reportRepo.insertReport(
      actorId,
      {
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        details: input.details ?? null,
      },
      ctx.tx,
    );
    await ctx.emit({
      eventType: 'report.filed',
      entityRef: { type: 'report', id: row.id },
      // reportId + targetType ONLY (F18) — never the reason, targetId, or details text. The
      // moderation queue (M7) reads those off the row itself; the event spine stays minimal.
      payload: { reportId: row.id, targetType: input.targetType },
    });
    return { reportId: row.id };
  },
);
