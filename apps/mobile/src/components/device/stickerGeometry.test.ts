import { stickerFitsZone, STICKERS_MAX_PER_ZONE, type Sticker } from '@ingame/shared';
import {
  fitTransform,
  halfExtents,
  maxScaleForFit,
  canPlace,
  zoneCount,
  mintStickerId,
  type StickerTransform,
} from './stickerGeometry';

const base = (over: Partial<StickerTransform> = {}): StickerTransform => ({
  zone: 'forehead',
  x: 0.5,
  y: 0.5,
  scale: 1,
  rotation: 0,
  ...over,
});

const sticker = (over: Partial<Sticker> = {}): Sticker => ({
  id: mintStickerId(),
  assetId: 'star',
  zone: 'forehead',
  x: 0.5,
  y: 0.5,
  scale: 1,
  rotation: 0,
  ...over,
});

describe('stickerGeometry.fitTransform', () => {
  it('the result ALWAYS satisfies the shared stickerFitsZone gate (client↔server agreement)', () => {
    // sweep positions, scales, rotations, both zones — every fitted transform must pass the gate.
    for (const zone of ['forehead', 'chin'] as const) {
      for (const x of [-0.5, 0, 0.3, 0.5, 0.8, 1.4]) {
        for (const y of [-0.5, 0.2, 0.5, 1.3]) {
          for (const scale of [0.5, 1, 1.6, 2, 5]) {
            for (const rotation of [-200, -45, 0, 30, 90, 181]) {
              const f = fitTransform(base({ zone }), { x, y, scale, rotation });
              expect(stickerFitsZone(f)).toBe(true);
            }
          }
        }
      }
    }
  });

  it('slides an off-zone position back to the fitting boundary (move clamp)', () => {
    const f = fitTransform(base(), { x: 1.5, y: -0.4 });
    const { hx, hy } = halfExtents('forehead', 1, 0);
    expect(f.x).toBeCloseTo(1 - hx, 6);
    expect(f.y).toBeCloseTo(hy, 6);
    expect(stickerFitsZone(f)).toBe(true);
  });

  it('rejects a same-zone scale that cannot fit — the previous scale is held, not snapped', () => {
    // a max decal rotated 45° overflows the zone height; the scale delta must be rejected.
    const cur = base({ scale: 1.5, rotation: 45 });
    const f = fitTransform(cur, { scale: 2 });
    expect(f.scale).toBe(1.5); // held at the previous fitting scale (reject, no snap)
    expect(stickerFitsZone(f)).toBe(true);
  });

  it('rejects a same-zone rotation that cannot fit — the previous rotation is held', () => {
    // near-max scale that fits at 0° but not at 45°.
    const cur = base({ scale: maxScaleForFit('forehead', 0) - 0.01, rotation: 0 });
    const f = fitTransform(cur, { rotation: 45 });
    expect(f.rotation).toBe(0);
    expect(stickerFitsZone(f)).toBe(true);
  });

  it('SHRINKS scale on a re-zone into a narrower zone rather than rejecting', () => {
    // a big forehead decal re-zoned to the narrower chin: it must shrink to fit, keep the new zone.
    const cur = base({ zone: 'forehead', scale: 2, rotation: 30 });
    const f = fitTransform(cur, { zone: 'chin' });
    expect(f.zone).toBe('chin');
    expect(f.scale).toBeLessThanOrEqual(2);
    expect(stickerFitsZone(f)).toBe(true);
  });

  it('range-clamps scale and rotation', () => {
    expect(fitTransform(base(), { scale: 99 }).scale).toBeLessThanOrEqual(2);
    expect(fitTransform(base(), { scale: 0.01 }).scale).toBeGreaterThanOrEqual(0.5);
    expect(fitTransform(base(), { rotation: 999 }).rotation).toBeLessThanOrEqual(180);
    expect(fitTransform(base(), { rotation: -999 }).rotation).toBeGreaterThanOrEqual(-180);
  });
});

describe('stickerGeometry caps', () => {
  it('zoneCount counts only the given zone', () => {
    const list = [sticker(), sticker({ zone: 'chin' }), sticker()];
    expect(zoneCount(list, 'forehead')).toBe(2);
    expect(zoneCount(list, 'chin')).toBe(1);
  });

  it('canPlace is false once the per-zone cap is reached', () => {
    const full = Array.from({ length: STICKERS_MAX_PER_ZONE }, () => sticker({ zone: 'forehead' }));
    expect(canPlace(full, 'forehead')).toBe(false);
    expect(canPlace(full, 'chin')).toBe(true); // the other zone still has room (within the total cap)
  });
});

describe('stickerGeometry.mintStickerId', () => {
  it('mints distinct ids within the 64-char schema bound', () => {
    const a = mintStickerId();
    const b = mintStickerId();
    expect(a).not.toBe(b);
    expect(a.length).toBeLessThanOrEqual(64);
    expect(a.length).toBeGreaterThan(0);
  });
});
