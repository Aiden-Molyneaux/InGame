import React from 'react';
import { render, act, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from './store/prefsSlice';
import { StoreThemePreviewProvider, useStorePreview } from './components/StoreThemePreview';
import { useTheme } from './theme';
import { SCREEN_THEMES } from './theme/palettes';

// walk2 regression (store theme-preview leak) — the app-wide store preview override (F-13 C7) has ONE
// clearer coupled to the item-sheet's openItem→null transition; a glitched close that strands the sheet
// open, or a blurred-but-still-mounted /store (expo-router keeps routes mounted), leaves the previewed
// theme (Berry) painting the WHOLE app while redux prefs + the server device stay Midnight — the exact
// desync the owner saw (app Berry, "My Device" Midnight). The fix adds a screen-scoped useFocusEffect
// backstop in Store() that unconditionally clears the override on BLUR/UNMOUNT, mirroring device.tsx.
//
// This drives the REAL Store screen and the STRANDED-SHEET path: a provider-level setter forces the
// preview to Berry and NEVER clears it (standing in for a sheet whose own openItem-null clearer never
// fires), so ONLY Store's blur/unmount backstop can revert it. It is RED on current main (no backstop →
// Berry stays after blur) and GREEN with the fix. Meaningful, high-risk surface (an economy-adjacent
// cosmetic leak across the whole app), not a trivial test (testing-strategy meaningful-tests-first).
//
// expo-router is mocked (the device-route.test precedent): Store also calls useLocalSearchParams, which
// needs expo-router's own context — a bare @react-navigation navigator can't satisfy it — so a real
// navigator is impractical here. Instead a controllable useFocusEffect faithfully models react-nav's
// focus/blur contract: it runs the effect on FOCUS (mount) and its returned cleanup on BLUR (manual
// fire) or UNMOUNT (React cleanup). On main, Store never registers a focus effect, so the registry stays
// empty and a blur is a no-op — which is precisely why the leak reproduces there. `mock`-prefixed so
// jest's hoisted factory may reference it.
const mockFocusReg: { effects: Array<{ cleanup: void | (() => void) }> } = { effects: [] };

jest.mock('expo-router', () => {
  const RReact = require('react');
  return {
    useLocalSearchParams: () => ({}),
    useFocusEffect: (cb: () => void | (() => void)) => {
      RReact.useEffect(() => {
        const entry: { cleanup: void | (() => void) } = { cleanup: cb() };
        mockFocusReg.effects.push(entry);
        return () => {
          if (typeof entry.cleanup === 'function') entry.cleanup();
          const i = mockFocusReg.effects.indexOf(entry);
          if (i >= 0) mockFocusReg.effects.splice(i, 1);
        };
      }, [cb]);
    },
  };
});

// Keep the wallet in its loading state so the REAL Store renders its lightweight skeleton branch — the
// focus backstop under test is a top-level hook that runs BEFORE that early return, so the light branch
// exercises it fully without dragging in the commerce/skia render surface.
jest.mock('./store/api', () => ({
  useGetWalletQuery: () => ({ data: undefined, isLoading: true, isError: false, refetch: jest.fn() }),
  useGetStoreQuery: () => ({ data: undefined }),
  useClaimDailyBonusMutation: () => [jest.fn(), { isLoading: false }],
  useValidateIapMutation: () => [jest.fn(), { isLoading: false }],
  useGetCosmeticsQuery: () => ({ data: undefined }),
  useGetDeviceQuery: () => ({ data: undefined }),
  useAcquireCosmeticMutation: () => [jest.fn(), { isLoading: false }],
  useLazyGetLedgerQuery: () => [jest.fn(), { data: undefined, isFetching: false }],
}));

import Store from '../app/store';

/** Fire a navigator "blur" — run every registered focus cleanup WITHOUT unmounting (expo-router keeps
 *  the route mounted while blurred; this is the stranded-mounted case). */
function fireBlur() {
  mockFocusReg.effects.forEach((e) => {
    if (typeof e.cleanup === 'function') e.cleanup();
    e.cleanup = undefined;
  });
}

/** Reads the app-wide RESOLVED theme (through useTheme, the exact leak surface) and reports its id. */
function Probe() {
  const { scr } = useTheme();
  const id = scr === SCREEN_THEMES.berry ? 'berry' : scr === SCREEN_THEMES.midnight ? 'midnight' : 'other';
  return <Text>{`THEME:${id}`}</Text>;
}

/** Forces the store preview to Berry once and NEVER clears it — the stranded preview whose sheet-owned
 *  clearer never fires. Mounted at provider level (outside the screen) so it survives the screen's blur. */
function StrandedBerryPreview() {
  const { setPreview } = useStorePreview();
  React.useEffect(() => {
    setPreview({ themeId: 'berry' });
  }, [setPreview]);
  return null;
}

function makeStore() {
  return configureStore({ reducer: { prefs: prefsReducer } });
}

function Harness({ showStore }: { showStore: boolean }) {
  return (
    <Provider store={makeStore()}>
      <StoreThemePreviewProvider>
        <StrandedBerryPreview />
        <Probe />
        {showStore ? <Store /> : null}
      </StoreThemePreviewProvider>
    </Provider>
  );
}

beforeEach(() => {
  mockFocusReg.effects = [];
});

describe('Store — theme-preview teardown backstop (walk2 leak fix)', () => {
  it('paints the preview app-wide on focus, then clears it on BLUR even when the sheet never nulls its item', () => {
    render(<Harness showStore />);
    // (a) preview is live app-wide (the legitimate F-13 C7 behaviour is preserved).
    expect(screen.getByText('THEME:berry')).toBeTruthy();

    // (b) leave /store WITHOUT the sheet ever committing openItem→null (the glitched/stranded close):
    // only the blur backstop can revert the override. On main this is a no-op and Berry stays (RED).
    act(() => fireBlur());
    expect(screen.getByText('THEME:midnight')).toBeTruthy();
  });

  it('clears the preview on UNMOUNT of the store screen', () => {
    const { rerender } = render(<Harness showStore />);
    expect(screen.getByText('THEME:berry')).toBeTruthy();

    // Unmount only the Store screen (provider + probe survive) — the focus cleanup runs on unmount too.
    act(() => rerender(<Harness showStore={false} />));
    expect(screen.getByText('THEME:midnight')).toBeTruthy();
  });
});
