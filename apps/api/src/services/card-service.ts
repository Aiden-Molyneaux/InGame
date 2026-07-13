import {
  compositionHash,
  compositionSchema,
  DEFAULT_CARD_STUB,
  type AdoptResponse,
  type CardDesignView,
  type CollectionCard,
  type Composition,
  type CreateCardRequest,
  type EntryCardsResponse,
  type GalleryCardView,
  type GameGalleryResponse,
  type MyCardsResponse,
  type TrendingCardsResponse,
  type UpdateCardRequest,
} from '@ingame/shared';
import type { Executor } from '../db/client';
import { mutation } from '../db/mutation';
import * as cardRepo from '../repositories/card-repo';
import * as catalogRepo from '../repositories/catalog-repo';
import * as collectionRepo from '../repositories/collection-repo';
import * as adoptionRepo from '../repositories/adoption-repo';
import * as entitlementRepo from '../repositories/entitlement-repo';
import * as relationshipRepo from '../repositories/relationship-repo';
import { acquireComponents } from './cosmetics/cosmetic-service';
import {
  AlreadyAdoptedError,
  CardEquippedError,
  DuplicateCompositionError,
  HasAdoptersError,
  MinComplexityError,
  NotFoundError,
  NotPublishedError,
  PremiumUnreconciledError,
  ValidationError,
} from '../errors/AppError';
import { flattenComposition } from '../render/flatten';
import { getStorage } from '../storage';
import {
  collectCosmeticRefs,
  isPremiumComposition,
  lookupCosmeticTier,
  priceForTier,
} from '../config/cosmetics';
import type { CardDesignRow } from '../db/schema';
import type { PublishedDesignRow } from '../repositories/card-repo';

// M5 P3 — CARD-19 min-complexity floor (decision 0073 §0.7, SYS-04-tunable). Publish requires the
// composition carry ≥ MIN_ELEMENTS elements OR ≥ MIN_DISTINCT_TYPES distinct element types. Drafts /
// private are exempt (the gate fires only at publish). Tunable seeds — not schema.
const MIN_ELEMENTS = 3;
const MIN_DISTINCT_TYPES = 2;

// Card-design service (CARD-14/15/24 · decision 0066). card_designs is USER-OWNED — every path is
// actor-scoped (SYS-01); actor-B reaching for actor-A's design gets the same 404 an unknown id gets.
// M4 posture (0066 §1): save-private VALIDATES + HASHES + derives isPremium — the flatten-to-storage
// runs at PUBLISH (M5); imageUrl/thumbUrl stay null and the owner's surfaces render live.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * CARD-06 — a design is premium iff its composition references any REGISTERED PREMIUM cosmetic id
 * (M5 P4, decision 0072/0073; `config/cosmetics.ts` owns the tier registry). The real per-item roster
 * re-tag is a P10 focused pass — the registry stays empty in production until then, so this is
 * constantly false against real data today; it flips the moment a composition references a registered
 * premium id (fixture-tested at P4; live-tested once P10 seeds the real roster).
 * Coverage note: only `fontId`/`iconId` references are checked — frame/effect/finish/nameplate-shape
 * are `kind`-keyed in the composition schema with no cosmeticId reference yet (see `config/cosmetics.ts`
 * banner); extending coverage to them needs a composition-schema change, not a P4 mechanism change.
 */
function deriveIsPremium(composition: Composition): boolean {
  return isPremiumComposition(composition);
}

/**
 * The `card` rider every owner-facing serializer shares (CARD-18 chain, 0066 §5): the equipped
 * design → else the default-face stub. OWNER-ONLY — `composition` must never ride a cross-user
 * shape (CARD-15 / 0066 §2).
 */
export function toCardRider(design: CardDesignRow | null): CollectionCard {
  if (!design) return { ...DEFAULT_CARD_STUB };
  return {
    id: design.id,
    imageUrl: design.imageUrl, // null until the M5 flatten-to-storage (0066 §1)
    thumbUrl: design.thumbUrl,
    isCustom: true,
    isPremium: design.isPremium,
    name: design.name,
    composition: design.composition, // owner-only (0066 §2)
  };
}

