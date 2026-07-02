import { eq } from 'drizzle-orm';
import { getDb, type Executor } from '../db/client';
import { asActor, ownedBy } from '../db/scoped';
import { gamertags, type GamertagRow } from '../db/schema';
import { ServerError } from '../errors/AppError';

// Gamertag repository (PROF-02). Every read/modify goes through the SYS-01 scoped helper (owner key =
// `user_id`). `listForUser` scopes to whichever user id it is given — the caller's own id for
// GET /me/gamertags, the target's id for the friend-view of GET /users/:id (scope-to-owner).

export async function listForUser(userId: string, exec: Executor = getDb()): Promise<GamertagRow[]> {
  const actor = asActor(userId);
  return exec.select().from(gamertags).where(ownedBy(actor, gamertags.userId));
}

export async function insertForUser(
  userId: string,
  values: { platform: string; handle: string },
  exec: Executor = getDb(),
): Promise<GamertagRow> {
  const [row] = await exec
    .insert(gamertags)
    .values({ userId, platform: values.platform, handle: values.handle })
    .returning();
  if (!row) throw new ServerError('gamertag insert returned no row.');
  return row;
}

export async function findOwned(
  userId: string,
  id: string,
  exec: Executor = getDb(),
): Promise<GamertagRow | null> {
  const actor = asActor(userId);
  const rows = await exec
    .select()
    .from(gamertags)
    .where(ownedBy(actor, gamertags.userId, eq(gamertags.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateOwned(
  userId: string,
  id: string,
  fields: { platform?: string; handle?: string },
  exec: Executor = getDb(),
): Promise<GamertagRow | null> {
  const actor = asActor(userId);
  const rows = await exec
    .update(gamertags)
    .set(fields)
    .where(ownedBy(actor, gamertags.userId, eq(gamertags.id, id)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteOwned(
  userId: string,
  id: string,
  exec: Executor = getDb(),
): Promise<boolean> {
  const actor = asActor(userId);
  const rows = await exec
    .delete(gamertags)
    .where(ownedBy(actor, gamertags.userId, eq(gamertags.id, id)))
    .returning();
  return rows.length > 0;
}
