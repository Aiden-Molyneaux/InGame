import type { Theme } from '../../theme';
import { tierColor, byTierPrestigeFirst } from './tier';
import { glyphForKey, DEFAULT_GLYPH, MYSTERY_GLYPH } from './achievementGlyphs';

// P11 — the ACH-09 tier→token mapping + the glyph map. Pure unit (no render). Proves the STANDARD tier
// FOLLOWS the screen theme accent (not a hard-coded orange) by mapping two different theme accents.

function fakeTheme(accent: string): Theme {
  return { brand: { gold: '#ffd23f', secret: '#e85ad0' }, scr: { accent } } as unknown as Theme;
}

describe('ACH-09 tierColor', () => {
  it('PRESTIGE = brand.gold (the F-02 carve-out)', () => {
    expect(tierColor('prestige', fakeTheme('#ff9f43'))).toBe('#ffd23f');
  });

  it('SECRET = brand.secret magenta (the F-05 carve-out)', () => {
    expect(tierColor('secret', fakeTheme('#ff9f43'))).toBe('#e85ad0');
  });

  it('STANDARD FOLLOWS the screen-theme accent (re-themes per DEV-04, never a fixed orange)', () => {
    // Two themes → two different STANDARD colours, each == that theme's accent (proves it is not baked).
    expect(tierColor('standard', fakeTheme('#ff9f43'))).toBe('#ff9f43'); // Midnight accent
    expect(tierColor('standard', fakeTheme('#3ec9c2'))).toBe('#3ec9c2'); // a teal-theme accent
  });
});

describe('byTierPrestigeFirst', () => {
  it('orders prestige < standard < secret', () => {
    const rows = [
      { tier: 'secret' as const, id: 's' },
      { tier: 'standard' as const, id: 'm' },
      { tier: 'prestige' as const, id: 'p' },
    ];
    expect([...rows].sort(byTierPrestigeFirst).map((r) => r.id)).toEqual(['p', 'm', 's']);
  });
});

describe('key→glyph map (ARCH-A3 / GAP-2)', () => {
  it('maps a seeded key to its glyph paths', () => {
    const g = glyphForKey('a1_first_print');
    expect(g.length).toBeGreaterThan(0);
    expect(g).not.toBe(DEFAULT_GLYPH);
  });

  it('falls back to the trophy DEFAULT for an unknown key (never a blank tile)', () => {
    expect(glyphForKey('z_not_a_real_key')).toBe(DEFAULT_GLYPH);
    expect(glyphForKey(undefined)).toBe(DEFAULT_GLYPH);
  });

  it('covers all 18 seeded keys with a dedicated glyph', () => {
    const KEYS = [
      'a1_first_print', 'a2_press_operator', 'a3_shelf_starter', 'a5_player_two', 'a6_full_lobby',
      'a7_good_taste', 'a9_contributor', 'a10_ladder_graduate', 'a12_beaten_path', 'a13_first_adoption',
      'a14_house_style', 'a15_cornerstone', 'b1_neat_freak', 'b3_renaissance', 'b4_patron_of_the_arts',
      'b6_night_shift', 'b7_strawberry_hunter', 'b8_the_regifter',
    ];
    for (const k of KEYS) expect(glyphForKey(k)).not.toBe(DEFAULT_GLYPH);
  });

  it('exposes a distinct mystery lock glyph for the ??? slot', () => {
    expect(MYSTERY_GLYPH.length).toBeGreaterThan(0);
    expect(MYSTERY_GLYPH).not.toBe(DEFAULT_GLYPH);
  });
});
