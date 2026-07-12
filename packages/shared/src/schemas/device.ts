import { z } from 'zod';
import { boundedText } from './sanitize';

// DEV-01/03 sticker composition (OQ-062, decision 0030) — the versioned, per-sticker shape that both
// the mobile editor and the server validate. Stickers decorate the coloured PLASTIC only (the
// forehead top-band + the chin nav-band margins); the screen (DEV-04) and the 5 nav keycaps are
// protected no-go zones. `x,y` are normalized [0,1] WITHIN the named zone's bounding rect
// (resolution-independent), `scale` is a multiplier on a base decal size (clamped 0.5–2.0), and
// `rotation` is degrees (−180..180). Enforcement is belt-and-suspenders (DEV-03 P0): the client
// refuses out-of-zone placement, the nav keycaps paint above every sticker (z-order), AND the server
// re-validates zone + transformed bounds on every device write — this file is the ONE geometry
// implementation both sides import (no drift between the client's live drag-clamp and the server gate).

/** The two decoratable plastic bands (OQ-062). The screen + keycaps are off-limits. */
export const stickerZoneSchema = z.enum(['forehead', 'chin']);
export type StickerZone = z.infer<typeof stickerZoneSchema>;

/** The sticker-composition envelope version (append-only; an unknown version safeParse-fails → the
 *  default empty composition, the graceful-degrade posture the card composition uses at F21). */
export const STICKER_COMPOSITION_VERSION = 1 as const;

/** Total placed-sticker ceiling across BOTH zones (the manifest's OQ-142 assumption; SYS-04-tunable). */
export const STICKERS_MAX_TOTAL = 12;
/** Per-zone placed-sticker ceiling (D4·5 assumption — the plastic band is small; SYS-04-tunable). */
export const STICKERS_MAX_PER_ZONE = 6;

export const STICKER_ASSET_ID_MAX = 40; // a roster id (client constant at M4; a cosmetic entity later)
export const STICKER_ID_MAX = 64; // a per-placement uuid the client mints (so a SavedLook can snapshot it)

/**
 * The half-extent of a base (scale 1) square decal, expressed in the zone's normalized-HEIGHT units
 * (the "natural" axis). The x-extent is corrected by the zone aspect below.
 */
export const STICKER_BASE_HALF = 0.18;

/**
 * Per-zone aspect ratio (width / height). A decal that is physically square spans DIFFERENT normalized
 * extents on each axis because the zone rect is wider than it is tall — the x-extent is the height
 * extent divided by this aspect. (Presentation px on the board are illustrative; these are the
 * validation constants.)
 */
export const ZONE_ASPECT: Record<StickerZone, number> = { forehead: 2.1, chin: 1.5 };

/** Floating-point slack so an exactly-at-the-edge placement isn't rejected by rounding. */
const FIT_EPSILON = 1e-9;

/** One placed sticker (OQ-062). `.strict()` — the shape is fully closed (no forward-compat passthrough). */
export const stickerSchema = z
  .object({
    id: z.string().min(1).max(STICKER_ID_MAX),
    assetId: boundedText(STICKER_ASSET_ID_MAX),
    zone: stickerZoneSchema,
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    scale: z.number().min(0.5).max(2),
    rotation: z.number().min(-180).max(180),
  })
  .strict();
export type Sticker = z.infer<typeof stickerSchema>;

/**
 * The rotated-AABB zone-fit test (DEV-03 layer-3 geometry). Computes the axis-aligned bounding box of
 * a square decal of half-extent `scale * STICKER_BASE_HALF` (height-normalized units) rotated by
 * `rotation`, corrects the x-extent by the zone aspect, and requires the box to sit inside [0,1]². The
 * ONE implementation the client (live drag-clamp) and the server (write gate) both call — keep it pure.
 */
export function stickerFitsZone(sticker: {
  zone: StickerZone;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}): boolean {
  const aspect = ZONE_ASPECT[sticker.zone];
  const base = sticker.scale * STICKER_BASE_HALF;
  const rad = (sticker.rotation * Math.PI) / 180;
  // The AABB of a rotated square of half-side s has half-extent s·(|cosθ|+|sinθ|) on each physical axis.
  const spread = Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad));
  const halfY = base * spread;
  const halfX = (base / aspect) * spread;
  return (
    sticker.x - halfX >= -FIT_EPSILON &&
    sticker.x + halfX <= 1 + FIT_EPSILON &&
    sticker.y - halfY >= -FIT_EPSILON &&
    sticker.y + halfY <= 1 + FIT_EPSILON
  );
}

/**
 * The `stickerComposition` document (OQ-062). Bounds/enums are enforced here (per-field ranges + the
 * total/per-zone caps); the ROTATED-BOUNDS fit (`stickerFitsZone`) runs in the service so it can return
 * a per-sticker field path on failure (a 422 the client maps back to the offending decal).
 */
export const stickerCompositionSchema = z
  .object({
    version: z.literal(STICKER_COMPOSITION_VERSION),
    stickers: z.array(stickerSchema).max(STICKERS_MAX_TOTAL).default([]),
  })
  .strict()
  .superRefine((comp, ctx) => {
    const perZone: Record<string, number> = {};
    for (const s of comp.stickers) {
      perZone[s.zone] = (perZone[s.zone] ?? 0) + 1;
    }
    for (const [zone, n] of Object.entries(perZone)) {
      if (n > STICKERS_MAX_PER_ZONE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['stickers'],
          message: `Too many stickers in the ${zone} zone (max ${STICKERS_MAX_PER_ZONE}).`,
        });
      }
    }
  });
export type StickerComposition = z.infer<typeof stickerCompositionSchema>;
