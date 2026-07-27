import { getDb, type Executor } from '../db/client';
import { asActor, ownedBy } from '../db/scoped';
import { cardAdoptions, cardDesigns, users, type CardAdoptionRow } from '../db/schema';
import { and, desc, eq, inArray, isNotNull, isNull, type SQL } from 'drizzle-orm';

// Adoption repository — `card_adoptions` is USER-OWNED (owner key = adopter_id; NOT on the F32 manifest
// — rule-2 fails closed). A grant is an ACTOR-STAMPED insert (the adopter owns the row), so the create
// is a bare insert (rule-2: a brand-new actor-owned row is not an IDOR vector). The unique
// (adopter, card) index backs `ALREADY_ADOPTED` idempotency (OQ-101) and the F36 parallel-adopt race:
// `onConflictDoNothing` returns the row ONLY when THIS call created it — a null return means already
// adopted, atomically, even under concurrency. The card's public count is derived elsewhere (an
// anonymous cross-user aggregate in card-repo), so the adopter never writes the owner's row.
//
// UN-ADOPT (M5 F-2b, migration 0012): a grant is soft-revoked (`revokedAt` stamped), never hard-deleted
// — the derived adoption count is ALL-TIME (the CARD-14/20 "count unaffected" clause), so the count
// aggregate in card-repo deliberately ignores `revokedAt`. Every ADOPTER-FACING read here is ACTIVE-ONLY
// (`revokedAt IS NULL`): a removed copy vanishes from the switcher / equipped rider / share access.
// Re-adopting REACTIVATES the revoked row (clears the stamp) instead of inserting a duplicate.

/** The active-grant predicate — every adopter-facing read filters to unrevoked rows. */
function activeOnly(extra: SQL): SQL {
  return and(isNull(cardAdoptions.revokedAt), extra) as SQL;
}

/**
 * MOD-08 takedown (M6 P7, decision 0081) — the adopter-facing CARD reads additionally exclude a
 * moderation-hidden design. This is the deliberate EXCEPTION to "adopters keep their card": the spec's
 * MOD-08 row says a moderation/legal pull hides affected cards and they "fall back per the
 * default-card guarantee (CARD-18)" — which is exactly what excluding the row here produces (the
 * equipped rider finds nothing and resolves to the default face). The GRANT itself is untouched (no
 * row revoked, no entitlement clawed back), so a restore brings the adopter's card straight back.
 *
 * Only the three reads that JOIN `card_designs` take this predicate — the grant-only reads
 * (findMyAdoption / revoke / reactivate) must keep working on a taken-down card, or an adopter could
 * neither un-adopt nor re-adopt it.
 */
function visibleDesignOnly(extra: SQL): SQL {
  return and(isNull(cardDesigns.moderationHiddenAt), extra) as SQL;
}

export interface AdoptionInsert {
  cardDesignId: string;
  gameId: string;
  /** PX paid for the card's premium components (decision 0072); 0 on the free path (§1 spike). */
  currencyPaid: number;
}

/**
 * Insert the adoption grant for the caller. Returns the created row, or `null` when a row for this
 * (adopter, card) pair already exists — ACTIVE (the ALREADY_ADOPTED backstop) or REVOKED (the caller
 * must go through `reactivateAdoption` first; the service orders it that way). Actor-stamped bare
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

/** Whether the caller holds an ACTIVE adoption of a card (actor-scoped — SYS-01; revoked = no). */
export async function findMyAdoption(
  actorId: string,
  cardDesignId: string,
  exec: Executor = getDb(),
): Promise<CardAdoptionRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .select()
    .from(cardAdoptions)
    .where(ownedBy(actor, cardAdoptions.adopterId, activeOnly(eq(cardAdoptions.cardDesignId, cardDesignId))))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * UN-ADOPT (M5 F-2b) — soft-revoke the caller's ACTIVE adoption of a card: stamp `revokedAt`, keep the
 * row (the all-time count + the designer's clout are untouched). Actor-scoped through the grant
 * (SYS-01). Returns the revoked row, or null when no active adoption exists (already revoked / never
 * adopted / actor-B — the same nothing).
 */
export async function revokeAdoption(
  actorId: string,
  cardDesignId: string,
  exec: Executor = getDb(),
): Promise<CardAdoptionRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .update(cardAdoptions)
    .set({ revokedAt: new Date() })
    .where(ownedBy(actor, cardAdoptions.adopterId, activeOnly(eq(cardAdoptions.cardDesignId, cardDesignId))))
    .returning();
  return rows[0] ?? null;
}

