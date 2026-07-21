import { and, asc, count, desc, eq, inArray, isNotNull, ne, notInArray, type SQL } from 'drizzle-orm';
import { getDb, type Executor } from '../db/client';
import { asActor, ownedBy } from '../db/scoped';
import {
  cardAdoptions,
  cardDesigns,
  collectionEntries,
  games,
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
  /** The DENORMALIZED premium component ids (decision 0072) — feeds personalized pricing + adopt. */
  premiumComponentIds: string[];
  /** The DENORMALIZED CARD-22 equipped-readout labels (OQ-146 / 0076 §0.2) — never the composition. */
  equippedLabels: Record<string, string>;
  designerId: string;
  designerUsername: string;
}

/**
 * The public columns every gallery read selects — no `composition`, no owner-private fields.
 * `premiumComponentIds` is the denormalized premium-refs list (NOT the composition): it feeds the
 * personalized `priceForYou` + the adopt component-acquire, so no cross-user composition read is ever
 * needed (the OQ-122 composition-exclusion guarantee — enforced by the serializer + the rule-02 lint).
 */
const PUBLIC_COLUMNS = {
  id: cardDesigns.id,
  gameId: cardDesigns.gameId,
  name: cardDesigns.name,
  imageUrl: cardDesigns.imageUrl,
  thumbUrl: cardDesigns.thumbUrl,
  isPremium: cardDesigns.isPremium,
  premiumComponentIds: cardDesigns.premiumComponentIds,
  equippedLabels: cardDesigns.equippedLabels, // CARD-22 denormalized labels (OQ-146; never composition)
  designerId: users.id,
  designerUsername: users.username,
} as const;

/** The gallery read options (api-contract 0.81) — all optional so the bare call keeps the pre-0.81
 *  behavior (full set, newest first). `excludeDesignerIds` pushes the SOC-09 block-filter INTO the
 *  query so a paged slice is never post-filtered short. */
export interface GalleryListOptions {
  /** `top` = adoption count (the SQL LEFT-JOIN rank below) · `new` (default) = recency. */
  sort?: 'top' | 'new';
  /** Page size; absent = the whole set (the pre-0.81 read). */
  limit?: number;
  /** Offset (decoded from the opaque cursor); ignored without meaning when 0. */
  offset?: number;
  /** SOC-09 §0.6 — designers blocked either-way with the caller, excluded in SQL. */
  excludeDesignerIds?: string[];
}

/** A gallery row + its public adoption count (ridden out of the ranking join — one query, no N+1). */
export type RankedPublishedDesignRow = PublishedDesignRow & { adoptionCount: number };

/**
 * GET /games/:gameId/cards — the community gallery: PUBLISHED cards for one game. 0.81: the adoption
 * count rides a LEFT JOIN to a grouped `card_adoptions` subquery, so `sort=top` RANKS IN SQL (never
 * in memory — the trending docstring's "would be ideal" join, built). Postgres sorts NULL as LARGER
 * than any value (DESC = NULLS FIRST), so a bare `desc(count)` would rank never-adopted cards (no
 * tally row) FIRST — and a raw-SQL `coalesce`/`NULLS LAST` is banned in repos (rule-02 fails it
 * closed). The fix is a leading has-tally boolean key: `desc(isNotNull(tally))` puts adopted cards
 * (true) ahead, the count ranks within them, and the all-NULL trailing group falls through to the id
 * tiebreak (asc — the trending tiebreak). The default `new` sort keeps the pre-0.81 newest-first
 * order (id asc tiebreak added for stable paging).
 */
export async function listPublishedDesignsForGame(
  gameId: string,
  opts: GalleryListOptions = {},
  exec: Executor = getDb(),
): Promise<RankedPublishedDesignRow[]> {
  const { sort = 'new', limit, offset = 0, excludeDesignerIds = [] } = opts;
  // SYS-01-COMMUNITY-AGGREGATE — an anonymous cross-user COUNT per card (the public AdoptCount,
  // decision 0072/0024): a grouped tally over `card_adoptions`, never a row read, never an adopter id.
  const adoptionTally = exec
    .select({
      cardDesignId: cardAdoptions.cardDesignId,
      adoptions: count().as('adoptions'),
    })
    .from(cardAdoptions)
    .groupBy(cardAdoptions.cardDesignId)
    .as('adoption_tally');
  const order =
    sort === 'top'
      ? [
          desc(isNotNull(adoptionTally.cardDesignId)), // has-a-tally first (PG DESC is NULLS FIRST — see above)
          desc(adoptionTally.adoptions),
          asc(cardDesigns.id),
        ]
      : [desc(cardDesigns.updatedAt), asc(cardDesigns.id)];
  // SYS-01-PUBLIC-READ — cross-user gallery: published cards only, flattened image urls, never composition.
  const base = exec
    .select({ ...PUBLIC_COLUMNS, adoptionCount: adoptionTally.adoptions })
    .from(cardDesigns)
    .innerJoin(users, eq(users.id, cardDesigns.ownerId))
    .leftJoin(adoptionTally, eq(adoptionTally.cardDesignId, cardDesigns.id))
    .where(
      publishedOnly(
        excludeDesignerIds.length > 0
          ? (and(
              eq(cardDesigns.gameId, gameId),
              notInArray(cardDesigns.ownerId, excludeDesignerIds),
            ) as SQL)
          : eq(cardDesigns.gameId, gameId),
      ),
    )
    .orderBy(...order)
    .offset(offset);
  const rows = await (limit != null ? base.limit(limit) : base);
  // The LEFT JOIN reads NULL (not 0) for a never-adopted card; count() itself arrives as a bigint.
  return rows.map((r) => ({ ...r, adoptionCount: Number(r.adoptionCount ?? 0) }));
}

