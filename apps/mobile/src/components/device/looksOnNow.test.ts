import { isOnNow, type LookFacets } from './looksOnNow';
import type { StickerComposition } from '@ingame/shared';

// ON NOW equality (D6·2 · OQ-064) — the computed badge, not a stored flag.

const emptyComp: StickerComposition = { version: 1, stickers: [] };
const sticker = (over: Partial<StickerComposition['stickers'][number]> = {}) => ({
  id: 'a',
  assetId: 'rocket',
  zone: 'forehead' as const,
  x: 0.5,
  y: 0.5,
  scale: 1,
  rotation: 0,
  ...over,
});
const comp = (stickers: StickerComposition['stickers']): StickerComposition => ({ version: 1, stickers });

const facets = (over: Partial<LookFacets> = {}): LookFacets => ({
  activeShellId: 'teal',
  screenThemeId: 'midnight',
  stickerComposition: emptyComp,
  ...over,
});

describe('isOnNow', () => {
  it('is true when all three facets match', () => {
    expect(isOnNow(facets(), facets())).toBe(true);
  });

  it('is false when the shell differs', () => {
    expect(isOnNow(facets({ activeShellId: 'carbon' }), facets())).toBe(false);
  });

  it('is false when the theme differs', () => {
    expect(isOnNow(facets({ screenThemeId: 'deepsea' }), facets())).toBe(false);
  });

  it('is false when the sticker composition differs', () => {
    const look = facets({ stickerComposition: comp([sticker()]) });
    expect(isOnNow(look, facets())).toBe(false);
  });

  it('is true for the same stickers in a different array order', () => {
    const a = comp([sticker({ id: 'a' }), sticker({ id: 'b', x: 0.2 })]);
    const b = comp([sticker({ id: 'b', x: 0.2 }), sticker({ id: 'a' })]);
    expect(isOnNow(facets({ stickerComposition: a }), facets({ stickerComposition: b }))).toBe(true);
  });

  it('folds unknown/absent ids to the default before comparing (DEV-03)', () => {
    // an unknown shell id resolves to teal; an unknown theme resolves to midnight — so both read as the default combo
    expect(isOnNow(facets({ activeShellId: 'bogus', screenThemeId: 'nope' }), facets())).toBe(true);
  });

  it('is false when a sticker field (rotation) drifts', () => {
    const a = comp([sticker({ rotation: 0 })]);
    const b = comp([sticker({ rotation: 45 })]);
    expect(isOnNow(facets({ stickerComposition: a }), facets({ stickerComposition: b }))).toBe(false);
  });
});
