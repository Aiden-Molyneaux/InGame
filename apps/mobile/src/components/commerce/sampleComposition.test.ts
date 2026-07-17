import { sampleCompositionWith, isCardCosmetic } from './sampleComposition';

// The F-10 live-inspect sample builder (decision 0076) — the neutral card the store previews a card
// cosmetic ON gets the ONE closed attribute applied, mirroring the roster the editors + the skia render
// module consume, so the live preview matches what a buyer actually gets.

describe('sampleCompositionWith — applies the previewed cosmetic to a neutral card', () => {
  it('a FRAME sets frame.kind/color/width from the roster (an animated marquee frame carries its kind)', () => {
    const c = sampleCompositionWith('frame', 'marquee');
    expect(c.frame?.kind).toBe('marquee'); // the live layer chases the light around it
    expect(c.frame?.color).toBeTruthy();
    expect(c.frame?.width).toBeGreaterThan(0);
    expect(c.effect).toBeUndefined(); // the base wears no competing effect
  });

  it('a CLEAN frame (kind null) applies no frame band', () => {
    const c = sampleCompositionWith('frame', 'clean');
    expect(c.frame).toBeUndefined();
  });

  it('an EFFECT sets effect.kind at full default intensity (frost animates live)', () => {
    const c = sampleCompositionWith('effect', 'frost');
    expect(c.effect?.kind).toBe('frost');
    expect(c.effect?.intensity).toBeGreaterThan(0);
  });

  it('the NONE effect applies no effect', () => {
    const c = sampleCompositionWith('effect', 'none');
    expect(c.effect).toBeUndefined();
  });

  it('a FINISH sets finish.kind (holographic sweeps live)', () => {
    const c = sampleCompositionWith('finish', 'holographic');
    expect(c.finish?.kind).toBe('holographic');
  });

  it('a NAMEPLATE sets the plate shape while keeping the title/font/ink', () => {
    const c = sampleCompositionWith('nameplate', 'brass');
    expect(c.nameplate?.shape).toBe('brass');
    expect(c.nameplate?.title).toBeTruthy();
    expect(c.nameplate?.ink).toBeTruthy();
  });

  it('a FONT sets the nameplate fontId', () => {
    const c = sampleCompositionWith('font', 'space-mono');
    expect(c.nameplate?.fontId).toBe('space-mono');
  });

  it('does not mutate the shared neutral base across calls', () => {
    const a = sampleCompositionWith('frame', 'marquee');
    const b = sampleCompositionWith('frame', 'clean');
    expect(a.frame?.kind).toBe('marquee'); // a is untouched by b
    expect(b.frame).toBeUndefined();
  });
});

describe('isCardCosmetic — routes card cosmetics to the live CardFace, device/theme to their own previews', () => {
  it.each(['frame', 'effect', 'finish', 'nameplate', 'font'] as const)('%s is a card cosmetic', (t) => {
    expect(isCardCosmetic(t)).toBe(true);
  });
  it.each(['device_shell', 'screen_theme'] as const)('%s is NOT a card cosmetic', (t) => {
    expect(isCardCosmetic(t)).toBe(false);
  });
});
