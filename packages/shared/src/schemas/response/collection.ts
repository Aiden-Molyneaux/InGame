import { z } from 'zod';
import { collectionStatusSchema } from '../common';
import { genreViewSchema } from './catalog';
import { equippedReadoutSchema } from './cards';

// RESPONSE/VIEW schemas for the collection (api-contract 0.17/0.48) — the F06 serializer side of
// the split. The client's shelf/LIST/TOP + profile stats bind to these via z.infer (F31).

/**
 * The `card` rider — resolves per CARD-18: the equipped design → else the default-face STUB
 * (`id: 'default'`, null urls). **M4 (api 0.53 / decision 0066 §2):** an equipped CUSTOM design adds
 * its `name` + `composition` — OWNER-ONLY (the owner renders live; a cross-user serializer must NEVER
 * emit `composition` — CARD-15: viewers get flattened images, not layers). Urls stay null until the
 * M5 flatten-to-storage.
 */
export const collectionCardSchema = z
  .object({
    id: z.string(),
    imageUrl: z.string().nullable(),
    thumbUrl: z.string().nullable(),
    isCustom: z.boolean(),
    isPremium: z.boolean(),
    name: z.string().optional(), // custom designs only (0.53)
    composition: z.unknown().optional(), // custom designs only — OWNER-ONLY (0066 §2)
    /**
     * CARD-01 designer attribution (the api-contract 0.50 rider: "the card's rider `designer` …
     * feed[s] the COL-12 peek-flip stats back"). Walk2 W-A1: the serializer does NOT emit it yet on
     * `/me/collection` (an adopted-equipped card arrives with no attribution — the W-C8-class server
     * half is reported, not fixed here); additive-optional so the client renders the designer's name
     * the day the server emits it.
     */
    designer: z.object({ userId: z.string().uuid(), username: z.string() }).strict().optional(),
  })
  .strict();

export type CollectionCard = z.infer<typeof collectionCardSchema>;

/** The one pre-M4 stub value `card` resolves to everywhere (api-contract 0.48). */
export const DEFAULT_CARD_STUB: CollectionCard = {
  id: 'default',
  imageUrl: null,
  thumbUrl: null,
  isCustom: false,
  isPremium: false,
};

/** The 0.17 collection item enumeration (GET /me/collection · the POST /me/collection response). */
export const collectionItemSchema = z
  .object({
    entryId: z.string().uuid(),
    gameId: z.string().uuid(),
    title: z.string(),
    developer: z.string().nullable(),
    publisher: z.string().nullable(),
    releaseYear: z.number().int().nullable(),
    genres: z.array(genreViewSchema),
    hours: z.number().int().nonnegative(),
    percentComplete: z.number().int().nullable(),
    status: collectionStatusSchema,
    ownedSince: z.string().nullable(), // YYYY-MM-DD (user-editable date acquired, COL-03)
    addedAt: z.string(), // ISO-8601 — the IMMUTABLE shelf-add timestamp (entry.createdAt); the RECENT
    // sort keys on this, distinct from the editable ownedSince (OQ-128 resolved, 2026-07-04)
    nowPlaying: z.boolean(), // the ▶ NOW tag (WTP-03)
    card: collectionCardSchema,
    // OQ-134 (api 0.53) — OWNER-ONLY personal fields; the friend-view subset excludes them by contract.
    rating: z.number().int().min(1).max(5).nullable(), // COL-03 private ⭐
    notes: z.string().nullable(), // COL-05
  })
  .strict();

export type CollectionItem = z.infer<typeof collectionItemSchema>;

/**
 * GET /me/collection — `total` counts the current query, `collectionTotal` the whole shelf (the
 * CountTag's "2 OF 48" — honest, the C4 class). M3 posture (D4/decision 0058): unpaginated,
 * `nextCursor` always null.
 */