/**
 * The caller-visible gallery size for one game (block-filtered like the list read) — feeds `total`
 * + the `nextCursor` computation (api-contract 0.81). Same predicates as the list, COUNT only.
 */
export async function countPublishedDesignsForGame(
  gameId: string,
  excludeDesignerIds: string[] = [],
  exec: Executor = getDb(),
): Promise<number> {
  // SYS-01-PUBLIC-READ — cross-user gallery COUNT: published-only predicate, no row payload at all.
  const rows = await exec
    .select({ n: count() })
    .from(cardDesigns)
    .where(
      publishedOnly(
        excludeDesignerIds.length > 0
          ? (and(
              eq(cardDesigns.gameId, gameId),
              notInArray(cardDesigns.ownerId, excludeDesignerIds),
            ) as SQL)
          : eq(cardDesigns.gameId, gameId),
      ),
    );
  return Number(rows[0]?.n ?? 0);
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

/** A thin FLATTENED card peek (id + flattened urls) — the SOC-05 rec / SOC-06 feed card, never composition. */
export interface PublicCardPeek {
  id: string;
  gameId: string;
  imageUrl: string | null;
  thumbUrl: string | null;
}

/**
 * M6 P4 (SOC-06) — resolve a SET of PUBLISHED cards by id → flattened peeks (the feed's `published_card`
 * object refs). Published-only (a card later unpublished simply drops out — never a private composition).
 * Batch-wise, flattened only.
 */
export async function publishedPeeksByIds(
  cardIds: string[],
  exec: Executor = getDb(),
): Promise<Map<string, PublicCardPeek>> {
  if (cardIds.length === 0) return new Map();
  // SYS-01-PUBLIC-READ — cross-user feed peek: published cards only, flattened urls, never composition.
  const rows = await exec
    .select({
      id: cardDesigns.id,
      gameId: cardDesigns.gameId,
      imageUrl: cardDesigns.imageUrl,
      thumbUrl: cardDesigns.thumbUrl,
    })
    .from(cardDesigns)
    .where(publishedOnly(inArray(cardDesigns.id, cardIds)));
  return new Map(rows.map((r) => [r.id, r]));
}

/**
 * M6 P4 (SOC-05) — a REPRESENTATIVE published card per game → the rec inbox's `game.card` peek (CARD-07/18:
 * a card always resolves). The NEWEST published card for each game (updatedAt desc) is a stable, cheap
 * pick that needs no adoption-count join; a game with no published cards is simply absent from the map
 * (the service falls back to the DEFAULT face). Flattened urls only, never composition.
 */
export async function representativeCardsByGames(
  gameIds: string[],
  exec: Executor = getDb(),
): Promise<Map<string, PublicCardPeek>> {
  if (gameIds.length === 0) return new Map();
  // SYS-01-PUBLIC-READ — cross-user rep card: published cards only, flattened urls, never composition.
  const rows = await exec
    .select({
      id: cardDesigns.id,
      gameId: cardDesigns.gameId,
      imageUrl: cardDesigns.imageUrl,
      thumbUrl: cardDesigns.thumbUrl,
    })
    .from(cardDesigns)
    .where(publishedOnly(inArray(cardDesigns.gameId, gameIds)))
    .orderBy(desc(cardDesigns.updatedAt));
  // First row per game wins (newest, given the desc order) — a stable representative peek.
  const byGame = new Map<string, PublicCardPeek>();
  for (const r of rows) if (!byGame.has(r.gameId)) byGame.set(r.gameId, r);
  return byGame;
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

/**
 * F-4 ledger honesty — the card NAME + DESIGNER USERNAME for a batch of card-design ids (an `adoption`
 * ledger row keys off `refId = cardDesignId`). ATTRIBUTION columns only (`name` + the owner's public
 * `username`) — never `composition` (the OQ-122 exclusion holds; the ledger only needs the board's
 * "ADOPTED '«name»' BY «username»" phrase). A cross-user read of PUBLIC attribution, gated to PUBLISHED
 * cards (the SYS-01-PUBLIC-READ class, OQ-122): a card later unpublished degrades to the generic ledger
 * label (never names a now-private card). Flattened-safe; a missing/unpublished id simply drops out (the
 * detail degrades — never a 500). One batched join, no N+1.
 */
export async function designNamesByIds(
  cardIds: string[],
  exec: Executor = getDb(),
): Promise<Map<string, { name: string; designerUsername: string }>> {
  if (cardIds.length === 0) return new Map();
  // SYS-01-PUBLIC-READ — cross-user PUBLIC attribution (name + designer handle), 'published'-gated,
  // never selects composition (OQ-122/CARD-15). Reads-only.
  const rows = await exec
    .select({ id: cardDesigns.id, name: cardDesigns.name, username: users.username })
    .from(cardDesigns)
    .innerJoin(users, eq(users.id, cardDesigns.ownerId))
    .where(and(inArray(cardDesigns.id, cardIds), eq(cardDesigns.status, 'published')));
  return new Map(rows.map((r) => [r.id, { name: r.name, designerUsername: r.username }]));
}

/**
 * The publish-transition write (the owner's OWN publish): flip status → published, set the flattened
 * urls + the denormalized premium component ids. Scoped to the actor AND guarded to a non-published
 * status (`ne` published) so a concurrent double-publish transitions exactly once — the loser's WHERE
 * matches no row and returns null (the caller treats null as "already published / raced", CARD-20).
 */
export async function markPublished(
  actorId: string,
  designId: string,
  fields: {
    imageUrl: string;
    thumbUrl: string;
    premiumComponentIds: string[];
    equippedLabels: Record<string, string>;
  },
  exec: Executor = getDb(),
): Promise<CardDesignRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .update(cardDesigns)
    .set({
      status: 'published',
      imageUrl: fields.imageUrl,
      thumbUrl: fields.thumbUrl,
      premiumComponentIds: fields.premiumComponentIds,
      equippedLabels: fields.equippedLabels, // CARD-22 label snapshot (OQ-146 / 0076 §0.2)
      updatedAt: new Date(),
    })
    .where(
      ownedBy(
        actor,
        cardDesigns.ownerId,
        and(eq(cardDesigns.id, designId), ne(cardDesigns.status, 'published')),
      ),
    )
    .returning();
  return rows[0] ?? null;
}

/** CARD-20 unpublish — the owner delists their OWN published card (status → private). Adopters keep
 *  their grants (a separate table); the card just leaves the gallery. Returns null if not the actor's
 *  published card (actor-B / not-published → the same nothing). */
export async function markUnpublished(
  actorId: string,
  designId: string,
  exec: Executor = getDb(),
): Promise<CardDesignRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .update(cardDesigns)
    .set({ status: 'private', updatedAt: new Date() })
    .where(
      ownedBy(
        actor,
        cardDesigns.ownerId,
        and(eq(cardDesigns.id, designId), eq(cardDesigns.status, 'published')),
      ),
    )
    .returning();
  return rows[0] ?? null;
}

