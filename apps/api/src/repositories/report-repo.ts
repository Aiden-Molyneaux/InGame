import { getDb, type Executor } from '../db/client';
import { asActor } from '../db/scoped';
import { reports, type ReportRow } from '../db/schema';

// MOD-01 report-capture repository (M6 P7, decision 0076 §0.5). `reports` is USER-OWNED (owner key =
// `reporter_id`). CAPTURE-ONLY: this file has exactly one write and no read (the M7 moderation console
// owns the queue read). No dedup/idempotency here BY DESIGN — a duplicate report against the same
// target is accepted every time (capture-only; the dedupe half of OQ-093 lands with M7's console).

export interface NewReportFields {
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
}

/**
 * Insert a report (reporter = actor). Actor-stamped BARE insert (`reporter_id` = the actor, SYS-01 —
 * never body-supplied) — rule-02 exempts a bare insert (you cannot IDOR a brand-new actor-stamped
 * row), mirroring friend-request-repo.insertRequest / recommendation-repo.insertRecommendation. No
 * existence check on `targetId` runs here or anywhere upstream (report-service.ts) — capture-only, by
 * design (an unknown/invisible target must never become an existence oracle).
 */
export async function insertReport(
  actorId: string,
  fields: NewReportFields,
  exec: Executor = getDb(),
): Promise<ReportRow> {
  const actor = asActor(actorId);
  const rows = await exec
    .insert(reports)
    .values({ reporterId: actor.actorId, ...fields })
    .returning();
  return rows[0]!;
}
