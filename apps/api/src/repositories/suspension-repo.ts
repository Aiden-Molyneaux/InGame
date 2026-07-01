import { and, isNull, or, gt } from 'drizzle-orm';
import { getDb, type Executor } from '../db/client';
import { asActor, ownedBy } from '../db/scoped';
import { userSuspensions, type UserSuspensionRow } from '../db/schema';

// MOD-09 suspension — READ-ONLY resolver + (via the seed helper) test data. M2 builds the read that
// (a) login uses to return ACCOUNT_SUSPENDED and (b) GET /users/:id uses for the "unavailable"
// collapse; the suspend/unsuspend ENDPOINTS are M7. Scoped to the subject's own id (SYS-01):
// login checks the authenticated user; the collapse checks the target (owner = subject_id).
//
// An ACTIVE suspension = NOT lifted AND (indefinite [endsAt NULL] OR endsAt in the future).
export async function getActiveSuspension(
  subjectId: string,
  exec: Executor = getDb(),
): Promise<UserSuspensionRow | null> {
  const actor = asActor(subjectId);
  const now = new Date();
  const rows = await exec
    .select()
    .from(userSuspensions)
    .where(
      ownedBy(
        actor,
        userSuspensions.subjectId,
        and(isNull(userSuspensions.liftedAt), or(isNull(userSuspensions.endsAt), gt(userSuspensions.endsAt, now))),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}