/**
 * CARD-19 global hash-dedup (decision 0073 §0.7 — global exact-match refuse). True iff ANOTHER
 * PUBLISHED card carries `hash` (any owner, excluding `selfId` so re-publishing your own card / an
 * idempotent republish never self-collides). An anonymous cross-published aggregate — never a row read,
 * never a composition read: `count()` over the published set with the visibility predicate.
 */
export async function hasPublishedDuplicate(
  hash: string,
  selfId: string,
  exec: Executor = getDb(),
): Promise<boolean> {
  // SYS-01-PUBLIC-READ — cross-published dedup: published cards only, a COUNT (never composition, never
  // a row) over the global published set; the visibility predicate (status='published') is required.
  const rows = await exec
    .select({ n: count() })
    .from(cardDesigns)
    .where(
      and(
        eq(cardDesigns.status, 'published'),
        eq(cardDesigns.compositionHash, hash),
        ne(cardDesigns.id, selfId),
      ),
    );
  return Number(rows[0]?.n ?? 0) > 0;
}

/**
 * OQ-141 — the copy-on-write idempotency probe (decision 0067/0073 §0.10). The actor's EXISTING draft
 * COPY for a given origin + identical composition hash, or null. A repeat copy-POST returns this row
 * instead of creating a second identical draft. Actor-scoped (SYS-01).
 */
