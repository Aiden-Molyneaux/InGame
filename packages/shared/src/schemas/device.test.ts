import { describe, it, expect } from 'vitest';
import {
  stickerCompositionSchema,
  stickerFitsZone,
  stickerSchema,
  STICKERS_MAX_PER_ZONE,
  STICKERS_MAX_TOTAL,
  STICKER_BASE_HALF,
  STICKER_COMPOSITION_VERSION,
  ZONE_ASPECT,
  type Sticker,
} from './device';

const sticker = (over: Partial<Sticker> = {}): Sticker => ({
  id: 'p1',
  assetId: 'rocket',
  zone: 'forehead',
  x: 0.5,
  y: 0.5,
  scale: 1,
  rotation: 0,
  ...over,
});

describe('DEV-01/03: stickerComposition schema (OQ-062)', () => {
  it('accepts a well-formed composition and defaults an absent stickers array to []', () => {
    expect(stickerCompositionSchema.parse({ version: 1 }).stickers).toEqual([]);
    expect(
      stickerCompositionSchema.safeParse({ version: 1, stickers: [sticker()] }).success,
    ).toBe(true);
  });

  it('rejects an unknown version and any smuggled key (.strict)', () => {
    expect(stickerCompositionSchema.safeParse({ version: 2, stickers: [] }).success).toBe(false);
    expect(
      stickerCompositionSchema.safeParse({ version: 1, stickers: [], extra: true }).success,
    ).toBe(false);
  });

  it('enforces per-field ranges: zone enum, x/y [0,1], scale 0.5–2, rotation −180..180', () => {
    expect(stickerSchema.safeParse(sticker({ zone: 'screen' as never })).success).toBe(false);
    expect(stickerSchema.safeParse(sticker({ x: 1.2 })).success).toBe(false);
    expect(stickerSchema.safeParse(sticker({ scale: 0.4 })).success).toBe(false);
    expect(stickerSchema.safeParse(sticker({ scale: 2.1 })).success).toBe(false);
    expect(stickerSchema.safeParse(sticker({ rotation: 200 })).success).toBe(false);
    expect(stickerSchema.safeParse(sticker({ rotation: -181 })).success).toBe(false);
  });

  it(`caps the total at ${STICKERS_MAX_TOTAL} and each zone at ${STICKERS_MAX_PER_ZONE}`, () => {
    const many = (n: number, zone: Sticker['zone']) =>
      Array.from({ length: n }, (_, i) => sticker({ id: `p${zone}${i}`, zone }));
    // 7 in one zone (total 7 ≤ 12, but > 6 per zone) → rejected by the per-zone superRefine
    expect(
      stickerCompositionSchema.safeParse({ version: 1, stickers: many(7, 'forehead') }).success,
    ).toBe(false);
    // 6 + 6 = 12 (both caps at the ceiling) → accepted
    expect(
      stickerCompositionSchema.safeParse({
        version: 1,
        stickers: [...many(6, 'forehead'), ...many(6, 'chin')],
      }).success,
    ).toBe(true);
    // 7 + 6 = 13 → over the total cap → rejected
    expect(
      stickerCompositionSchema.safeParse({
        version: 1,
        stickers: [...many(7, 'forehead'), ...many(6, 'chin')],
      }).success,
    ).toBe(false);
  });
});

describe('DEV-03: stickerFitsZone rotated-AABB geometry', () => {
  it('0°: a centred base decal fits; its extents match STICKER_BASE_HALF corrected by aspect', () => {
    expect(stickerFitsZone(sticker())).toBe(true);
    // At 0° the forehead x half-extent is base/aspect; a centre this close to the edge still fits…
    const halfX = STICKER_BASE_HALF / ZONE_ASPECT.forehead;
    expect(stickerFitsZone(sticker({ x: halfX + 0.001 }))).toBe(true);
    // …but pushing the centre inside the half-extent of the edge does not.
    expect(stickerFitsZone(sticker({ x: halfX - 0.01 }))).toBe(false);
    // The y axis is the un-corrected (larger) extent → base = 0.18; a centre at 0.1 clips the top.
    expect(stickerFitsZone(sticker({ y: 0.1 }))).toBe(false);
  });

  it('45°: the AABB grows by √2, so a decal that fit upright can clip once rotated', () => {
    // y half-extent at 0° = 0.18 → fits at y = 0.2. At 45° it is 0.18·√2 ≈ 0.2546 → clips the top.
    expect(stickerFitsZone(sticker({ y: 0.2, rotation: 0 }))).toBe(true);
    expect(stickerFitsZone(sticker({ y: 0.2, rotation: 45 }))).toBe(false);
    // A centred, upright, full-scale decal at 45° cannot fit vertically (0.36·√2 > 0.5).
    expect(stickerFitsZone(sticker({ scale: 2, rotation: 45 }))).toBe(false);
  });

  it('aspect correction: the chin zone (aspect 1.5) tolerates a smaller x offset than the forehead (2.1)', () => {
    const foreheadHalfX = STICKER_BASE_HALF / ZONE_ASPECT.forehead; // ≈ 0.0857
    const chinHalfX = STICKER_BASE_HALF / ZONE_ASPECT.chin; // ≈ 0.12
    expect(chinHalfX).toBeGreaterThan(foreheadHalfX);
    // A centre that fits in the wider forehead zone can clip in the narrower chin zone.
    const x = foreheadHalfX + 0.01;
    expect(stickerFitsZone(sticker({ zone: 'forehead', x }))).toBe(true);
    expect(stickerFitsZone(sticker({ zone: 'chin', x: chinHalfX - 0.01 }))).toBe(false);
  });

  it('the version literal is 1 (append-only envelope)', () => {
    expect(STICKER_COMPOSITION_VERSION).toBe(1);
  });
});
