import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { DeviceResponse } from '@ingame/shared';
import prefsReducer from './store/prefsSlice';

// F-16 regression — the logout CRASH. DeviceEditor (app/device.tsx) stays MOUNTED behind the Profile
// screen (expo-router keeps a pushed route mounted while it's blurred). On sign-out `logoutTeardown()`
// calls `api.util.resetApiState()`, which flips this still-mounted editor's getDevice query back to
// `isLoading`. Before the fix, two `useAnnounceOnChange` hooks sat AFTER the `if (isLoading)` /
// `if (isError)` early returns — so the loading re-render rendered FEWER hooks than the loaded one and
// React threw "Rendered fewer hooks than expected", crashing the whole tree (which then broke the
// profile signOut's `router.replace`, the second error). The fix hoists every hook above the returns.
//
// This test drives the exact transition (loaded → loading / loaded → error) on the REAL DeviceEditor
// and asserts the re-render doesn't throw. It is RED before the fix (React throws during the loading
// re-render) and GREEN after. app/ routes aren't covered by react-hooks/rules-of-hooks lint, so this
// render-level guard is the tripwire. (Lives under src/ — NOT app/ — so expo-router never treats it as
// a route; test files under app/ break the router bundle.)

// A mutable query descriptor so a single mock reads the CURRENT desired state on every render.
// `mock`-prefixed so the hoisted jest.mock factory may close over it (jest's out-of-scope rule).
let mockDeviceQuery: { data?: DeviceResponse; isLoading: boolean; isError: boolean; refetch: () => void } = {
  data: undefined,
  isLoading: true,
  isError: false,
  refetch: jest.fn(),
};

const mockMutation = () => [jest.fn(() => ({ unwrap: () => Promise.resolve({}) })), { isLoading: false }];

jest.mock('./store/api', () => ({
  useGetDeviceQuery: () => mockDeviceQuery,
  useUpdateDeviceMutation: () => mockMutation(),
  useGetLooksQuery: () => ({ data: [] }),
  useSaveLookMutation: () => mockMutation(),
  useDeleteLookMutation: () => mockMutation(),
  useGetCosmeticsQuery: () => ({ data: { items: [] } }),
  useGetWalletQuery: () => ({ data: { balance: 0 } }),
  useAcquireCosmeticBatchMutation: () => mockMutation(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn() }),
  // device.tsx registers a blur-cleanup via useFocusEffect; the crash path doesn't need it to run.
  useFocusEffect: jest.fn(),
}));

import DeviceEditor from '../app/device';

const DEVICE: DeviceResponse = {
  activeShellId: 'grape',
  screenThemeId: 'midnight',
  stickerComposition: { version: 1, stickers: [] },
} as DeviceResponse;

function wrap(ui: React.ReactElement) {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  return <Provider store={store}>{ui}</Provider>;
}

describe('DeviceEditor — hooks stability across the logout resetApiState transition (F-16)', () => {
  it('does not crash when the getDevice query flips loaded → loading while mounted', () => {
    mockDeviceQuery = { data: DEVICE, isLoading: false, isError: false, refetch: jest.fn() };
    const { rerender } = render(wrap(<DeviceEditor />));

    // Simulate logout's api.util.resetApiState() on the still-mounted editor.
    mockDeviceQuery = { data: undefined, isLoading: true, isError: false, refetch: jest.fn() };
    expect(() => rerender(wrap(<DeviceEditor />))).not.toThrow();
  });

  it('does not crash on the loaded → error transition either (same early-return class)', () => {
    mockDeviceQuery = { data: DEVICE, isLoading: false, isError: false, refetch: jest.fn() };
    const { rerender } = render(wrap(<DeviceEditor />));

    mockDeviceQuery = { data: undefined, isLoading: false, isError: true, refetch: jest.fn() };
    expect(() => rerender(wrap(<DeviceEditor />))).not.toThrow();
  });
});
