import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { CosmeticListItem } from '@ingame/shared';
import prefsReducer from './store/prefsSlice';

// COSM-05 (M6 W-5, decision 0080) — the Styler ultimate-colour beat, driven through the REAL Styler
// route (the device-sticker-flow harness idiom: query/router/api mocked, screen real):
//   • the shared ColorField mounts in the section-extra slot ONLY while the SELECTED design carries
//     the server library's `colorCustomizable` flag (FRAME + PLATE); un-flagged designs render the
//     sections exactly as before (no picker);
//   • a pick writes the right composition field (frame.color / nameplate.plate / nameplate.ink) and
//     the explicit `cosmeticId` identity rides the apply (and is ABSENT for non-ultimate applies);
//   • the TITLE curated ink row upgrades to free-pick ink only while an ultimate FONT is equipped
//     (CARD-11 as amended — the OQ-137 unlock);
//   • an unowned ultimate design previews live and KEEP routes through the STANDARD CARD-13
//     ReconcileSheet priced at the 10-PX ultimate band (no bespoke purchase path).

// ── mocks (reference-stable values — the device-sticker-flow rule; `mock`-prefixed so jest's
// hoisted factories may reference them) ─────────────────────────────────────────────────────────
const mockUpdateCard = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const mockUpdateTuple = [mockUpdateCard, { isLoading: false }];
const tuple = () => [jest.fn(() => ({ unwrap: () => Promise.resolve({}) })), { isLoading: false }];
const mockCreateTuple = tuple();
const mockSaveTuple = tuple();
const mockDelTuple = tuple();
const mockEntryTuple = tuple();
const mockPresetTuple = tuple();
const mockAcquireTuple = tuple();
const mockPublishTuple = tuple();

const DRAFT_COMP = {
  schemaVersion: 1,
  base: { gradient: ['#241a4d', '#0e0b1e'] },
  elements: [],
  nameplate: { shape: 'slab', fontId: 'clean-sans', title: 'GAME', plate: '#141026', ink: '#f3ecd9', size: 0.05 },
};

const LIB: CosmeticListItem[] = [
  { id: 'marquee', type: 'frame', name: 'MARQUEE', tier: 'showpiece', price: 8, owned: false },
  { id: 'marquee-ultimate', type: 'frame', name: 'MARQUEE ULTIMATE', tier: 'ultimate', price: 10, owned: false, colorCustomizable: true },
  { id: 'brass', type: 'nameplate', name: 'BRASS', tier: 'standard', price: 3, owned: false },
  { id: 'brass-ultimate', type: 'nameplate', name: 'BRASS ULTIMATE', tier: 'ultimate', price: 10, owned: false, colorCustomizable: true },
  { id: 'pacifico', type: 'font', name: 'SCRIPT', tier: 'standard', price: 3, owned: false },
  { id: 'pacifico-ultimate', type: 'font', name: 'SCRIPT ULTIMATE', tier: 'ultimate', price: 10, owned: false, colorCustomizable: true },
];

const mockShelf = { items: [{ gameId: 'g1', entryId: 'e1', title: 'GAME' }] };
const mockMyCards = { items: [{ id: 'c1', name: 'GAME', status: 'draft', composition: DRAFT_COMP }] };
const mockCosmetics = { data: { items: LIB } };
const mockWallet = { data: { balance: 40 } };

jest.mock('./store/api', () => ({
  useGetCollectionQuery: () => ({ data: mockShelf, isLoading: false, isError: false, refetch: jest.fn() }),
  useGetStylePresetsQuery: () => ({ data: [] }),
  useGetMyCardsQuery: () => ({ data: mockMyCards, isFetching: false, isSuccess: true }),
  useGetMeQuery: () => ({ data: undefined }),
  useGetCosmeticsQuery: () => mockCosmetics,
  useGetWalletQuery: () => mockWallet,
  useCreateCardMutation: () => mockCreateTuple,
  useUpdateCardMutation: () => mockUpdateTuple,
  useSavePrivateCardMutation: () => mockSaveTuple,
  useDeleteCardMutation: () => mockDelTuple,
  useUpdateEntryMutation: () => mockEntryTuple,
  useCreateStylePresetMutation: () => mockPresetTuple,
  useAcquireCosmeticBatchMutation: () => mockAcquireTuple,
  usePublishCardMutation: () => mockPublishTuple,
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ gameId: 'g1', cardId: 'c1' }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));

// The skia consumers stay hermetic (the AttributeSection.test precedent) — the tile strip and the
// hero card are display-only here; parseComposition (the resume path) stays REAL.
jest.mock('./components/canvas/lazySkia', () => ({ LazyCompositionStrip: () => null }));
jest.mock('./components/CardFace', () => {
  const actual = jest.requireActual('./components/CardFace');
  return { ...actual, CardFace: () => null };
});
// The canvas posture is not under test — keep its heavy surface out of the module graph.
jest.mock('./components/canvas/CanvasSurface', () => ({ CanvasSurface: () => null }));
jest.mock('./components/canvas/PrintRitual', () => ({ PrintRitual: () => null }));
jest.mock('./store/shareCard', () => ({ shareCardImage: jest.fn() }));

