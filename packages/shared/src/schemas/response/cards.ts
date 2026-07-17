import { z } from 'zod';
import { compositionSchema } from '../composition';
import { cosmeticTypeSchema } from '../common';
import { stylePresetStyleSchema } from '../request/cards';

// RESPONSE/VIEW schemas for the M4 card substrate (api-contract 0.53 / decision 0066). OWNER-ONLY
// shapes: the design's `composition` may appear here (the owner renders live) — it must NEVER appear
// on a cross-user shape (CARD-15: viewers get flattened images, not layers; the 0066 §2 guard).

export const cardDesignStatusSchema = z.enum(['draft', 'private', 'published']); // CARD-14 lifecycle
export type CardDesignStatus = z.infer<typeof cardDesignStatusSchema>;

/**
 * One PREMIUM component a cross-user card carries (M5 F-9 · E2 · api-contract 0.67). Server-computed
 * display metadata, resolved from the cosmetic registry against the card's DENORMALIZED
 * `premium_component_ids` — NEVER from the private `composition` (the OQ-122 cross-user exclusion holds;
 * only premium refs are denormalized, so only premium components are listed). `owned` is caller-scoped
 * (the caller's own `user_entitlements`); `price` is the tier PX (what the caller would pay if unowned).
 * Lets the INSPECT sheet list what a published card is built from — "even the premium ones you pay for".
 */
export const cardComponentSchema = z
  .object({
    cosmeticId: z.string(),
    name: z.string(),
    type: cosmeticTypeSchema,
    price: z.number().int().nonnegative(),
    owned: z.boolean(),
  })
  .strict();
export type CardComponentView = z.infer<typeof cardComponentSchema>;

/**
 * CARD-22 equipped readout (viewer-facing card metadata) — a card's per-slot DISPLAY LABELS, incl. the
 * FREE slots (base · frame · effect · finish · nameplate · font). Display METADATA only, NEVER the
 * editable composition (CARD-15 / OQ-122 — viewers get the flattened image + these labels, never the
 * layers). Computed at PUBLISH from the composition and DENORMALIZED beside `premium_component_ids`
 * (decision 0076 §0.2 / OQ-146), so it is readable cross-user without ever touching the private
 * composition. Every slot is optional — a slot the card doesn't set (or a legacy/pre-roster document)
 * is simply absent. Empty `{}` for a card whose labels were never snapshotted (a pre-M6 published card
 * the backfill missed) — the client degrades to no-readout, never a crash.
 */
export const equippedReadoutSchema = z
  .object({
    base: z.string().optional(), // "GRADIENT" | "SOLID" — the base fill type
    frame: z.string().optional(),
    effect: z.string().optional(),
    finish: z.string().optional(),
    nameplate: z.string().optional(),
    font: z.string().optional(),
  })
  .strict();
export type EquippedReadout = z.infer<typeof equippedReadoutSchema>;

/** One of MY designs (the CARD-24a document): /me/cards · /me/collection/:entryId/cards items. */
export const cardDesignSchema = z
  .object({
    id: z.string().uuid(),
    gameId: z.string().uuid(),
    name: z.string(),
    status: cardDesignStatusSchema,
    composition: compositionSchema, // owner-only (0066 §2)
    compositionHash: z.string(),
    imageUrl: z.string().nullable(), // null until the M5 flatten-to-storage (0066 §1)
    thumbUrl: z.string().nullable(),
    isPremium: z.boolean(), // CARD-06 derived; always false on the M4 free baseline
    // CARD-24a copy-on-write origin (decision 0067): set on a draft COPY of a committed card; null
    // otherwise. A crash-recovered copy knows its origin — resuming then KEEPing merges it home.
    derivedFromCardId: z.string().uuid().nullable(),
    createdAt: z.string(), // ISO-8601
    updatedAt: z.string(),
  })
  .strict();
export type CardDesignView = z.infer<typeof cardDesignSchema>;