/**
 * RE-ADOPT (M5 F-2b) — reactivate the caller's REVOKED adoption (clear `revokedAt`). The `IS NOT NULL`
 * guard makes a concurrent double re-adopt transition exactly once (the F36 pattern — the loser's WHERE
 * matches no row → null → the service falls through to the insert path, whose unique-pair conflict
 * refuses it). Returns the reactivated row, or null when no revoked row exists.
 */
export async function reactivateAdoption(
  actorId: string,
  cardDesignId: string,
  exec: Executor = getDb(),
): Promise<CardAdoptionRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .update(cardAdoptions)
    .set({ revokedAt: null })
    .where(
      ownedBy(
        actor,
        cardAdoptions.adopterId,
        and(isNotNull(cardAdoptions.revokedAt), eq(cardAdoptions.cardDesignId, cardDesignId)) as SQL,
      ),
    )
    .returning();
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
  /** DENORMALIZED premium refs (M5 F-9 E2) — feeds the switcher's `components` readout; NOT composition. */
  premiumComponentIds: string[];
  /** DENORMALIZED CARD-22 equipped-readout labels (OQ-146 / 0076 §0.2) — never the composition. */
  equippedLabels: Record<string, string>;
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
  // M5 F-9 E2 — the DENORMALIZED premium refs (never `composition`; the OQ-122 discipline holds).
  premiumComponentIds: cardDesigns.premiumComponentIds,
  // CARD-22 (OQ-146) — the DENORMALIZED equipped labels (never `composition`; OQ-122 holds).
  equippedLabels: cardDesigns.equippedLabels,
  designerId: cardDesigns.ownerId,
  designerUsername: users.username,
} as const;

/**
 * CARD-21 (P9) — the design behind MY OWN ACTIVE adoption grant, regardless of its CURRENT publish
 * status. An adopter keeps their share access after the designer unpublishes (the MOD-08 "flattened
 * card persists" pattern — the grant, not the gallery listing, is what CARD-21 gates on); a REVOKED
 * (un-adopted) grant loses it. Scoped through the adoption row I own (`cardAdoptions.adopterId` —
 * SYS-01); the join to `card_designs` reads only the flattened-image + attribution columns, never the
 * private `composition`.
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
    .where(
      ownedBy(
        actor,
        cardAdoptions.adopterId,
        activeOnly(visibleDesignOnly(eq(cardAdoptions.cardDesignId, cardDesignId))),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * COL-06 — the cards the caller ADOPTED for one game (ACTIVE grants only), newest grant first (the
 * switcher's adopted side). ACTOR-SCOPED through the adoption GRANT (`ownedBy` on `adopterId`, SYS-01)
 * — the grant, not the card's publish status, is the visibility key, so a card the designer later
 * UNPUBLISHES still lists here (CARD-20 adopters-keep), while an UN-ADOPTED (revoked) one does not.
 * The join to the foreign `card_designs`/`users` reads only the flattened-image + attribution columns
 * (`ADOPTED_COLUMNS`) — never the private `composition` (OQ-122/CARD-15).
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
    .where(
      ownedBy(
        actor,
        cardAdoptions.adopterId,
        activeOnly(visibleDesignOnly(eq(cardAdoptions.gameId, gameId))),
      ),
    )
    .orderBy(desc(cardAdoptions.createdAt));
}

/**
 * Bulk-resolve ACTIVELY adopted designs by card id for the collection serializer's card rider — an
 * equipped ADOPTED design renders from its flattened image (COL-06/CARD-18). Actor-scoped through the
 * grant (SYS-01); flattened columns only (never `composition`).
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
    .where(
      ownedBy(
        actor,
        cardAdoptions.adopterId,
        activeOnly(visibleDesignOnly(inArray(cardAdoptions.cardDesignId, cardDesignIds))),
      ),
    );
  return new Map(rows.map((r) => [r.id, r]));
}
