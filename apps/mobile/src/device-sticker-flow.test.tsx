import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { DeviceResponse } from '@ingame/shared';
import prefsReducer from './store/prefsSlice';
import { DeviceStickerProvider, useStickerContext } from './components/device/DeviceStickerContext';

// walk2 W-A7 — the explicit sticker SET/CONFIRM flow (⚖ 0078): placing/tapping a decal enters its
// transform state; the state EXITS through an explicit commit beat — tap-away commits, the visible
// ✓ SET key commits, and BLURRING the screen auto-commits + unpublishes the edit session (expo-router
// keeps the screen mounted while blurred, so pre-fix the shell bands kept their edit chrome on every
// other screen). Drives the REAL DeviceEditor with the query/router mocked. Lives under src/ (never
// app/ — a test file under app/ breaks the router bundle; the device-route.test.tsx precedent).

// Every mocked hook returns a REFERENCE-STABLE value: a fresh tuple per render makes `updateDevice`
// (→ flush → patchDevice → mutateSticker/commitNow) re-create every render, which re-runs the session
// effect every render — and with the REAL DeviceStickerProvider mounted (unlike device-route.test's
// no-op default context) that's an infinite publish→re-render loop (observed: jest OOM).
jest.mock('./store/api', () => {
  const tuple = () => [jest.fn(() => ({ unwrap: () => Promise.resolve({}) })), { isLoading: false }];
  const update = tuple();
  const save = tuple();
  const del = tuple();
  const acquire = tuple();
  const looks = { data: [] };
  const cosmetics = { data: { items: [] } };
  const wallet = { data: { balance: 0 } };
  const refetch = jest.fn();
  return {
    useGetDeviceQuery: () => ({ data: mockDevice, isLoading: false, isError: false, refetch }),
    useUpdateDeviceMutation: () => update,
    useGetLooksQuery: () => looks,
    useSaveLookMutation: () => save,
    useDeleteLookMutation: () => del,
    useGetCosmeticsQuery: () => cosmetics,
    useGetWalletQuery: () => wallet,
    useAcquireCosmeticBatchMutation: () => acquire,
  };
});

// useFocusEffect — registered WITHOUT auto-run so the test controls focus/blur while the screen stays
// MOUNTED (the real W-A7 scenario: expo-router blurs but never unmounts a pushed route). `focus()`
// runs every registered callback (collecting cleanups); `blur()` runs the cleanups.
type Cleanup = (() => void) | void;
const focusCallbacks: Array<() => Cleanup> = [];
let cleanups: Array<() => void> = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn() }),
  useFocusEffect: (cb: () => Cleanup) => {
    if (!focusCallbacks.includes(cb)) focusCallbacks.push(cb);
  },
}));
const focus = () =>
  act(() => {
    cleanups = focusCallbacks.map((cb) => cb()).filter((c): c is () => void => typeof c === 'function');
  });
const blur = () =>
  act(() => {
    cleanups.forEach((c) => c());
    cleanups = [];
  });

import DeviceEditor from '../app/device';

let mockDevice: DeviceResponse = {
  activeShellId: 'teal',
  screenThemeId: 'midnight',
  stickerComposition: { version: 1, stickers: [] },
} as DeviceResponse;

// Probe — reads the session the editor publishes to the shell bands (the app-wide edit chrome driver).
function SessionProbe() {
  const { session } = useStickerContext();
  return <Text>{`session:${session ? (session.selectedId ? 'selected' : 'idle') : 'none'}`}</Text>;
}

function renderEditor() {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  const ui = (
    <Provider store={store}>
      <DeviceStickerProvider>
        <SessionProbe />
        <DeviceEditor />
      </DeviceStickerProvider>
    </Provider>
  );
  const result = render(ui);
  return { store, ...result };
}

function openStickersAndPlace() {
  fireEvent.press(screen.getByText('STICKERS')); // the section rail key
  fireEvent.press(screen.getByLabelText('ROCKET')); // tray pick → places + auto-selects
}

beforeEach(() => {
  focusCallbacks.length = 0;
  cleanups = [];
  mockDevice = {
    activeShellId: 'teal',
    screenThemeId: 'midnight',
    stickerComposition: { version: 1, stickers: [] },
  } as DeviceResponse;
});

describe('W-A7: the explicit sticker set/confirm flow (⚖ 0078)', () => {
  it('placing a decal enters the transform state — chrome (steppers + ✓ SET) present, session selected', () => {
    renderEditor();
    focus();
    openStickersAndPlace();
    expect(screen.getByText('POSITION')).toBeTruthy();
    expect(screen.getByText('✓ SET')).toBeTruthy();
    expect(screen.getByText('session:selected')).toBeTruthy();
  });

  it('tap-AWAY commits: chrome leaves, the sticker persists', () => {
    const { store } = renderEditor();
    focus();
    openStickersAndPlace();
    // a tap on the body's empty space (the copy line sits on the tap-away Pressable)
    fireEvent.press(screen.getByText(/Tap a decal to place it/));
    expect(screen.queryByText('POSITION')).toBeNull();
    expect(screen.queryByText('✓ SET')).toBeNull();
    // the placement itself persisted (the commit ends the CHROME, never the data)
    expect(store.getState().prefs.stickerComposition?.stickers).toHaveLength(1);
    expect(screen.getByText('session:idle')).toBeTruthy();
  });

  it('the ✓ SET key commits: chrome leaves, the sticker persists', () => {
    const { store } = renderEditor();
    focus();
    openStickersAndPlace();
    fireEvent.press(screen.getByText('✓ SET'));
    expect(screen.queryByText('POSITION')).toBeNull();
    expect(store.getState().prefs.stickerComposition?.stickers).toHaveLength(1);
  });

  it('BLUR auto-commits: the edit session unpublishes (no edit chrome on other screens) and no editable state survives refocus', () => {
    const { store } = renderEditor();
    focus();
    openStickersAndPlace();
    expect(screen.getByText('session:selected')).toBeTruthy();

    blur(); // leave the editor — the screen stays MOUNTED (expo-router)
    // the session is GONE from the shell bands (pre-fix it stayed published, selected) …
    expect(screen.getByText('session:none')).toBeTruthy();
    // … the placement persisted …
    expect(store.getState().prefs.stickerComposition?.stickers).toHaveLength(1);

    focus(); // come back — no editable state was carried: the session returns IDLE, chrome stays down
    expect(screen.getByText('session:idle')).toBeTruthy();
    expect(screen.queryByText('POSITION')).toBeNull();
  });
});