/** GET /me/cards — my designs across games (drafts · private · published; CARD-14). OWNED-ONLY —
 *  this is the designer's shelf; an adopted card never appears here (it's not my design). */
export const myCardsResponseSchema = z.object({ items: z.array(cardDesignSchema) }).strict();
export type MyCardsResponse = z.infer<typeof myCardsResponseSchema>;

// ── COL-06 switcher — the per-game equippable faces (mine + adopted; api-contract 0.62) ──────────────
// GET /me/collection/:entryId/cards lists two provenances, discriminated by `origin`:
//  • 'owned'   — my own design (draft/private/published); the full owner shape (composition rides — I
//                render it LIVE, owner-only per 0066 §2).
//  • 'adopted' — a card I adopted for this game (decision 0072 grant). FOREIGN-owned → FLATTENED-ONLY:
//                imageUrl/thumbUrl + designer attribution, NEVER `composition` (OQ-122 / CARD-15 /
//                0066 §2 — cross-user viewers get the flattened image, never the private layers). The
//                GRANT (not the card's publish status) is what makes it mine, so it SURVIVES the
//                designer unpublishing (CARD-20 "adopters keep their copy").

/** An OWNED switcher entry — my design, tagged with its provenance. */
export const ownedEntryCardSchema = cardDesignSchema.extend({ origin: z.literal('owned') });
export type OwnedEntryCard = z.infer<typeof ownedEntryCardSchema>;

/** An ADOPTED switcher entry — a foreign card I hold a grant for. Flattened image + attribution only. */
export const adoptedEntryCardSchema = z
  .object({
    origin: z.literal('adopted'),
    id: z.string().uuid(),
    gameId: z.string().uuid(),
    name: z.string(),
    imageUrl: z.string().nullable(),
    thumbUrl: z.string().nullable(),
    isPremium: z.boolean(),
    // M5 F-9 E2 — the premium components behind the adopted card (all `owned:true` for the holder), so
    // a switcher inspect can read them the same way the gallery does. From the denormalized premium refs,
    // never the composition (OQ-122).
    components: z.array(cardComponentSchema),
    // CARD-22 (OQ-146 / 0.69) — the equipped per-slot readout (incl. FREE slots), from the DENORMALIZED
    // publish-time label snapshot (never the composition). Absent on a pre-M6 card the backfill missed.
    equipped: equippedReadoutSchema.optional(),
    designer: z.object({ userId: z.string().uuid(), username: z.string() }).strict(),
    // NO `composition` — the flattened image is the only cross-user artifact (OQ-122).
  })
  .strict();
export type AdoptedEntryCard = z.infer<typeof adoptedEntryCardSchema>;

/** One switcher item — owned (composition rides) OR adopted (flattened-only), by `origin` (COL-06). */
export const entryCardSchema = z.discriminatedUnion('origin', [
  ownedEntryCardSchema,
  adoptedEntryCardSchema,
]);
export type EntryCard = z.infer<typeof entryCardSchema>;

/** GET /me/collection/:entryId/cards — the per-game switcher feed (COL-06): mine + adopted. */
export const entryCardsResponseSchema = z.object({ items: z.array(entryCardSchema) }).strict();
export type EntryCardsResponse = z.infer<typeof entryCardsResponseSchema>;

/** One saved style preset (CARD-24b). GET /me/style-presets returns the BARE ARRAY (api 0.51). */
export const stylePresetSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    style: stylePresetStyleSchema,
    isPremium: z.boolean(), // derived (any premium closed attribute); false on the M4 free baseline
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();
export type StylePresetView = z.infer<typeof stylePresetSchema>;

export const stylePresetsResponseSchema = z.array(stylePresetSchema);
export type StylePresetsResponse = z.infer<typeof stylePresetsResponseSchema>;

// ── M5 P3 — the CROSS-USER PUBLIC card shapes (gallery · trending · adopt; decision 0072/0073) ─────
// These are the OQ-122 public views: flattened image urls + attribution, NEVER `composition` (the
// private layers stay in the owner shape; viewers get the flattened image — CARD-15 / 0066 §2).

