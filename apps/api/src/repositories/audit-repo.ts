import type { Executor } from '../db/client';
import { adminAuditLog, type AdminAuditInsert } from '../db/schema';

// MOD-10 audit trail (F16) — the append-only INSERT lives in the repository layer (CONVENTIONS rule
// 1). Written INSIDE a privileged mutation's own transaction via the `@mutation` seam (`ctx.audit`),
// so a privileged action + its audit row commit atomically — no un-auditable history, no retrofit.
// Append-only + actor-stamped, so it is not a cross-user read/modify vector (rule-2 targets
// select/update/delete, not inserts).
export async function insertAuditRow(exec: Executor, row: AdminAuditInsert): Promise<void> {
  await exec.insert(adminAuditLog).values(row);
}