import Styler from '../app/styler/[gameId]';

function renderStyler() {
  const store = configureStore({
    reducer: {
      prefs: prefsReducer,
      auth: (s: { accessToken: string | null } = { accessToken: null }) => s,
    },
  });
  return render(
    <Provider store={store}>
      <Styler />
    </Provider>,
  );
}

/** Flush the debounced autosave (1200ms) + its PATCH promise; returns the last saved composition. */
async function flushAutosave(): Promise<any> {
  await act(async () => {
    jest.advanceTimersByTime(1500);
  });
  const calls = mockUpdateCard.mock.calls as unknown as Array<[{ cardId: string; composition: any }]>;
  expect(calls.length).toBeGreaterThan(0);
  return calls[calls.length - 1]![0].composition;
}

// The route renders the full Styler (rails + sections + pickers) — ~1s standalone but past the 5s
// default under a loaded parallel run (Murr W-5 MED: intermittent CI red). Generous, not masking.
jest.setTimeout(20000);

beforeEach(() => {
  jest.useFakeTimers();
  mockUpdateCard.mockClear();
});
afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

describe('COSM-05: the FRAME colour beat', () => {
  it('mounts the picker ONLY for the flagged design, writes cosmeticId on apply, none for base', async () => {
    renderStyler();
    expect(screen.getByText('FRAME — THE BORDER OBJECT')).toBeTruthy();
    // no design selected that is flagged → no colour row
    expect(screen.queryByText('COLOUR')).toBeNull();

    // apply MARQUEE ULTIMATE → the ColorField mounts in the section-extra slot
    fireEvent.press(screen.getByLabelText(/^MARQUEE ULTIMATE,/));
    expect(screen.getByText('COLOUR')).toBeTruthy();
    expect(screen.getByLabelText('PICK COLOUR')).toBeTruthy();
    // the apply wrote the explicit identity + seeded the registry default gold
    let comp = await flushAutosave();
    expect(comp.frame).toEqual({ kind: 'marquee', color: '#e8c14a', width: 0.045, cosmeticId: 'marquee-ultimate' });

    // base MARQUEE: byte-identical to before — no picker, no cosmeticId
    fireEvent.press(screen.getByLabelText(/^MARQUEE,/));
    expect(screen.queryByText('COLOUR')).toBeNull();
    comp = await flushAutosave();
    expect(comp.frame).toEqual({ kind: 'marquee', color: '#e8c14a', width: 0.045 });
  });

  it('a picked colour writes frame.color, keeps the identity, and the derive keeps the tile selected', async () => {
    renderStyler();
    fireEvent.press(screen.getByLabelText(/^MARQUEE ULTIMATE,/));
    fireEvent.press(screen.getByLabelText('PICK COLOUR'));
    const hex = screen.getByLabelText('Hex colour');
    fireEvent.changeText(hex, '00ff00');
    fireEvent(hex, 'submitEditing');

    const comp = await flushAutosave();
    expect(comp.frame.color).toBe('#00ff00');
    expect(comp.frame.cosmeticId).toBe('marquee-ultimate');
    // selection derive is cosmeticId-first: the recoloured design still reads as ITSELF (selected =
    // the PREVIEW badge state for an unowned premium tile)
    expect(screen.getByLabelText(/^MARQUEE ULTIMATE, premium preview/)).toBeTruthy();
  });
});

describe('COSM-05: the PLATE colour beat', () => {
  it('BRASS ULTIMATE mounts the picker + seeds the registry gold; leaving it restores the default plate', async () => {
    renderStyler();
    fireEvent.press(screen.getByText('PLATE'));
    expect(screen.queryByText('COLOUR')).toBeNull();

    fireEvent.press(screen.getByLabelText(/^BRASS ULTIMATE,/));
    expect(screen.getByText('COLOUR')).toBeTruthy();
    let comp = await flushAutosave();
    expect(comp.nameplate.shape).toBe('brass');
    expect(comp.nameplate.cosmeticId).toBe('brass-ultimate');
    expect(comp.nameplate.plate).toBe('#c9971f'); // the legacy brass gold — pixel-identical first apply

    // recolour the plate
    fireEvent.press(screen.getByLabelText('PICK COLOUR'));
    const hex = screen.getByLabelText('Hex colour');
    fireEvent.changeText(hex, '3a86ff');
    fireEvent(hex, 'submitEditing');
    comp = await flushAutosave();
    expect(comp.nameplate.plate).toBe('#3a86ff');
    expect(comp.nameplate.cosmeticId).toBe('brass-ultimate');
    expect(screen.getByLabelText(/^BRASS ULTIMATE, premium preview/)).toBeTruthy();

    // base BRASS: no picker, identity dropped, the styler default plate colour restored
    fireEvent.press(screen.getByLabelText(/^BRASS,/));
    expect(screen.queryByText('COLOUR')).toBeNull();
    comp = await flushAutosave();
    expect(comp.nameplate.shape).toBe('brass');
    expect(comp.nameplate.cosmeticId).toBeUndefined();
    expect(comp.nameplate.plate).toBe('#141026');
  });
});