/**
 * One community-gallery card (GET /games/:gameId/cards). `priceForYou` = the caller's PERSONALIZED
 * adoption price (decision 0072) = the summed PX of the card's premium components the caller does NOT
 * already own — 0 for a free card or one the caller fully owns. `isPremium` is the card's own flag.
 * `components` (M5 F-9 · E2) lists the card's PREMIUM components with per-caller ownership so the adopt
 * sheet reads like buying-cosmetics-in-the-Styler (rows of swatched components + prices + total).
 */
export const galleryCardSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    imageUrl: z.string().nullable(),
    thumbUrl: z.string().nullable(),
    isPremium: z.boolean(),
    adoptionCount: z.number().int().nonnegative(),
    priceForYou: z.number().int().nonnegative(), // personalized missing-components sum (0072)
    components: z.array(cardComponentSchema), // M5 F-9 E2 — the premium refs, resolved + owned per-caller
    // CARD-22 (OQ-146 / 0.69) — the equipped per-slot readout (incl. FREE slots), from the DENORMALIZED
    // publish-time label snapshot (never the composition). The 0.67 drawn-not-built caveat retires.
    equipped: equippedReadoutSchema.optional(),
    designer: z.object({ userId: z.string().uuid(), username: z.string() }).strict(),
    // M5 F-13 E4 (owner round-2) — cheap per-caller provenance so the gallery cell can tag the caller's
    // OWN published cards ("BY YOU") and the ones they've ALREADY ADOPTED ("ADOPTED"). Both derive from
    // data already read for the gallery (designerId == caller · the caller's active adoptions).
    byViewer: z.boolean(), // the caller is this card's designer
    adopted: z.boolean(), // the caller holds an ACTIVE adoption grant for this card
  })
  .strict();
export type GalleryCardView = z.infer<typeof galleryCardSchema>;

/** GET /games/:gameId/cards — the community gallery (published only; personalized prices). */
export const gameGalleryResponseSchema = z.object({ items: z.array(galleryCardSchema) }).strict();
export type GameGalleryResponse = z.infer<typeof gameGalleryResponseSchema>;

/**
 * POST /cards/:id/adopt (decision 0072) — one atomic acquire of the card's premium components the
 * caller doesn't own + the free design grant. `granted` is one row per component actually charged
 * (already-owned/free → []); `totalPaid` == `card_adoptions.currency_paid`; `balance` is the post-
 * adopt wallet balance (the STARTING_GRANT effective value when the free path never materializes it).
 */
export const adoptResponseSchema = z
  .object({
    granted: z.array(
      z.object({ cosmeticId: z.string(), paid: z.number().int().nonnegative() }).strict(),
    ),
    totalPaid: z.number().int().nonnegative(),
    balance: z.number().int(),
  })
  .strict();
export type AdoptResponse = z.infer<typeof adoptResponseSchema>;

/**
 * GET /discover/trending-cards (DISC-04 / OQ-055) — featured community cards ranked by adoption.
 * NON-COMMERCE: counts, never prices (no `priceForYou`). Block-filtered per the caller (SOC-09).
 */
export const trendingCardSchema = z
  .object({
    rank: z.number().int().positive(),
    card: z
      .object({
        id: z.string().uuid(),
        name: z.string(),
        imageUrl: z.string().nullable(),
        thumbUrl: z.string().nullable(),
        isPremium: z.boolean(),
      })
      .strict(),
    game: z.object({ id: z.string().uuid(), title: z.string() }).strict(),
    designer: z.object({ userId: z.string().uuid(), username: z.string() }).strict(),
    adoptionCount: z.number().int().nonnegative(),
  })
  .strict();
export type TrendingCardView = z.infer<typeof trendingCardSchema>;

export const trendingCardsResponseSchema = z.object({ items: z.array(trendingCardSchema) }).strict();
export type TrendingCardsResponse = z.infer<typeof trendingCardsResponseSchema>;
