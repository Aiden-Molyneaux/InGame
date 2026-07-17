import { count, desc, eq } from 'drizzle-orm';
import type { StickerComposition } from '@ingame/shared';
import { getDb, type Executor } from '../db/client';
import { asActor, ownedBy } from '../db/scoped';
import { deviceConfigs, deviceLooks, type DeviceConfigRow, type DeviceLookRow } from '../db/schema';

// Device repository — `device_configs` + `device_looks` are USER-OWNED (owner key = user_id; NOT on
// the F32 manifest — rule-2 fails closed). Every read/write here is actor-scoped (SYS-01): actor B
// reaching for actor A's device/look gets the same nothing an unknown id gets (no existence oracle).
// M4 §3.5 substrate (decision 0030). One row per user in device_configs — the ARCH-3 write pipeline
// UPSERTs on the unique user_id.

/** The three device facets — the shape a config row exposes and a look row snapshots. */
export interface DeviceFacets {
  activeShellId: string;
  screenThemeId: string;
  stickerComposition: StickerComposition;
}

/** The live config row, or null when the user has never written a device (→ the free defaults). */
export async function findConfig(
  actorId: string,
  exec: Executor = getDb(),
): Promise<DeviceConfigRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .select()
    .from(deviceConfigs)
    .where(ownedBy(actor, deviceConfigs.userId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * The ARCH-3 single write pipeline: create-or-update the caller's one device row. A PARTIAL `fields`
 * updates only the named facets (the others keep their stored/default value) — on first write the
 * unnamed facets take the DB defaults (teal · midnight · empty). Scoped: the row is stamped with (and
 * conflicts on) the actor's own user_id, so there is no cross-user write path.
 */
export async function upsertConfig(
  actorId: string,
  fields: Partial<DeviceFacets>,
  exec: Executor = getDb(),
): Promise<DeviceConfigRow> {
  const actor = asActor(actorId);
  const rows = await exec
    .insert(deviceConfigs)
    .values({ userId: actor.actorId, ...fields })
    .onConflictDoUpdate({
      target: deviceConfigs.userId,
      set: { ...fields, updatedAt: new Date() },
    })
    .returning();
  return rows[0]!;
}

/** GET /me/device/looks — the caller's saved looks, newest first (DEV-05). */
export async function listLooks(
  actorId: string,
  exec: Executor = getDb(),
): Promise<DeviceLookRow[]> {
  const actor = asActor(actorId);
  return exec
    .select()
    .from(deviceLooks)
    .where(ownedBy(actor, deviceLooks.userId))
    .orderBy(desc(deviceLooks.createdAt));
}

/** SAVE CURRENT — insert a new look snapshot for the actor (bare actor-stamped insert). */
export async function insertLook(
  actorId: string,
  facets: DeviceFacets,
  exec: Executor = getDb(),
): Promise<DeviceLookRow> {
  const actor = asActor(actorId);
  const rows = await exec
    .insert(deviceLooks)
    .values({ userId: actor.actorId, ...facets })
    .returning();
  return rows[0]!;
}

/** The cap-check input (DEV-05, SYS-04): how many looks the actor already has saved. */
export async function countLooks(actorId: string, exec: Executor = getDb()): Promise<number> {
  const actor = asActor(actorId);
  const rows = await exec
    .select({ n: count() })
    .from(deviceLooks)
    .where(ownedBy(actor, deviceLooks.userId));
  return Number(rows[0]?.n ?? 0);
}

/** DELETE /me/device/looks/:id — owner-scoped; a foreign/unknown id removes nothing (→ 404). */
export async function deleteLook(
  actorId: string,
  lookId: string,
  exec: Executor = getDb(),
): Promise<boolean> {
  const actor = asActor(actorId);
  const rows = await exec
    .delete(deviceLooks)
    .where(ownedBy(actor, deviceLooks.userId, eq(deviceLooks.id, lookId)))
    .returning({ id: deviceLooks.id });
  return rows.length > 0;
}
