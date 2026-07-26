import { describe, it, expect } from 'vitest';
import { FONT_FILES, buildTypefaceRegistry } from './flatten';

// M6 walk-4 P1-a — the server flatten rendered the WRONG FONT FAMILY. buildCard resolves each text /
// nameplate face from `ctx.typefaces[fontId]`, falling back to `ctx.typeface` only when the map has no
// entry. The flatten used to populate ONLY `typeface` (chakra-petch) and NEVER `typefaces`, so EVERY
// non-default font — the 4 premium fonts, the free bold-display/press-start, AND the W-5 SCRIPT
// ULTIMATE (`pacifico-ultimate`) — silently fell back to chakra-petch (the owner saw the right ink but
// a fallback face). `buildTypefaceRegistry` now assembles the fontId→face map the flatten passes as
// `ctx.typefaces`. These pin the registry wiring (the fix); pre-fix the export didn't exist. The
// registry MIRRORS the mobile `useCardSkiaCtx` registration one-for-one. Tags: COSM-05, CARD-11, CARD-15.

describe('P1-a: the server-flatten typeface registry (buildTypefaceRegistry)', () => {
  // A loader that returns a distinct sentinel per package (so aliasing/identity is observable) —
  // stands in for the real Skia.Typeface load.
  const face = (pkg: string): string => `face:${pkg}`;

  it('FONT_FILES covers every fontId the mobile useCardSkiaCtx registers (weights included, one-for-one)', () => {
    const ids = FONT_FILES.map(([id]) => id);
    // the 3 free fonts + the 4 premium fonts (pacifico-ultimate is aliased from pacifico, not a file)
    expect(ids).toEqual([
      'clean-sans',
      'bold-display',
      'press-start',
      'bitter',
      'space-mono',
      'pacifico',
      'stencil',
    ]);
    // every entry names an @expo-google-fonts package and a concrete .ttf subpath
    for (const [, pkg, ttf] of FONT_FILES) {
      expect(pkg.startsWith('@expo-google-fonts/')).toBe(true);
      expect(ttf).toMatch(/\.ttf$/);
    }
  });

  it('registers a face for EVERY fontId (nothing falls back to chakra-petch when its font loads)', () => {
    const reg = buildTypefaceRegistry(face);
    for (const [id, pkg] of FONT_FILES) {
      expect(reg[id]).toBe(`face:${pkg}`);
    }
  });

  it('SCRIPT ULTIMATE (pacifico-ultimate) is registered and shares the pacifico face (the W-5 bug)', () => {
    const reg = buildTypefaceRegistry(face);
    expect(reg['pacifico-ultimate']).toBeDefined();
    expect(reg['pacifico-ultimate']).toBe(reg['pacifico']); // same face, distinct SKU id
    // and it is NOT the chakra-petch fallback (the pre-fix wrong-font behaviour)
    expect(reg['pacifico-ultimate']).not.toBe(reg['clean-sans']);
  });

  it('the three ULTIMATE server render paths all resolve a real face (marquee via frame.color, brass+script via the map)', () => {
    // marquee-ultimate rides the FRAME layer (frame.color → marqueeTrackColor, no typeface); brass-
    // ultimate rides the nameplate plate (no font of its own); script/pacifico-ultimate is a FONT SKU
    // whose face must resolve. This pins the font half — the one the owner reproduced.
    const reg = buildTypefaceRegistry(face);
    expect(reg['pacifico-ultimate']).toBeDefined();
    // brass-ultimate's title still uses whatever font is equipped — every equippable font resolves:
    expect(reg['bitter']).toBeDefined();
    expect(reg['space-mono']).toBeDefined();
  });

  it('a single unreadable TTF degrades ONLY that fontId (the rest still register)', () => {
    // simulate pacifico failing to load — buildCard will fall back to chakra-petch for it, but the
    // ultimate alias must not be created off a missing face, and every OTHER font stays present.
    const reg = buildTypefaceRegistry((pkg) => (pkg.includes('pacifico') ? undefined : `face:${pkg}`));
    expect(reg['pacifico']).toBeUndefined();
    expect(reg['pacifico-ultimate']).toBeUndefined(); // no alias off a missing face
    expect(reg['clean-sans']).toBeDefined();
    expect(reg['bitter']).toBeDefined();
    expect(reg['stencil']).toBeDefined();
  });

  it('an all-failing loader yields an empty registry (the flatten degrades to the fallback, never crashes)', () => {
    expect(buildTypefaceRegistry(() => undefined)).toEqual({});
  });
});