export function toCardView(row: CardDesignRow): CardDesignView {
  return {
    id: row.id,
    gameId: row.gameId,
    name: row.name,
    status: row.status as CardDesignView['status'],
    composition: row.composition as CardDesignView['composition'],
    compositionHash: row.compositionHash,
    imageUrl: row.imageUrl,
    thumbUrl: row.thumbUrl,
    isPremium: row.isPremium,
    derivedFromCardId: row.derivedFromCardId, // CARD-24a copy-on-write origin (decision 0067)
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function designNotFound(): NotFoundError {
  return new NotFoundError('Card design not found.');
}

/** The create-draft result — `reused` drives the controller's 200 (idempotent) vs 201 (created) status. */
export interface CreateDraftResult {
  card: CardDesignView;
  reused: boolean;
}

/**
 * POST /cards (CARD-14/24a) with the OQ-141 copy-POST idempotency guard (decision 0067/0073 §0.10): a
 * repeated copy-POST — the SAME `derivedFromCardId` + an IDENTICAL composition hash by the SAME owner —
 * returns the EXISTING draft copy (200, `reused: true`) instead of minting a second identical draft.
 * The pre-check runs on `getDb()` OUTSIDE the create tx (a plain read); a miss falls through to create.
 */
export async function createDraft(
  actorId: string,
  input: CreateCardRequest,
): Promise<CreateDraftResult> {
  if (input.derivedFromCardId) {
    const hash = compositionHash(input.composition as Composition);
    const existing = await cardRepo.findDraftCopy(actorId, input.derivedFromCardId, hash);
    if (existing) return { card: toCardView(existing), reused: true }; // OQ-141 idempotent
  }
  const card = await createDraftMutation(actorId, input);
  return { card, reused: false };
}

/** @mutation — POST /cards (CARD-14/24a): create the draft document. */
const createDraftMutation = mutation(
  { name: 'card.createDraft', specIds: ['CARD-14', 'CARD-24', 'SYS-01', 'SYS-02'] },
  async (ctx, actorId, input: CreateCardRequest): Promise<CardDesignView> => {
    const [game] = await catalogRepo.gamesByIds([input.gameId], ctx.tx);
    if (!game) {
      throw new ValidationError('That game is not in the catalog.', 'unknown_game', [
        { path: 'gameId', message: 'That game is not in the catalog.' },
      ]);
    }
    // CARD-24a copy-on-write (decision 0067): a draft COPY of a committed card records its origin.
    // Validate the origin is the actor's OWN design for the SAME game (else the copy could claim a
    // stranger's card or cross games — a 422, same as any bad reference; no existence oracle since
    // findOwnedDesign is actor-scoped, so a foreign id reads as "not found").
    let derivedFromCardId: string | null = null;
    if (input.derivedFromCardId) {
      const origin = await cardRepo.findOwnedDesign(actorId, input.derivedFromCardId, ctx.tx);
      if (!origin || origin.gameId !== input.gameId) {
        throw new ValidationError('That source card is not available for this game.', 'invalid_origin', [
          { path: 'derivedFromCardId', message: 'Unknown source card for this game.' },
        ]);
      }
      derivedFromCardId = origin.id;
    }
    const composition = input.composition as Composition;
    const row = await cardRepo.insertDesign(
      actorId,
      {
        gameId: input.gameId,
        name: input.name?.trim() ? input.name : game.name, // CARD-24a default save-target name
        composition: composition as Record<string, unknown>,
        compositionHash: compositionHash(composition),
        isPremium: deriveIsPremium(composition),
        derivedFromCardId,
      },
      ctx.tx,
    );
    await ctx.emit({
      eventType: 'card.draft_created',
      entityRef: { type: 'card_design', id: row.id },
      payload: { gameId: game.id },
    });
    return toCardView(row);
  },
);

/** @mutation — PATCH /cards/:id (CARD-14/24a autosave): draft/private only; published is immutable. */
export const updateCard = mutation(
  { name: 'card.update', specIds: ['CARD-14', 'CARD-20', 'CARD-24', 'SYS-01', 'SYS-02'] },
  async (ctx, actorId, cardId: string, input: UpdateCardRequest): Promise<CardDesignView> => {
    if (!UUID_RE.test(cardId)) throw designNotFound();
    const current = await cardRepo.findOwnedDesign(actorId, cardId, ctx.tx);
    if (!current) throw designNotFound(); // same 404 as unknown id (no existence oracle)
    if (current.status === 'published') {
      // CARD-20 — published cards are immutable; "editing" one = duplicate to a new draft.
      throw new ValidationError('Published cards are immutable.', 'immutable_published');
    }

    const fields: cardRepo.DesignUpdate = {};
    const changed: string[] = [];
    if (input.name !== undefined) {
      fields.name = input.name;
      changed.push('name');
    }
    if (input.composition !== undefined) {
      const composition = input.composition as Composition;
      fields.composition = composition as Record<string, unknown>;
      fields.compositionHash = compositionHash(composition);
      fields.isPremium = deriveIsPremium(composition);
      changed.push('composition');
    }
    if (changed.length === 0) {
      throw new ValidationError('Provide at least one field to update.', 'empty_update');
    }
    const row = (await cardRepo.updateOwnedDesign(actorId, cardId, fields, ctx.tx)) ?? current;
    await ctx.emit({
      eventType: 'card.updated',
      entityRef: { type: 'card_design', id: cardId },
      payload: { fields: changed }, // the changed field-set, never the values (F18)
    });
    return toCardView(row);
  },
);

/**
 * @mutation — POST /cards/:id/save-private (CARD-04 · 0066 §1): draft → private. Validates the
 * stored composition + re-derives hash/isPremium; NO image generation at M4 (flatten rides M5
 * publish). Already-private → idempotent no-op (returns the card).
 */
export const savePrivate = mutation(
  { name: 'card.savePrivate', specIds: ['CARD-04', 'CARD-15', 'SYS-01', 'SYS-02'] },
  async (ctx, actorId, cardId: string): Promise<CardDesignView> => {
    if (!UUID_RE.test(cardId)) throw designNotFound();
    const current = await cardRepo.findOwnedDesign(actorId, cardId, ctx.tx);
    if (!current) throw designNotFound();
    if (current.status === 'private') return toCardView(current); // idempotent
    if (current.status === 'published') {
      throw new ValidationError('Published cards are immutable.', 'immutable_published');
    }
    // Re-parse the stored composition at the transition (defense-in-depth: the row was
    // boundary-validated at write time; F21 — an unknown schemaVersion refuses here).
    const parsed = compositionSchema.safeParse(current.composition);
    if (!parsed.success) {
      throw new ValidationError('This draft cannot be finalized.', 'invalid_composition');
    }
    const composition = parsed.data as Composition;
    // CARD-13 premium-reconcile (decision 0072/0073) — a private save that references premium
    // components the OWNER doesn't own is refused (→ PREMIUM_UNRECONCILED {unowned,total}); the client
    // reconciles via ACQUIRE ALL. Dormant while the roster is all-free.
    await assertPremiumReconciled(actorId, composition, ctx.tx);
    const row =
      (await cardRepo.updateOwnedDesign(
        actorId,
        cardId,
        {
          status: 'private',
          compositionHash: compositionHash(composition),
          isPremium: deriveIsPremium(composition),
        },
        ctx.tx,
      )) ?? current;
    await ctx.emit({
      eventType: 'card.saved_private',
      entityRef: { type: 'card_design', id: cardId },
      payload: {},
    });
    return toCardView(row);
  },
);

/** @mutation — DELETE /cards/:id (CARD-14/20 · decision 0040): 409 CARD_EQUIPPED while equipped;
 *  409 HAS_ADOPTERS on a published-with-adopters design (unpublish instead). */
export const deleteCard = mutation(
  { name: 'card.delete', specIds: ['CARD-14', 'CARD-20', 'COL-06', 'SYS-01'] },
  async (ctx, actorId, cardId: string): Promise<void> => {
    if (!UUID_RE.test(cardId)) throw designNotFound();
    const current = await cardRepo.findOwnedDesign(actorId, cardId, ctx.tx);
    if (!current) throw designNotFound();
    if ((await cardRepo.countEquippedReferences(actorId, cardId, ctx.tx)) > 0) {
      throw new CardEquippedError();
    }
    // CARD-20 (decision 0040) — a published card that HAS adopters refuses deletion (unpublish
    // instead; adopters keep their grants forever). A never-adopted published card may delete.
    // 409 HAS_ADOPTERS — the CONFLICT family, like its sibling CARD_EQUIPPED (F-17 additive; the
    // LOOK_CAP-correction precedent: state-conflict refusals are 409 named codes, 422 is zod-only).
    if (current.status === 'published') {
      const counts = await cardRepo.adoptionCountsByCard([cardId], ctx.tx);
      if ((counts.get(cardId) ?? 0) > 0) {
        throw new HasAdoptersError();
      }
    }
    const removed = await cardRepo.deleteOwnedDesign(actorId, cardId, ctx.tx);
    if (!removed) throw designNotFound();
    await ctx.emit({
      eventType: 'card.deleted',
      entityRef: { type: 'card_design', id: cardId },
      payload: {},
    });
  },
);

/** GET /me/cards — the CARD-14 My Designs shelf (all games, all statuses, newest first). */
export async function listMyCards(actorId: string): Promise<MyCardsResponse> {
  const rows = await cardRepo.listOwnedDesigns(actorId);
  return { items: rows.map(toCardView) };
}

/** GET /me/collection/:entryId/cards — the COL-06 switcher feed (own entry → its game's designs). */
export async function listCardsForEntry(
  actorId: string,
  entryId: string,
): Promise<EntryCardsResponse> {
  if (!UUID_RE.test(entryId)) throw new NotFoundError('Collection entry not found.');
  const entry = await collectionRepo.findOwnedEntry(actorId, entryId);
  if (!entry) throw new NotFoundError('Collection entry not found.'); // actor-B → the same 404
  const rows = await cardRepo.listOwnedDesignsForGame(actorId, entry.gameId);
  return { items: rows.map(toCardView) };
}

// ── M5 §1 publish thread (publish → gallery → adopt) ─────────────────────────────────────────────────
// The de-risk spike (decision 0073): prove the full thread in the API runtime. HAPPY-PATH ONLY — the
// CARD-19 gates (min-complexity, hash-dedup), rate limits, unpublish, and the premium debit path are
// P3's. The two reusable yields are the render + storage modules; the OQ-122 guard mechanics are P3's
// foundation.

/**
 * The premium cosmetic ids a composition references that fall in a PREMIUM tier (decision 0072). The
 * denormalized `premium_component_ids` stored at publish; also the CARD-13 reconcile input.
 */
function premiumRefsOf(composition: unknown): string[] {
  const refs = collectCosmeticRefs(composition);
  return [...new Set(refs)].filter((id) => {
    const tier = lookupCosmeticTier(id);
    return tier !== undefined && tier !== null;
  });
}

/**
 * CARD-19 min-complexity gate (decision 0073 §0.7) — the composition must clear the publish floor:
 * ≥ MIN_ELEMENTS elements OR ≥ MIN_DISTINCT_TYPES distinct element types. Refuses below with
 * MIN_COMPLEXITY. Drafts/private never reach this (the gate fires only at publish).
 */
function assertMinComplexity(composition: Composition): void {
  const elements = Array.isArray(composition.elements) ? composition.elements : [];
  const distinctTypes = new Set(elements.map((el) => (el as { type?: string }).type)).size;
  if (elements.length < MIN_ELEMENTS && distinctTypes < MIN_DISTINCT_TYPES) {
    throw new MinComplexityError();
  }
}

/**
 * CARD-13 premium-reconcile gate (decision 0072/0073) — refuses publish/save-private when the
 * composition references premium components the OWNER doesn't own, carrying the unowned set + total so
 * the client drives ACQUIRE ALL. Dormant while the roster is all-free (no premium refs → a no-op).
 * Runs the entitlement read on `exec` so it shares the caller's transaction when one is open.
 */
async function assertPremiumReconciled(
  actorId: string,
  composition: unknown,
  exec?: Executor,
): Promise<string[]> {
  const premiumIds = premiumRefsOf(composition);
  if (premiumIds.length === 0) return [];
  const owned = await entitlementRepo.findOwnedCosmeticIds(actorId, premiumIds, exec);
  const unowned = premiumIds
    .filter((id) => !owned.has(id))
    .map((id) => ({ cosmeticId: id, price: priceForTier(lookupCosmeticTier(id)) }));
  if (unowned.length > 0) throw new PremiumUnreconciledError(unowned);
  return premiumIds;
}

/**
 * Build the personalized community-gallery view (decision 0072): `priceForYou` = the summed PX of the
 * card's premium components the CALLER (`ownedByCaller`) does NOT own — 0 for a free card or one fully
 * owned. NEVER carries `composition` (OQ-122 — the flattened image is the public artifact, 0066 §2).
 */
function toGalleryShape(
  row: PublishedDesignRow,
  adoptionCount: number,
  ownedByCaller: Set<string>,
): GalleryCardView {
  const priceForYou = row.premiumComponentIds
    .filter((id) => !ownedByCaller.has(id))
    .reduce((sum, id) => sum + priceForTier(lookupCosmeticTier(id)), 0);
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.imageUrl,
    thumbUrl: row.thumbUrl,
    isPremium: row.isPremium,
    adoptionCount,
    priceForYou,
    designer: { userId: row.designerId, username: row.designerUsername },
  };
}

/**
 * @mutation — POST /cards/:id/publish (CARD-13/15/19/20). Gates in order: min-complexity → global
 * hash-dedup → premium-reconcile. Then the flatten runs OUTSIDE the transaction (it must not hold the
 * row lock during the ~ms render — the spike's flag); the tx re-validates (status still not published,
 * still no dedup) + writes `status='published'` + urls + the denormalized premium refs. On tx failure
 * the stored PNGs are deleted best-effort. Already-published is an idempotent no-op.
 *
 * The gate reads + flatten run pre-tx on `getDb()` (no lock held). The write + its re-checks run in the
 * mutation tx. The published card is immutable thereafter (PATCH refuses — CARD-20).
 */
export async function publishCard(actorId: string, cardId: string): Promise<CardDesignView> {
  if (!UUID_RE.test(cardId)) throw designNotFound();
  const current = await cardRepo.findOwnedDesign(actorId, cardId);
  if (!current) throw designNotFound(); // actor-B → the same 404 (no existence oracle)
  if (current.status === 'published') return toCardView(current); // idempotent

  const parsed = compositionSchema.safeParse(current.composition);
  if (!parsed.success) throw new ValidationError('This card cannot be published.', 'invalid_composition');
  const composition = parsed.data as Composition;

  // ── Gates (pre-tx, fail fast BEFORE the render) ──────────────────────────────────────────────────
  assertMinComplexity(composition); // 1. CARD-19 min-complexity → MIN_COMPLEXITY
  if (await cardRepo.hasPublishedDuplicate(current.compositionHash, cardId)) {
    throw new DuplicateCompositionError(); // 2. CARD-19 global hash-dedup → DUPLICATE_COMPOSITION (no leak)
  }
  const premiumIds = await assertPremiumReconciled(actorId, composition); // 3. CARD-13 (pre-tx read)

  // ── Flatten OUTSIDE the tx (the spike's flag), then store the full + thumb PNGs ───────────────────
  const { full, thumb } = await flattenComposition(current.composition);
  const storage = getStorage();
  const fullKey = `cards/${cardId}/full.png`;
  const thumbKey = `cards/${cardId}/thumb.png`;
  const imageUrl = await storage.put(fullKey, full, 'image/png');
  const thumbUrl = await storage.put(thumbKey, thumb, 'image/png');

  // ── The publish write (tx: re-validate the race-sensitive gates + write) ─────────────────────────
  try {
    return await publishWrite(actorId, cardId, {
      imageUrl,
      thumbUrl,
      premiumComponentIds: premiumIds,
      compositionHash: current.compositionHash,
    });
  } catch (err) {
    // Best-effort cleanup of the orphaned renders (the row never transitioned).
    await storage.delete(fullKey).catch(() => {});
    await storage.delete(thumbKey).catch(() => {});
    throw err;
  }
}

const publishWrite = mutation(
  { name: 'card.publish', specIds: ['CARD-13', 'CARD-15', 'CARD-19', 'CARD-20', 'SYS-01'] },
  async (
    ctx,
    actorId,
    cardId: string,
    fields: {
      imageUrl: string;
      thumbUrl: string;
      premiumComponentIds: string[];
      compositionHash: string;
    },
  ): Promise<CardDesignView> => {
    // Re-check the dedup under the write (a concurrent identical publish could have landed between the
    // pre-tx gate and here) — global exact-match refuse (CARD-19), same 409, no leak.
    if (await cardRepo.hasPublishedDuplicate(fields.compositionHash, cardId, ctx.tx)) {
      throw new DuplicateCompositionError();
    }
    // markPublished is guarded to a non-published status — null ⇒ actor-B / already-published / raced.
    const row = await cardRepo.markPublished(
      actorId,
      cardId,
      {
        imageUrl: fields.imageUrl,
        thumbUrl: fields.thumbUrl,
        premiumComponentIds: fields.premiumComponentIds,
      },
      ctx.tx,
    );
    if (!row) throw designNotFound();
    await ctx.emit({
      eventType: 'card.published',
      entityRef: { type: 'card_design', id: cardId },
      payload: { gameId: row.gameId },
    });
    return toCardView(row);
  },
);

/**
 * @mutation — POST /cards/:id/unpublish (CARD-20): the owner delists their OWN published card
 * (status → private). Existing adopters keep their grants + entitlements (nothing revoked); the
 * derived adoption count freezes (no new adoptions are possible once it leaves the gallery). Not the
 * actor's published card → the same 404 (no existence oracle).
 */
export const unpublishCard = mutation(
  { name: 'card.unpublish', specIds: ['CARD-20', 'SYS-01'] },
  async (ctx, actorId, cardId: string): Promise<CardDesignView> => {
    if (!UUID_RE.test(cardId)) throw designNotFound();
    const row = await cardRepo.markUnpublished(actorId, cardId, ctx.tx);
    if (!row) throw designNotFound(); // not owned / not published → the same nothing
    await ctx.emit({
      eventType: 'card.unpublished',
      entityRef: { type: 'card_design', id: cardId },
      payload: { gameId: row.gameId },
    });
    return toCardView(row);
  },
);

/**
 * GET /games/:gameId/cards — the community gallery: PUBLISHED cards only, flattened + attributed +
 * PERSONALIZED prices (decision 0072). Block-filtered BOTH directions (SOC-09 §0.6): a card whose
 * designer is blocked either-way with the caller vanishes from the caller's gallery. `priceForYou` is
 * the caller's missing-components sum per card.
 */
export async function listGameGallery(
  actorId: string,
  gameId: string,
): Promise<GameGalleryResponse> {
  if (!UUID_RE.test(gameId)) throw new NotFoundError('Game not found.');
  const rows = await cardRepo.listPublishedDesignsForGame(gameId);
  const visible = await filterBlockedDesigners(actorId, rows);
  const counts = await cardRepo.adoptionCountsByCard(visible.map((r) => r.id));
  const owned = await ownedPremiumFor(actorId, visible.flatMap((r) => r.premiumComponentIds));
  return {
    items: visible.map((r) => toGalleryShape(r, counts.get(r.id) ?? 0, owned)),
  };
}

/**
 * GET /discover/trending-cards (DISC-04/OQ-055) — the top published cards by adoption count, block-
 * filtered per the caller (SOC-09). NON-COMMERCE: counts, never prices (no personalized pricing).
 */
export async function listTrendingCards(
  actorId: string,
  limit = 20,
): Promise<TrendingCardsResponse> {
  const rows = await cardRepo.listPublishedForTrending();
  const visible = await filterBlockedDesigners(actorId, rows);
  const counts = await cardRepo.adoptionCountsByCard(visible.map((r) => r.id));
  const ranked = visible
    .map((r) => ({ row: r, adoptionCount: counts.get(r.id) ?? 0 }))
    .sort((a, b) => b.adoptionCount - a.adoptionCount || a.row.id.localeCompare(b.row.id))
    .slice(0, limit);
  return {
    items: ranked.map(({ row, adoptionCount }, i) => ({
      rank: i + 1,
      card: {
        id: row.id,
        name: row.name,
        imageUrl: row.imageUrl,
        thumbUrl: row.thumbUrl,
        isPremium: row.isPremium,
      },
      game: { id: row.gameId, title: row.gameTitle },
      designer: { userId: row.designerId, username: row.designerUsername },
      adoptionCount,
    })),
  };
}

/** SOC-09 §0.6 — drop rows whose designer is blocked either-direction with the caller (both ways). */
async function filterBlockedDesigners<T extends { designerId: string }>(
  actorId: string,
  rows: T[],
): Promise<T[]> {
  const designerIds = [...new Set(rows.map((r) => r.designerId))];
  const blocked = await relationshipRepo.listBlockedIds(actorId, designerIds);
  return blocked.size === 0 ? rows : rows.filter((r) => !blocked.has(r.designerId));
}

/** The subset of `premiumIds` the caller already owns (account-wide entitlements) — batched. */
async function ownedPremiumFor(actorId: string, premiumIds: string[]): Promise<Set<string>> {
  const unique = [...new Set(premiumIds)];
  if (unique.length === 0) return new Set();
  return entitlementRepo.findOwnedCosmeticIds(actorId, unique);
}

/**
 * @mutation — POST /cards/:id/adopt (CARD-04/05 · decision 0072). ONE transaction: atomic acquire of
 * the card's premium components the adopter doesn't own (debit = missing sum via P1's ledger + per-
 * component account-wide entitlements via P4's `acquireComponents`, run inside THIS tx) + the free
 * design grant (`card_adoptions` row, `currencyPaid` = the acquired sum) + the derived adoption count.
 * FREE when the card has no premium components or the caller owns them all.
 *  - `NOT_PUBLISHED` — unknown / not-published / a blocked designer (INDISTINGUISHABLE, MOD-09).
 *  - `ALREADY_ADOPTED` — the unique-pair backstop (idempotent under the F36 race; the acquire rolls
 *    back with the tx so a raced loser is NEVER charged).
 *  - `INSUFFICIENT_BALANCE {shortBy}` — the acquire can't cover the missing-components sum.
 */
export const adoptCard = mutation(
  { name: 'card.adopt', specIds: ['CARD-04', 'CARD-05', 'ECON-03', 'ECON-04', 'SYS-01'] },
  async (ctx, actorId, cardId: string): Promise<AdoptResponse> => {
    if (!UUID_RE.test(cardId)) throw new NotPublishedError();
    const published = await cardRepo.findPublishedDesignById(cardId, ctx.tx);
    if (!published) throw new NotPublishedError(); // unknown OR not-published → the same 409
    // SOC-09 §0.6 — a block either direction refuses INDISTINGUISHABLY from not-published (MOD-09).
    if (await relationshipRepo.isBlockedBetween(actorId, published.designerId, ctx.tx)) {
      throw new NotPublishedError();
    }
    // Cheap pre-check: refuse a repeat BEFORE the acquire debits (so an already-adopted retry never
    // charges). The insert below is the atomic F36 backstop against the pre-check→insert race.
    if (await adoptionRepo.findMyAdoption(actorId, cardId, ctx.tx)) throw new AlreadyAdoptedError();

    // Atomic component acquire INSIDE this tx (decision 0072 — the P4 reuse point; never opens its own
    // tx). Free when premiumComponentIds is empty or all owned; else debits the missing sum + grants.
    const acquire = await acquireComponents(ctx.tx, actorId, published.premiumComponentIds);

    const adoption = await adoptionRepo.insertAdoption(
      actorId,
      { cardDesignId: cardId, gameId: published.gameId, currencyPaid: acquire.totalPaid },
      ctx.tx,
    );
    // The unique-pair conflict (a parallel adopt won the race) → refuse; the tx rolls back, undoing the
    // acquire debit + entitlement grants, so the loser is left exactly as it started (one row, one charge).
    if (!adoption) throw new AlreadyAdoptedError();

    await ctx.emit({
      eventType: 'card.adopted',
      entityRef: { type: 'card_design', id: cardId },
      payload: { gameId: published.gameId, currencyPaid: acquire.totalPaid },
    });
    return {
      granted: acquire.granted.map((g) => ({ cosmeticId: g.cosmeticId, paid: g.paid })),
      totalPaid: acquire.totalPaid,
      balance: acquire.balance,
    };
  },
);
