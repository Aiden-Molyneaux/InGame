import { count, desc, eq, inArray } from 'drizzle-orm';
import { getDb, type Executor } from '../db/client';
import { asActor, ownedBy } from '../db/scoped';
import { cardDesigns, collectionEntries, type CardDesignRow } from '../db/schema';

// Card-design repository — `card_designs` is USER-OWNED (owner key = owner_id; NOT on the F32
// manifest — rule-2 fails closed). Every read/write here is actor-scoped (SYS-01): actor B reaching
// for actor A's design gets the same nothing an unknown id gets (no existence oracle). M4 substrate
// (decision 0066); adoption grants ride a separate M5 table.

export interface DesignInsert {
  gameId: string;
  name: string;
  composition: Record<string, unknown>;
  compositionHash: string;
  isPremium: boolean;
  derivedFromCardId?: string | null; // CARD-24a copy-on-write origin (decision 0067)
}

export async function insertDesign(
  actorId: string,
  fields: DesignInsert,
  exec: Executor = getDb(),
): Promise<CardDesignRow> {
  const actor = asActor(actorId);
  const rows = await exec
    .insert(cardDesigns)
    .values({ ownerId: actor.actorId, ...fields })
    .returning();
  return rows[0]!;
}

export async function findOwnedDesign(
  actorId: string,
  designId: string,
  exec: Executor = getDb(),
): Promise<CardDesignRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .select()
    .from(cardDesigns)
    .where(ownedBy(actor, cardDesigns.ownerId, eq(cardDesigns.id, designId)))
    .limit(1);
  return rows[0] ?? null;
}

/** GET /me/cards — every design of mine, newest first (the CARD-14 My Designs shelf). */
export async function listOwnedDesigns(
  actorId: string,
  exec: Executor = getDb(),
): Promise<CardDesignRow[]> {
  const actor = asActor(actorId);
  return exec
    .select()
    .from(cardDesigns)
    .where(ownedBy(actor, cardDesigns.ownerId))
    .orderBy(desc(cardDesigns.updatedAt));
}

/** The per-game switcher feed (COL-06) — my designs for one game, newest first. */
export async function listOwnedDesignsForGame(
  actorId: string,
  gameId: string,
  exec: Executor = getDb(),
): Promise<CardDesignRow[]> {
  const actor = asActor(actorId);
  return exec
    .select()
    .from(cardDesigns)
    .where(ownedBy(actor, cardDesigns.ownerId, eq(cardDesigns.gameId, gameId)))
    .orderBy(desc(cardDesigns.updatedAt));
}

/** Bulk fetch for the collection serializer's card rider (equipped designs by id, own rows only). */
export async function ownedDesignsByIds(
  actorId: string,
  designIds: string[],
  exec: Executor = getDb(),
): Promise<Map<string, CardDesignRow>> {
  if (designIds.length === 0) return new Map();
  const actor = asActor(actorId);
  const rows = await exec
    .select()
    .from(cardDesigns)
    .where(ownedBy(actor, cardDesigns.ownerId, inArray(cardDesigns.id, designIds)));
  return new Map(rows.map((r) => [r.id, r]));
}

export interface DesignUpdate {
  name?: string;
  composition?: Record<string, unknown>;
  compositionHash?: string;
  status?: string;
  isPremium?: boolean;
}

export async function updateOwnedDesign(
  actorId: string,
  designId: string,
  fields: DesignUpdate,
  exec: Executor = getDb(),
): Promise<CardDesignRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .update(cardDesigns)
    .set({ ...fields, updatedAt: new Date() })
    .where(ownedBy(actor, cardDesigns.ownerId, eq(cardDesigns.id, designId)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteOwnedDesign(
  actorId: string,
  designId: string,
  exec: Executor = getDb(),
): Promise<boolean> {
  const actor = asActor(actorId);
  const rows = await exec
    .delete(cardDesigns)
    .where(ownedBy(actor, cardDesigns.ownerId, eq(cardDesigns.id, designId)))
    .returning({ id: cardDesigns.id });
  return rows.length > 0;
}

/** The 0040 equipped-guard input: how many of MY entries wear this design (0 or 1 in practice). */
export async function countEquippedReferences(
  actorId: string,
  designId: string,
  exec: Executor = getDb(),
): Promise<number> {
  const actor = asActor(actorId);
  const rows = await exec
    .select({ n: count() })
    .from(collectionEntries)
    .where(
      ownedBy(
        actor,
        collectionEntries.userId,
        eq(collectionEntries.activeCardDesignId, designId),
      ),
    );
  return Number(rows[0]?.n ?? 0);
}

/**
 * PROF-04 — the actor's designed-card count (the /me.stats `cardsDesigned` real value, 0066):
 * FINISHED designs (private + published), never in-progress drafts.
 */
export async function countOwnedDesigns(
  actorId: string,
  exec: Executor = getDb(),
): Promise<number> {
  const actor = asActor(actorId);
  const rows = await exec
    .select({ n: count() })
    .from(cardDesigns)
    .where(ownedBy(actor, cardDesigns.ownerId, inArray(cardDesigns.status, ['private', 'published'])));
  return Number(rows[0]?.n ?? 0);
}
