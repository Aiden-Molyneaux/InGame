import { count, desc, eq } from 'drizzle-orm';
import { getDb, type Executor } from '../db/client';
import { asActor, ownedBy } from '../db/scoped';
import { stylePresets, type StylePresetRow } from '../db/schema';

// Style-preset repository — `style_presets` is USER-OWNED (owner key = owner_id; NOT on the F32
// manifest — rule-2 fails closed). CARD-24b (decision 0066 §4); the cap-30 check is the service's.

export async function listOwnedPresets(
  actorId: string,
  exec: Executor = getDb(),
): Promise<StylePresetRow[]> {
  const actor = asActor(actorId);
  return exec
    .select()
    .from(stylePresets)
    .where(ownedBy(actor, stylePresets.ownerId))
    .orderBy(desc(stylePresets.updatedAt));
}

export async function countOwnedPresets(
  actorId: string,
  exec: Executor = getDb(),
): Promise<number> {
  const actor = asActor(actorId);
  const rows = await exec
    .select({ n: count() })
    .from(stylePresets)
    .where(ownedBy(actor, stylePresets.ownerId));
  return Number(rows[0]?.n ?? 0);
}

export async function insertPreset(
  actorId: string,
  fields: { name: string; style: Record<string, unknown>; isPremium: boolean },
  exec: Executor = getDb(),
): Promise<StylePresetRow> {
  const actor = asActor(actorId);
  const rows = await exec
    .insert(stylePresets)
    .values({ ownerId: actor.actorId, ...fields })
    .returning();
  return rows[0]!;
}

export async function findOwnedPreset(
  actorId: string,
  presetId: string,
  exec: Executor = getDb(),
): Promise<StylePresetRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .select()
    .from(stylePresets)
    .where(ownedBy(actor, stylePresets.ownerId, eq(stylePresets.id, presetId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateOwnedPreset(
  actorId: string,
  presetId: string,
  fields: { name?: string; style?: Record<string, unknown> },
  exec: Executor = getDb(),
): Promise<StylePresetRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .update(stylePresets)
    .set({ ...fields, updatedAt: new Date() })
    .where(ownedBy(actor, stylePresets.ownerId, eq(stylePresets.id, presetId)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteOwnedPreset(
  actorId: string,
  presetId: string,
  exec: Executor = getDb(),
): Promise<boolean> {
  const actor = asActor(actorId);
  const rows = await exec
    .delete(stylePresets)
    .where(ownedBy(actor, stylePresets.ownerId, eq(stylePresets.id, presetId)))
    .returning({ id: stylePresets.id });
  return rows.length > 0;
}
