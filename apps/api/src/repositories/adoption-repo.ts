import { getDb, type Executor } from '../db/client';
import { asActor, ownedBy } from '../db/scoped';
import { cardAdoptions, cardDesigns, users, type CardAdoptionRow } from '../db/schema';
import { desc, eq, inArray } from 'drizzle-orm';

// Adoption repository — `card_adoptions` is USER-OWNED (owner key = adopter_id; NOT on the F32 manifest
// — rule-2 fails closed). A grant is an ACTOR-STAMPED insert (the adopter owns the row), so the create
// is a bare insert (rule-2: a brand-new actor-owned row is not an IDOR vector). The unique
// (adopter, card) index backs `ALREADY_ADOPTED` idempotency (OQ-101) and the F36 parallel-adopt race:
// `onConflictDoNothing` returns the row ONLY when THIS call created it — a null return means already
// adopted, atomically, even under concurrency. The card's public count is derived elsewhere (an
// anonymous cross-user aggregate in card-repo), so the adopter never writes the owner's row.

export interface AdoptionInsert {
  cardDesignId: string;
  gameId: string;
  /** PX paid for the card's premium components (decision 0072); 0 on the free path (§1 spike). */
  currencyPaid: number;
}

/**
 * Insert the adoption grant for the caller. Returns the created row, or `null` when the caller already
 * adopted this card (the unique-pair conflict — the ALREADY_ADOPTED backstop). Actor-stamped bare
 * insert (SYS-01: adopter_id is the actor, never body-supplied).
 */
export async function insertAdoption(
  actorId: string,
  fields: AdoptionInsert,
  exec: Executor = getDb(),
): Promise<CardAdoptionRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .insert(cardAdoptions)
    .values({ adopterId: actor.actorId, ...fields })
    .onConflictDoNothing({ target: [cardAdoptions.adopterId, cardAdoptions.cardDesignId] })
    .returning();
  return rows[0] ?? null;
}

/** Whether the caller already adopted a card (actor-scoped — SYS-01). */
export async function findMyAdoption(
  actorId: string,
  cardDesignId: string,
  exec: Executor = getDb(),
): Promise<CardAdoptionRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .select()
    .from(cardAdoptions)
    .where(ownedBy(actor, cardAdoptions.adopterId, eq(cardAdoptions.cardDesignId, cardDesignId)))
    .limit(1);
  return rows[0] ?? null;
}

/** One card behind an adoption grant — the FLATTENED-image + attribution columns only (never the
 *  private `composition`; OQ-122/CARD-15). Feeds CARD-21 share, the COL-06 switcher's adopted rows, and
 *  the equipped-rider resolve on /me/collection. */
export interface AdoptedDesignRow {
  id: string;
  gameId: string;
  imageUrl: string | null;
  thumbUrl: string | null;
  isPremium: boolean;
  name: string;
  designerId: string;
  designerUsername: string;
}

// The flattened-image + attribution allowlist for every adopted-card read — the OQ-122 discipline
// applied to the adoption grant (never selects `composition`). One source so the share/switcher/rider
// reads can never drift into exposing a foreign card's private layers.
const ADOPTED_COLUMNS = {
  id: cardDesigns.id,
  gameId: cardDesigns.gameId,
  imageUrl: cardDesigns.imageUrl,
  thumbUrl: cardDesigns.thumbUrl,
  isPremium: cardDesigns.isPremium,
  name: cardDesigns.name,
  designerId: cardDesigns.ownerId,
  designerUsername: users.username,
} as const;

/**
 * CARD-21 (P9) — the design behind MY OWN adoption grant, regardless of its CURRENT publish status. An
 * adopter keeps their share access after the designer unpublishes (the MOD-08 "flattened card
 * persists" pattern — the grant, not the gallery listing, is what CARD-21 gates on). Scoped through
 * the adoption row I own (`cardAdoptions.adopterId` — SYS-01); the join to `card_designs` reads only
 * the flattened-image + attribution columns, never the private `composition`.
 */
export async function findAdoptedDesign(
  actorId: string,
  cardDesignId: string,
  exec: Executor = getDb(),
): Promise<AdoptedDesignRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .select(ADOPTED_COLUMNS)
    .from(cardAdoptions)
    .innerJoin(cardDesigns, eq(cardDesigns.id, cardAdoptions.cardDesignId))
    .innerJoin(users, eq(users.id, cardDesigns.ownerId))
    .where(ownedBy(actor, cardAdoptions.adopterId, eq(cardAdoptions.cardDesignId, cardDesignId)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * COL-06 — the cards the caller ADOPTED for one game, newest grant first (the switcher's adopted side).
 * ACTOR-SCOPED through the adoption GRANT (`ownedBy` on `adopterId`, SYS-01) — the grant, not the card's
 * publish status, is the visibility key, so a card the designer later UNPUBLISHES still lists here
 * (CARD-20 adopters-keep). The join to the foreign `card_designs`/`users` reads only the flattened-image
 * + attribution columns (`ADOPTED_COLUMNS`) — never the private `composition` (OQ-122/CARD-15).
 */
export async function listAdoptedDesignsForGame(
  actorId: string,
  gameId: string,
  exec: Executor = getDb(),
): Promise<AdoptedDesignRow[]> {
  const actor = asActor(actorId);
  return exec
    .select(ADOPTED_COLUMNS)
    .from(cardAdoptions)
    .innerJoin(cardDesigns, eq(cardDesigns.id, cardAdoptions.cardDesignId))
    .innerJoin(users, eq(users.id, cardDesigns.ownerId))
    .where(ownedBy(actor, cardAdoptions.adopterId, eq(cardAdoptions.gameId, gameId)))
    .orderBy(desc(cardAdoptions.createdAt));
}

/**
 * Bulk-resolve adopted designs by card id for the collection serializer's card rider — an equipped
 * ADOPTED design renders from its flattened image (COL-06/CARD-18). Actor-scoped through the grant
 * (SYS-01); flattened columns only (never `composition`).
 */
export async function adoptedDesignsByIds(
  actorId: string,
  cardDesignIds: string[],
  exec: Executor = getDb(),
): Promise<Map<string, AdoptedDesignRow>> {
  if (cardDesignIds.length === 0) return new Map();
  const actor = asActor(actorId);
  const rows = await exec
    .select(ADOPTED_COLUMNS)
    .from(cardAdoptions)
    .innerJoin(cardDesigns, eq(cardDesigns.id, cardAdoptions.cardDesignId))
    .innerJoin(users, eq(users.id, cardDesigns.ownerId))
    .where(ownedBy(actor, cardAdoptions.adopterId, inArray(cardAdoptions.cardDesignId, cardDesignIds)));
  return new Map(rows.map((r) => [r.id, r]));
}
