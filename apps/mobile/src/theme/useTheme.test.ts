import { theme } from './index';
import { SCREEN_THEMES, SHELL_PALETTES, DEFAULT_THEME_ID, DEFAULT_SHELL_ID } from './palettes';

// The theme-engine value-identity proof (device-manifest ARCH 1). The whole point of the sweep is ZERO
// visual change under the default Midnight/Teal: the live theme the engine composes under the defaults
// must be deep-equal to the static `theme` the ~54 converted files used to bake in. `useTheme()` itself
// composes `{ ...theme, scr: SCREEN_THEMES[id], shell: SHELL_PALETTES[id] }`; testing the composition
// against the same inputs (default ids) proves the identity without standing up a redux Provider.
describe('theme engine — value identity under defaults', () => {
  it('the default Midnight scr palette equals the static theme.scr (verbatim)', () => {
    expect(SCREEN_THEMES[DEFAULT_THEME_ID]).toEqual(theme.scr);
  });

  it('the default Teal shell palette equals the static theme.shell (verbatim)', () => {
    expect(SHELL_PALETTES[DEFAULT_SHELL_ID]).toEqual(theme.shell);
  });

  it('the composed default theme deep-equals the static theme (no visual change)', () => {
    const composed = {
      ...theme,
      scr: SCREEN_THEMES[DEFAULT_THEME_ID],
      shell: SHELL_PALETTES[DEFAULT_SHELL_ID],
    };
    expect(composed).toEqual(theme);
  });

  it('every screen theme carries exactly the 9 scr keys', () => {
    const keys = Object.keys(theme.scr).sort();
    for (const id of Object.keys(SCREEN_THEMES) as (keyof typeof SCREEN_THEMES)[]) {
      expect(Object.keys(SCREEN_THEMES[id]).sort()).toEqual(keys);
    }
  });

  it('every shell palette carries exactly the 8 shell keys', () => {
    const keys = Object.keys(theme.shell).sort();
    for (const id of Object.keys(SHELL_PALETTES) as (keyof typeof SHELL_PALETTES)[]) {
      expect(Object.keys(SHELL_PALETTES[id]).sort()).toEqual(keys);
    }
  });
});