describe('COSM-05: the TITLE ink unlock (CARD-11 as amended)', () => {
  it('curated inks stand until an ULTIMATE font is equipped; then free-pick ink writes nameplate.ink', async () => {
    renderStyler();
    fireEvent.press(screen.getByText('TITLE'));
    // the default font (clean-sans) keeps the curated set — no picker
    expect(screen.getByLabelText('CREAM ink')).toBeTruthy();
    expect(screen.queryByLabelText('PICK COLOUR')).toBeNull();

    // a premium-but-NOT-ultimate font also keeps the curated set
    fireEvent.press(screen.getByLabelText(/^SCRIPT,/));
    expect(screen.getByLabelText('CREAM ink')).toBeTruthy();
    expect(screen.queryByLabelText('PICK COLOUR')).toBeNull();

    // SCRIPT ULTIMATE equips → the row upgrades to the ColorField
    fireEvent.press(screen.getByLabelText(/^SCRIPT ULTIMATE,/));
    expect(screen.queryByLabelText('CREAM ink')).toBeNull();
    expect(screen.getByText('INK — ANY COLOUR')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('PICK COLOUR'));
    const hex = screen.getByLabelText('Hex colour');
    fireEvent.changeText(hex, '12e0b8');
    fireEvent(hex, 'submitEditing');
    const comp = await flushAutosave();
    expect(comp.nameplate.fontId).toBe('pacifico-ultimate');
    expect(comp.nameplate.ink).toBe('#12e0b8');
  });

  it('leaving the ULTIMATE font RESTORES a free-picked ink to CREAM (Murr W-5 HIGH — preview must match publish)', async () => {
    renderStyler();
    fireEvent.press(screen.getByText('TITLE'));
    // equip SCRIPT ULTIMATE and free-pick an off-list ink
    fireEvent.press(screen.getByLabelText(/^SCRIPT ULTIMATE,/));
    fireEvent.press(screen.getByLabelText('PICK COLOUR'));
    const hex = screen.getByLabelText('Hex colour');
    fireEvent.changeText(hex, '12e0b8');
    fireEvent(hex, 'submitEditing');
    // switch away to a premium-but-NOT-ultimate font — the stranded teal would render in the preview
    // but the server flatten forces CREAM at publish; the client must restore it in the same patch.
    fireEvent.press(screen.getByLabelText(/^SCRIPT,/));
    const comp = await flushAutosave();
    expect(comp.nameplate.fontId).toBe('pacifico');
    expect(comp.nameplate.ink).toBe('#f3ecd9'); // CREAM — the curated default, matching the server force
    // and the curated row is back (no orphaned free-pick UI)
    expect(screen.getByLabelText('CREAM ink')).toBeTruthy();
    expect(screen.queryByText('INK — ANY COLOUR')).toBeNull();
  });

  it('leaving the ULTIMATE font KEEPS a curated ink (only off-list picks restore)', async () => {
    renderStyler();
    fireEvent.press(screen.getByText('TITLE'));
    fireEvent.press(screen.getByLabelText(/^SCRIPT ULTIMATE,/));
    fireEvent.press(screen.getByLabelText('PICK COLOUR'));
    const hex = screen.getByLabelText('Hex colour');
    fireEvent.changeText(hex, 'e8c14a'); // GOLD — ON the curated set
    fireEvent(hex, 'submitEditing');
    fireEvent.press(screen.getByLabelText(/^SCRIPT,/));
    const comp = await flushAutosave();
    expect(comp.nameplate.ink).toBe('#e8c14a'); // curated picks survive the switch-away
  });
});

describe('COSM-05: preview-then-acquire at the 10-PX ultimate band (CARD-13 unchanged)', () => {
  it('KEEP with an unowned ultimate design opens the STANDARD ReconcileSheet priced 10', async () => {
    renderStyler();
    fireEvent.press(screen.getByLabelText(/^MARQUEE ULTIMATE,/));
    // the running cost-stack reads the ultimate band price
    expect(screen.getByText('PREMIUM IN THIS CARD')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();

    fireEvent.press(screen.getByText('SAVE ▸')); // ScreenButton uppercases its label
    fireEvent.press(screen.getByLabelText('Keep — equip it ◆')); // SaveOption a11y label keeps case
    // the standard CARD-13 reconcile — funded branch (balance 40 ≥ 10), priced at the 10-PX band
    expect(screen.getByText('PREMIUM COMPONENTS')).toBeTruthy(); // the PulledSheet title, uppercased
    expect(screen.getByText('TOTAL')).toBeTruthy();
    expect(screen.getByText(/(HOLD TO BUY|BUY|CONFIRM) · 10 PX/)).toBeTruthy();
  });
});
