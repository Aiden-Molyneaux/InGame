import {
  STICKER_BASE_HALF,
  ZONE_ASPECT,
  STICKERS_MAX_PER_ZONE,
  STICKERS_MAX_TOTAL,
  STICKER_COMPOSITION_VERSION,
  type Sticker,
  type StickerZone,
  type StickerComposition,
} from '@ingame/shared';

// Sticker placement geometry (M4 §3.5 · device-manifest D4 · DEV-03) — PURE helpers so the client's
// live drag/stepper clamp is unit-testable AND provably agrees with the shared `stickerFitsZone` gate
// the server enforces (the ONE geometry, no client↔server drift). Everything here works in the zone's
// normalized space: `x` is a fraction of the zone WIDTH, `y` a fraction of the zone HEIGHT, `scale` a
// multiplier on the base decal, `rotation` in degrees. The base decal is a square whose half-side is
// `STICKER_BASE_HALF` in zone-HEIGHT units; its x-extent is corrected by the per-zone aspect.

export const SCALE_MIN = 0.5;
export const SCALE_MAX = 2;
export const ROT_MIN = -180;
export const ROT_MAX = 180;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** The transform facet of a placed sticker (the fields the editor moves/scales/rotates/re-zones). */
export interface StickerTransform {
  zone: StickerZone;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

/**
 * Normalized half-extents of the ROTATED square decal's axis-aligned bounding box, within the zone
 * rect: `hx` as a fraction of the zone width, `hy` as a fraction of the zone height. Mirrors the math
 * in the shared `stickerFitsZone` (a square of half-side s has AABB half-extent s·(|cosθ|+|sinθ|)).
 */
export function halfExtents(zone: StickerZone, scale: number, rotation: number): { hx: number; hy: number } {
  const aspect = ZONE_ASPECT[zone];
  const base = scale * STICKER_BASE_HALF;
  const rad = (rotation * Math.PI) / 180;
  const spread = Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad));
  return { hx: (base / aspect) * spread, hy: base * spread };
}

/** The largest scale whose rotated AABB still fits the zone at ANY position (the hy axis binds because
 *  every zone aspect > 1, so the height extent is always the tighter one). */
export function maxScaleForFit(zone: StickerZone, rotation: number): number {
  const rad = (rotation * Math.PI) / 180;
  const spread = Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad));
  return 0.5 / (STICKER_BASE_HALF * spread);
}

/**
 * Fit a proposed transform into its zone (DEV-03 client clamp — belt to the server's suspenders):
 *  • scale/rotation are range-clamped (0.5–2 · −180..180);
 *  • a same-zone scale/rotation change that can't fit the zone at any position is REJECTED — the delta
 *    is dropped and the previous scale/rotation held (the manifest's "reject the delta that would break
 *    fit rather than snapping": a max-scale decal at 45° cannot fit, so it simply won't grow further);
 *  • a re-zone into a narrower zone SHRINKS scale to fit instead (the old scale fit the old zone, so
 *    reverting to it would still overflow — a graceful shrink beats a stuck decal);
 *  • position is slid into the fitting window so a move drag glides to the boundary, never off-zone.
 * The result always satisfies the shared `stickerFitsZone`.
 */
export function fitTransform(cur: StickerTransform, patch: Partial<StickerTransform>): StickerTransform {
  const zone = patch.zone ?? cur.zone;
  const zoneChanged = zone !== cur.zone;
  let scale = clamp(patch.scale ?? cur.scale, SCALE_MIN, SCALE_MAX);
  let rotation = clamp(patch.rotation ?? cur.rotation, ROT_MIN, ROT_MAX);

  let { hx, hy } = halfExtents(zone, scale, rotation);
  if (hx > 0.5 || hy > 0.5) {
    if (zoneChanged) {
      scale = clamp(Math.min(scale, maxScaleForFit(zone, rotation)), SCALE_MIN, SCALE_MAX);
    } else {
      scale = cur.scale;
      rotation = cur.rotation;
    }
    ({ hx, hy } = halfExtents(zone, scale, rotation));
  }

  // With a tiny epsilon so an exactly-centred max decal isn't rejected by float noise.
  const x = clamp(patch.x ?? cur.x, hx, 1 - hx);
  const y = clamp(patch.y ?? cur.y, hy, 1 - hy);
  return { zone, x, y, scale, rotation };
}

/** Placed-sticker count in one zone. */
export function zoneCount(stickers: readonly Sticker[], zone: StickerZone): number {
  return stickers.reduce((n, s) => (s.zone === zone ? n + 1 : n), 0);
}

/** Whether another sticker may be placed in `zone` (per-zone cap 6 AND total cap 12, DEV-03 / OQ-142). */
export function canPlace(stickers: readonly Sticker[], zone: StickerZone): boolean {
  return stickers.length < STICKERS_MAX_TOTAL && zoneCount(stickers, zone) < STICKERS_MAX_PER_ZONE;
}

/** A per-placement id the client mints (a SavedLook snapshots it; ≤ 64 chars per the schema). */
export function mintStickerId(): string {
  return `stk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/** The empty composition (the DEV-03 default when the user has no stickers / an unknown envelope). */
export const EMPTY_COMPOSITION: StickerComposition = {
  version: STICKER_COMPOSITION_VERSION,
  stickers: [],
};

/** Replace one sticker (by id) in a composition, returning a NEW composition (never mutates). */
export function withSticker(
  comp: StickerComposition,
  id: string,
  next: Sticker,
): StickerComposition {
  const stickers = comp.stickers.map((s) => (s.id === id ? next : s));
  return { version: STICKER_COMPOSITION_VERSION, stickers };
}

/** Drop one sticker (by id). */
export function withoutSticker(comp: StickerComposition, id: string): StickerComposition {
  return {
    version: STICKER_COMPOSITION_VERSION,
    stickers: comp.stickers.filter((s) => s.id !== id),
  };
}

/** Append a sticker. */
export function addSticker(comp: StickerComposition, sticker: Sticker): StickerComposition {
  return { version: STICKER_COMPOSITION_VERSION, stickers: [...comp.stickers, sticker] };
}
