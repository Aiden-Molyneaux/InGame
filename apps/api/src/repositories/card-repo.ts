import { and, count, desc, eq, inArray, type SQL } from 'drizzle-orm';
import { getDb, type Executor } from '../db/client';
import { asActor, ownedBy } from '../db/scoped';
import {
  cardAdoptions,
  cardDesigns,
  collectionEntries,
  users,
  type CardDesignRow,
} from '../db/schema';

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

// ── OQ-122 / decision 0073 §0.1 — the PUBLIC read class (the community gallery) ───────────────────────
// `card_designs` is USER-OWNED, but a PUBLISHED card is public by design (CARD-15): a DIFFERENT user
// reads the flattened images (never the private `composition`). These reads carry the
// `// SYS-01-PUBLIC-READ` marker and go through `publishedOnly`, which HARD-REQUIRES the
// `status = 'published'` visibility predicate — the rule-02 lint admits the marker only when that
// predicate is textually present. The payload is an EXPLICIT public-column allowlist (never
// `composition`); the service serializes it through `toPublicShape`.

/** The OQ-122 visibility predicate — `status = 'published'`, AND-ed with an optional extra clause. */
export function publishedOnly(extra?: SQL): SQL {
  const pub = eq(cardDesigns.status, 'published');
  return extra ? (and(pub, extra) as SQL) : pub;
}

/** One public gallery row — the `toPublicShape` allowlist source (NEVER carries `composition`). */
export interface PublishedDesignRow {
  id: string;
  gameId: string;
  name: string;
  imageUrl: string | null;
  thumbUrl: string | null;
  isPremium: boolean;
  designerId: string;
  designerUsername: string;
}

/** The public columns every gallery read selects — no `composition`, no owner-private fields. */
const PUBLIC_COLUMNS = {
  id: cardDesigns.id,
  gameId: cardDesigns.gameId,
  name: cardDesigns.name,
  imageUrl: cardDesigns.imageUrl,
  thumbUrl: cardDesigns.thumbUrl,
  isPremium: cardDesigns.isPremium,
  designerId: users.id,
  designerUsername: users.username,
} as const;

/** GET /games/:gameId/cards — the community gallery: every PUBLISHED card for one game, newest first. */
export async function listPublishedDesignsForGame(
  gameId: string,
  exec: Executor = getDb(),
): Promise<PublishedDesignRow[]> {
  // SYS-01-PUBLIC-READ — cross-user gallery: published cards only, flattened image urls, never composition.
  return exec
    .select(PUBLIC_COLUMNS)
    .from(cardDesigns)
    .innerJoin(users, eq(users.id, cardDesigns.ownerId))
    .where(publishedOnly(eq(cardDesigns.gameId, gameId)))
    .orderBy(desc(cardDesigns.updatedAt));
}

/** Resolve one PUBLISHED card by id (the adopt target) — null when unknown OR not published. */
export async function findPublishedDesignById(
  cardId: string,
  exec: Executor = getDb(),
): Promise<PublishedDesignRow | null> {
  // SYS-01-PUBLIC-READ — cross-user adopt lookup: published cards only, never the private composition.
  const rows = await exec
    .select(PUBLIC_COLUMNS)
    .from(cardDesigns)
    .innerJoin(users, eq(users.id, cardDesigns.ownerId))
    .where(publishedOnly(eq(cardDesigns.id, cardId)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * The public adoption count per card (decision 0072: `AdoptCount` is public by design). An anonymous
 * cross-user AGGREGATE of the user-owned `card_adoptions` — never a row read, never a per-owner
 * counter write — so it rides the SYS-01-COMMUNITY-AGGREGATE read class (OQ-126/0024).
 */
export async function adoptionCountsByCard(
  cardIds: string[],
  exec: Executor = getDb(),
): Promise<Map<string, number>> {
  if (cardIds.length === 0) return new Map();
  // SYS-01-COMMUNITY-AGGREGATE — an anonymous cross-user COUNT per card (public AdoptCount, decision 0072).
  const rows = await exec
    .select({ cardId: cardAdoptions.cardDesignId, n: count() })
    .from(cardAdoptions)
    .where(inArray(cardAdoptions.cardDesignId, cardIds))
    .groupBy(cardAdoptions.cardDesignId);
  return new Map(rows.map((r) => [r.cardId, Number(r.n)]));
}

/** The equipped-transition write (the owner's OWN publish): flip status + set the flattened urls. */
export async function markPublished(
  actorId: string,
  designId: string,
  urls: { imageUrl: string; thumbUrl: string },
  exec: Executor = getDb(),
): Promise<CardDesignRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .update(cardDesigns)
    .set({ status: 'published', imageUrl: urls.imageUrl, thumbUrl: urls.thumbUrl, updatedAt: new Date() })
    .where(ownedBy(actor, cardDesigns.ownerId, eq(cardDesigns.id, designId)))
    .returning();
  return rows[0] ?? null;
}
