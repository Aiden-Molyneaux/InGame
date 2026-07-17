import { SHELL_TIERS, SCREEN_THEME_TIERS } from './palettes';

// decision 0075 (P10) — device shell/screen-theme tiering. Confirms the exact free/premium split the
// roster-tiering pass pins (GRAPE moved to free, SUNSET moved to premium; the theme amendment: 4
// premium themes). Card-side coverage (frames/effects/finishes/nameplates/fonts) lives in
// render/composition.test.ts's "decision 0075 — roster tiering (P10)" block; together the two suites
// cover all 26 premium items (19 card-side + 7 device-side).

describe('decision 0075 — device shell/theme tiering (P10)', () => {
  it('shells: TEAL + GRAPE free, SUNSET/PINK/CARBON premium', () => {
    expect(SHELL_TIERS.teal).toBe('basic');
    expect(SHELL_TIERS.grape).toBe('basic');
    expect(SHELL_TIERS.sunset).toBe('premium');
    expect(SHELL_TIERS.pink).toBe('premium');
    expect(SHELL_TIERS.carbon).toBe('premium');
  });

  it('themes: MIDNIGHT + PAPER free, DEEP SEA/BERRY/MINT/LILAC premium', () => {
    expect(SCREEN_THEME_TIERS.midnight).toBe('basic');
    expect(SCREEN_THEME_TIERS.paper).toBe('basic');
    expect(SCREEN_THEME_TIERS.deepsea).toBe('premium');
    expect(SCREEN_THEME_TIERS.berry).toBe('premium');
    expect(SCREEN_THEME_TIERS.mint).toBe('premium');
    expect(SCREEN_THEME_TIERS.lilac).toBe('premium');
  });

  it('the premium count matches the 0075 seed exactly: 3 shells + 4 themes = 7', () => {
    const premiumShells = Object.values(SHELL_TIERS).filter((t) => t === 'premium').length;
    const premiumThemes = Object.values(SCREEN_THEME_TIERS).filter((t) => t === 'premium').length;
    expect(premiumShells).toBe(3);
    expect(premiumThemes).toBe(4);
  });
});
