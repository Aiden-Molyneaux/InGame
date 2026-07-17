import {
  compositionHash,
  compositionSchema,
  DEFAULT_CARD_STUB,
  type CardDesignView,
  type CollectionCard,
  type Composition,
  type CreateCardRequest,
  type EntryCardsResponse,
  type MyCardsResponse,
  type UpdateCardRequest,
} from '@ingame/shared';
import { mutation } from '../db/mutation';
import * as cardRepo from '../repositories/card-repo';
import * as catalogRepo from '../repositories/catalog-repo';
import * as collectionRepo from '../repositories/collection-repo';
import { CardEquippedError, NotFoundError, ValidationError } from '../errors/AppError';
import type { CardDesignRow } from '../db/schema';

// Card-design service (CARD-14/15/24 · decision 0066). card_designs is USER-OWNED — every path is
// actor-scoped (SYS-01); actor-B reaching for actor-A's design gets the same 404 an unknown id gets.
// M4 posture (0066 §1): save-private VALIDATES + HASHES + derives isPremium — the flatten-to-storage
// runs at PUBLISH (M5); imageUrl/thumbUrl stay null and the owner's surfaces render live.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * CARD-06 — a design is premium iff its composition includes any premium asset/effect/finish. The M4
 * roster is the FREE baseline only (COSM-02/0063), so this is constantly false; the real derivation
 * (closed attributes vs the premium roster) lands with the M5 economy.
 */
function deriveIsPremium(_composition: Composition): boolean {
  return false;
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

/** @mutation — POST /cards (CARD-14/24a): create the draft document. */
export const createDraft = mutation(
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

/** @mutation — DELETE /cards/:id (CARD-14 · decision 0040): 409 CARD_EQUIPPED while equipped. */
export const deleteCard = mutation(
  { name: 'card.delete', specIds: ['CARD-14', 'COL-06', 'SYS-01'] },
  async (ctx, actorId, cardId: string): Promise<void> => {
    if (!UUID_RE.test(cardId)) throw designNotFound();
    const current = await cardRepo.findOwnedDesign(actorId, cardId, ctx.tx);
    if (!current) throw designNotFound();
    // M5 note (CARD-20): a published-with-adopters design refuses deletion (unpublish only) — the
    // adoption substrate doesn't exist yet, so at M4 draft/private/never-adopted all delete.
    if ((await cardRepo.countEquippedReferences(actorId, cardId, ctx.tx)) > 0) {
      throw new CardEquippedError();
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