export async function findDraftCopy(
  actorId: string,
  derivedFromCardId: string,
  compositionHash: string,
  exec: Executor = getDb(),
): Promise<CardDesignRow | null> {
  const actor = asActor(actorId);
  const rows = await exec
    .select()
    .from(cardDesigns)
    .where(
      ownedBy(
        actor,
        cardDesigns.ownerId,
        and(
          eq(cardDesigns.status, 'draft'),
          eq(cardDesigns.derivedFromCardId, derivedFromCardId),
          eq(cardDesigns.compositionHash, compositionHash),
        ),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** One trending-gallery row — a published card with its game title + designer (OQ-055; no composition). */
export interface TrendingDesignRow {
  id: string;
  name: string;
  imageUrl: string | null;
  thumbUrl: string | null;
  isPremium: boolean;
  gameId: string;
  gameTitle: string;
  designerId: string;
  designerUsername: string;
}

/**
 * GET /discover/trending-cards (DISC-04/OQ-055) — the top published cards by adoption count. A LEFT
 * JOIN to an adoption-count subquery would be ideal; the personal-scale reading here fetches the
 * published set (bounded) + the service ranks by the `adoptionCountsByCard` aggregate. Published only.
 */
export async function listPublishedForTrending(
  exec: Executor = getDb(),
): Promise<TrendingDesignRow[]> {
  // SYS-01-PUBLIC-READ — cross-user trending: published cards only, flattened urls + attribution, never
  // composition. Joined to the GLOBAL games catalog for the title; the visibility predicate is required.
  return exec
    .select({
      id: cardDesigns.id,
      name: cardDesigns.name,
      imageUrl: cardDesigns.imageUrl,
      thumbUrl: cardDesigns.thumbUrl,
      isPremium: cardDesigns.isPremium,
      gameId: cardDesigns.gameId,
      gameTitle: games.name,
      designerId: users.id,
      designerUsername: users.username,
    })
    .from(cardDesigns)
    .innerJoin(users, eq(users.id, cardDesigns.ownerId))
    .innerJoin(games, eq(games.id, cardDesigns.gameId))
    .where(eq(cardDesigns.status, 'published'))
    .orderBy(desc(cardDesigns.updatedAt));
}

// ── CAT-07 contributor aggregates (M5 P3 goes-live — GET /users/:id/contributions) ─────────────────

/** The target's PUBLISHED design count (public creations; never their private/draft count). CAT-07. */
export async function countPublishedByOwner(
  ownerId: string,
  exec: Executor = getDb(),
): Promise<number> {
  const actor = asActor(ownerId);
  const rows = await exec
    .select({ n: count() })
    .from(cardDesigns)
    .where(ownedBy(actor, cardDesigns.ownerId, eq(cardDesigns.status, 'published')));
  return Number(rows[0]?.n ?? 0);
}

/**
 * The LIFETIME adoptions across ALL of the target's cards (CARD-05 / ECON-05 clout). An anonymous
 * cross-user aggregate: `count()` over `card_adoptions` joined to the target's designs. Deliberately
 * status-agnostic — a creator EARNS the adoption on every path (decision 0072), so unpublishing does
 * NOT erase clout already earned (the adopters keep their copies; CARD-20).
 */
export async function totalAdoptionsForOwner(
  ownerId: string,
  exec: Executor = getDb(),
): Promise<number> {
  // SYS-01-COMMUNITY-AGGREGATE — an anonymous COUNT of adoptions of the target's cards; the adopter
  // identities are never read (a pure aggregate over the count).
  const rows = await exec
    .select({ n: count() })
    .from(cardAdoptions)
    .innerJoin(cardDesigns, eq(cardDesigns.id, cardAdoptions.cardDesignId))
    .where(eq(cardDesigns.ownerId, ownerId));
  return Number(rows[0]?.n ?? 0);
}

/** The target's published cards + game titles (for signatureCard/topCards; ranked by the service). CAT-07. */
export async function listPublishedByOwner(
  ownerId: string,
  exec: Executor = getDb(),
): Promise<Array<TrendingDesignRow>> {
  const actor = asActor(ownerId);
  return exec
    .select({
      id: cardDesigns.id,
      name: cardDesigns.name,
      imageUrl: cardDesigns.imageUrl,
      thumbUrl: cardDesigns.thumbUrl,
      isPremium: cardDesigns.isPremium,
      gameId: cardDesigns.gameId,
      gameTitle: games.name,
      designerId: users.id,
      designerUsername: users.username,
    })
    .from(cardDesigns)
    .innerJoin(users, eq(users.id, cardDesigns.ownerId))
    .innerJoin(games, eq(games.id, cardDesigns.gameId))
    .where(ownedBy(actor, cardDesigns.ownerId, eq(cardDesigns.status, 'published')));
}
