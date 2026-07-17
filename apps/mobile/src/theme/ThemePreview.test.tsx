import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { ReactNode } from 'react';
import { useTheme } from './useTheme';
import { ThemePreview } from './ThemePreview';
import { SCREEN_THEMES, SHELL_PALETTES } from './palettes';
import prefsReducer from '../store/prefsSlice';

// ThemePreview (F-10 live inspect, decision 0076) — a subtree override that repaints to a previewed
// theme/shell WITHOUT touching the persisted prefs. The store's screen-theme item-sheet uses it so
// "PREVIEWING — BERRY" actually paints BERRY. The review bar: OUTSIDE a provider, useTheme is unchanged
// (the redux prefs win); INSIDE, the override wins.

const store = configureStore({ reducer: { prefs: prefsReducer } });
const withStore = (extra?: (c: ReactNode) => ReactNode) => ({ children }: { children: ReactNode }) => (
  <Provider store={store}>{extra ? extra(children) : children}</Provider>
);

describe('ThemePreview — subtree theme override', () => {
  it('without a provider, useTheme reads the persisted prefs (the default, unchanged)', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: withStore() });
    // default prefs = Midnight/Teal
    expect(result.current.scr).toEqual(SCREEN_THEMES.midnight);
    expect(result.current.shell).toEqual(SHELL_PALETTES.teal);
  });

  it('inside <ThemePreview themeId="berry">, useTheme returns the BERRY palette', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: withStore((c) => <ThemePreview themeId="berry">{c}</ThemePreview>),
    });
    expect(result.current.scr).toEqual(SCREEN_THEMES.berry);
    expect(result.current.shell).toEqual(SHELL_PALETTES.teal); // shell not overridden → still prefs
  });

  it('inside <ThemePreview shellId="grape">, useTheme returns the GRAPE shell, prefs theme intact', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: withStore((c) => <ThemePreview shellId="grape">{c}</ThemePreview>),
    });
    expect(result.current.shell).toEqual(SHELL_PALETTES.grape);
    expect(result.current.scr).toEqual(SCREEN_THEMES.midnight);
  });

  it('an unknown override id resolves to the default (DEV-03), never a crash', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: withStore((c) => <ThemePreview themeId="not-a-theme">{c}</ThemePreview>),
    });
    expect(result.current.scr).toEqual(SCREEN_THEMES.midnight);
  });
});