export const collectionResponseSchema = z
  .object({
    items: z.array(collectionItemSchema),
    nextCursor: z.string().nullable(),
    total: z.number().int().nonnegative(),
    collectionTotal: z.number().int().nonnegative(),
  })
  .strict();

export type CollectionResponse = z.infer<typeof collectionResponseSchema>;

// ── COL-10/11 · SOC-11 — the friend-view collection (GET /users/:id/collection; api-contract 0.20/0.24) ──
// A READ-ONLY, PRIVACY-GATED subset of the owner's shelf (COL-10). The friend-visible field set MINUS
// every owner-only field (COL-04 platforms · COL-05 notes · rating · addedAt · percentComplete — the
// friend back shows hours/status/ownedSince + the card's designer only, decision 0026/0021). Served
// through the SYS-01-FRIEND-READ class (an accepted-friendship predicate) + the F06 allowlist — the
// serializer PHYSICALLY cannot emit a personal field (it is not on the shape). The single-entry SOC-11
// detail the Game-page friend view needs is ONE of these items (the contract has no dedicated
// single-entry path — it composes client-side from this item + canonical /catalog/games/:id).

/**
 * The friend-view card rider (CARD-07/22) — FLATTENED image + attribution + the CARD-22 equipped
 * readout, NEVER the private `composition` (OQ-122/CARD-15: a cross-user viewer gets the flattened
 * image + display labels, never the layers). The default-face stub carries neither `equipped` nor
 * `designer` (there is no custom design to attribute or read).
 */
export const friendCollectionCardSchema = z
  .object({
    id: z.string(),
    imageUrl: z.string().nullable(),
    thumbUrl: z.string().nullable(),
    isCustom: z.boolean(),
    isPremium: z.boolean(),
    name: z.string().optional(), // custom designs only
    equipped: equippedReadoutSchema.optional(), // CARD-22 — the per-slot readout (OQ-146 denormalization)
    designer: z.object({ userId: z.string().uuid(), username: z.string() }).strict().optional(), // CARD-01
    // NO `composition` — the friend gets the flattened image + equipped labels, never the layers.
  })
  .strict();
export type FriendCollectionCard = z.infer<typeof friendCollectionCardSchema>;

/**
 * One friend-view collection item (COL-10). The `/me/collection` shelf fields MINUS the owner-only set:
 * NO `notes`/`rating` (COL-04/05) · NO `addedAt` (the M6 build-note in api-contract 0.50) · NO
 * `percentComplete` (the friend back omits it, decision 0026). `card` is the flattened friend rider.
 */
export const friendCollectionItemSchema = z
  .object({
    entryId: z.string().uuid(),
    gameId: z.string().uuid(),
    title: z.string(),
    developer: z.string().nullable(),
    publisher: z.string().nullable(),
    releaseYear: z.number().int().nullable(),
    genres: z.array(genreViewSchema),
    hours: z.number().int().nonnegative(),
    status: collectionStatusSchema,
    ownedSince: z.string().nullable(), // YYYY-MM-DD (COL-03 date acquired — friend-visible, decision 0021)
    nowPlaying: z.boolean(), // the ▶ NOW tag (WTP-03) for their hero
    card: friendCollectionCardSchema,
  })
  .strict();
export type FriendCollectionItem = z.infer<typeof friendCollectionItemSchema>;

/** GET /users/:id/collection — the friend-view shelf (COL-10/11). Same envelope as /me/collection. */
export const friendCollectionResponseSchema = z
  .object({
    items: z.array(friendCollectionItemSchema),
    nextCursor: z.string().nullable(),
    total: z.number().int().nonnegative(),
    collectionTotal: z.number().int().nonnegative(),
  })
  .strict();
export type FriendCollectionResponse = z.infer<typeof friendCollectionResponseSchema>;

export const okResponseSchema = z.object({ ok: z.literal(true) }).strict();
export type OkResponse = z.infer<typeof okResponseSchema>;
