import React from 'react';
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from './store/prefsSlice';

// 0.81 (owner walk m6) — the COMMUNITY CARDS full list (/game/[id]/cards): the contributor VIEW-ALL
// pattern over GET /games/:gameId/cards?sort&cursor&limit — cursor pages of 24 accumulated by
// useContributorPaging, a REAL TOP/NEW sort switch, GalleryCell rows, and adopt capability gated by
// the `?adopt=1` display param (CATALOG stays browse-only; the server is the enforcement boundary).

const CARD = (id: string, name: string, designer = 'nova') => ({
  id,
  name,
  imageUrl: null,
  thumbUrl: null,
  isPremium: false,
  adoptionCount: 3,
  priceForYou: 0,
  components: [],
  designer: { userId: `u-${designer}`, username: designer },
  byViewer: false,
  adopted: false,
});

let mockParams: { id: string; adopt?: string; entryId?: string } = { id: 'g1', adopt: '1' };
let mockPage1: {
  data?: { items: unknown[]; total?: number; nextCursor?: string | null };
  isLoading: boolean;
  isError: boolean;
  refetch?: () => void;
} = { data: { items: [], total: 0, nextCursor: null }, isLoading: false, isError: false };
let mockPage2: { items: unknown[]; total?: number; nextCursor?: string | null } = {
  items: [],
  nextCursor: null,
};

const mockGalleryHook = jest.fn(() => mockPage1);
const mockTrigger = jest.fn(() => ({ unwrap: () => Promise.resolve(mockPage2) }));
const mockAdopt = jest.fn(() => ({ unwrap: () => Promise.resolve({ granted: [], totalPaid: 0, balance: 500 }) }));
const mockUpdateEntry = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const mockBlockUser = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const mockSubmitReport = jest.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockDismissTo = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn(), dismissTo: mockDismissTo }),
}));
jest.mock('./store/api', () => ({
  useGetWalletQuery: () => ({ data: { balance: 500 } }),
  useUpdateEntryMutation: () => [mockUpdateEntry, { isLoading: false }],
}));
jest.mock('./store/communityApi', () => ({
  useGetGameGalleryQuery: (...args: unknown[]) => mockGalleryHook(...(args as [])),
  useLazyGetGameGalleryQuery: () => [mockTrigger, { isFetching: false }],
  useAdoptCardMutation: () => [mockAdopt, { isLoading: false }],
  useBlockUserMutation: () => [mockBlockUser, { isLoading: false }],
}));
jest.mock('./store/reportApi', () => ({
  useSubmitReportMutation: () => [mockSubmitReport, { isLoading: false }],
}));
// Walk-4 P4-d — the preview drawer's SHARE is a real affordance now, so this route wires the real
// share path (token from the auth slice + the off-store shareCardImage helper). Both are stood in.
jest.mock('./store/hooks', () => ({ useAppSelector: () => 'tok', useAppDispatch: () => jest.fn() }));
const mockShare = jest.fn(() => Promise.resolve('shared'));
jest.mock('./store/shareCard', () => ({ shareCardImage: (...a: unknown[]) => mockShare(...(a as [])) }));
// Stub the sheet (the hold-to-adopt UX is its own tested surface) — visible+card renders a marker,
// plus a SHARE proxy so the route's share wiring is observable without the drawer's internals.
jest.mock('./components/game/AdoptCardSheet', () => {
  const React2 = require('react');
  const { Text, Pressable } = require('react-native');
  return {
    AdoptCardSheet: ({ card, visible, onShare, shareBusy, onAdopt, onAdopted, onClose, onBlock, onReport, settleNote }: any) =>
      visible && card
        ? React2.createElement(
            React2.Fragment,
            null,
            React2.createElement(Text, null, `ADOPT SHEET — ${card.name}`),
            settleNote ? React2.createElement(Text, null, `SETTLE — ${settleNote}`) : null,
            React2.createElement(
              Pressable,
              { accessibilityLabel: 'sheet-share', onPress: onShare },
              React2.createElement(Text, null, shareBusy ? 'SHEET-SHARING' : 'SHEET-SHARE'),
            ),
            onBlock
              ? React2.createElement(
                  Pressable,
                  { accessibilityLabel: 'sheet-block', onPress: onBlock },
                  React2.createElement(Text, null, 'SHEET-BLOCK'),
                )
              : null,
            onReport
              ? React2.createElement(
                  Pressable,
                  { accessibilityLabel: 'sheet-report', onPress: onReport },
                  React2.createElement(Text, null, 'SHEET-REPORT'),
                )
              : null,
            React2.createElement(
              Pressable,
              {
                accessibilityLabel: 'do-adopt',
                onPress: async () => {
                  const r = await onAdopt();
                  if (r?.ok) onAdopted(r.result, card);
                },
              },
              React2.createElement(Text, null, 'DO-ADOPT'),
            ),
            React2.createElement(
              Pressable,
              { accessibilityLabel: 'sheet-done', onPress: onClose },
              React2.createElement(Text, null, 'SHEET-DONE'),
            ),
          )
        : null,
  };
});

import GameCardsList from '../app/game/[id]/cards';

function renderList() {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  return rtlRender(
    <Provider store={store}>
      <GameCardsList />
    </Provider>,
  );
}

beforeEach(() => {
  mockGalleryHook.mockClear();
  mockTrigger.mockClear();
  mockAdopt.mockClear();
  mockUpdateEntry.mockClear();
  mockBlockUser.mockClear();
  mockSubmitReport.mockClear();
  mockPush.mockClear();
  mockBack.mockClear();
  mockDismissTo.mockClear();
  mockParams = { id: 'g1', adopt: '1' };
  mockPage1 = { data: { items: [], total: 0, nextCursor: null }, isLoading: false, isError: false };
  mockPage2 = { items: [], nextCursor: null };
});

describe('the full list — page 1, TOP default, honest count', () => {
  it('subscribes page 1 as { gameId, sort: top, limit: 24 } and renders the cells + count', () => {
    mockPage1 = {
      data: { items: [CARD('c1', 'Alpha'), CARD('c2', 'Beta', 'riko')], total: 2, nextCursor: null },
      isLoading: false,
      isError: false,
    };
    renderList();
    expect(mockGalleryHook).toHaveBeenCalledWith(
      { gameId: 'g1', sort: 'top', limit: 24 },
      expect.anything(),
    );
    expect(screen.getByText('COMMUNITY CARDS')).toBeTruthy();
    expect(screen.getByText('2 CARDS')).toBeTruthy();
    expect(screen.getByLabelText(/Alpha by nova/i)).toBeTruthy();
    expect(screen.getByLabelText(/Beta by riko/i)).toBeTruthy();
    expect(screen.getByText("That's everything.")).toBeTruthy();
  });

  it('the sort switch flips the page-1 subscription to NEW (server-side re-rank)', () => {
    mockPage1 = {
      data: { items: [CARD('c1', 'Alpha')], total: 1, nextCursor: null },
      isLoading: false,
      isError: false,
    };
    renderList();
    fireEvent.press(screen.getByText('NEW'));
    expect(mockGalleryHook).toHaveBeenLastCalledWith(
      { gameId: 'g1', sort: 'new', limit: 24 },
      expect.anything(),
    );
  });
});

describe('cursor paging — LOAD MORE folds the next page in (the contributor accumulation)', () => {
  it('page 1 with a nextCursor shows LOAD MORE; pressing it fetches the cursor page and appends', async () => {
    mockPage1 = {
      data: { items: [CARD('c1', 'Alpha')], total: 2, nextCursor: '24' },
      isLoading: false,
      isError: false,
    };
    mockPage2 = { items: [CARD('c2', 'Beta', 'riko')], nextCursor: null };
    renderList();

    fireEvent.press(screen.getByText('LOAD MORE'));
    expect(mockTrigger).toHaveBeenCalledWith({ gameId: 'g1', sort: 'top', limit: 24, cursor: '24' });

    // the tail folds in under the page-1 head; the cursor exhausts → the terminal read
    expect(await screen.findByLabelText(/Beta by riko/i)).toBeTruthy();
    expect(screen.getByLabelText(/Alpha by nova/i)).toBeTruthy();
    expect(screen.getByText("That's everything.")).toBeTruthy();
    expect(screen.queryByText('LOAD MORE')).toBeNull();
  });
});

describe('adopt capability — the ?adopt=1 display gate (W-D1 Q4 carried to the full list)', () => {
  it('with ?adopt=1 a cell tap opens the adopt sheet', () => {
    mockPage1 = {
      data: { items: [CARD('c1', 'Alpha')], total: 1, nextCursor: null },
      isLoading: false,
      isError: false,
    };
    renderList();
    fireEvent.press(screen.getByLabelText(/Alpha by nova/i));
    expect(screen.getByText('ADOPT SHEET — Alpha')).toBeTruthy();
  });

  it('without the param (the CATALOG door) the cells are browse-only — no sheet ever opens', () => {
    mockParams = { id: 'g1' };
    mockPage1 = {
      data: { items: [CARD('c1', 'Alpha')], total: 1, nextCursor: null },
      isLoading: false,
      isError: false,
    };
    renderList();
    fireEvent.press(screen.getByLabelText(/Alpha by nova/i));
    expect(screen.queryByText(/ADOPT SHEET/)).toBeNull();
  });
});

describe('Walk-4 P4-d — the preview drawer’s SHARE actually shares from this surface', () => {
  it('the sheet’s share runs the authenticated share path for THAT card (it was a no-op before)', async () => {
    mockPage1 = {
      data: { items: [CARD('c1', 'Alpha')], total: 1, nextCursor: null },
      isLoading: false,
      isError: false,
    };
    renderList();
    fireEvent.press(screen.getByLabelText(/Alpha by nova/i));
    fireEvent.press(screen.getByLabelText('sheet-share'));
    expect(mockShare).toHaveBeenCalledWith('c1', 'Alpha', 'tok');
    // let the share promise settle so the busy flag clears inside act()
    expect(await screen.findByText('SHEET-SHARE')).toBeTruthy();
  });
});

// WALK-4 P2 — this route is the add flow's SEE-ALL door. `?entryId=` says "this list is the flow's
// WHAT FACE question": an adopt here chains the COL-06 equip and ENDS the whole flow in the Collection,
// so the fork is never revisited (W3-J's lying "keep the default for now" becomes unreachable).
describe('walk-4 P2 — the add-flow context (?adopt=1&entryId=…)', () => {
  const ONE_CARD = {
    data: { items: [CARD('c1', 'Alpha')], total: 1, nextCursor: null },
    isLoading: false,
    isError: false,
  };

  it('adopting CHAINS the COL-06 equip onto the flow’s entry, and Done dismisses the WHOLE add stack', async () => {
    mockParams = { id: 'g1', adopt: '1', entryId: 'e9' };
    mockPage1 = ONE_CARD;
    renderList();

    fireEvent.press(screen.getByLabelText(/Alpha by nova/i));
    fireEvent.press(screen.getByLabelText('do-adopt'));
    expect(mockAdopt).toHaveBeenCalledWith('c1');
    await waitFor(() =>
      expect(mockUpdateEntry).toHaveBeenCalledWith({ entryId: 'e9', activeCardDesignId: 'c1' }),
    );
    expect(await screen.findByText(/SETTLE — It’s on your shelf/)).toBeTruthy();

    fireEvent.press(screen.getByLabelText('sheet-done'));
    expect(mockDismissTo).toHaveBeenCalledWith({
      pathname: '/(tabs)/collection',
      params: { justAdded: 'e9' },
    });
  });

  it('WITHOUT the context (the game-page door) nothing equips and nothing dismisses — Done just closes', async () => {
    mockParams = { id: 'g1', adopt: '1' };
    mockPage1 = ONE_CARD;
    renderList();

    fireEvent.press(screen.getByLabelText(/Alpha by nova/i));
    fireEvent.press(screen.getByLabelText('do-adopt'));
    await waitFor(() => expect(mockAdopt).toHaveBeenCalledWith('c1'));
    expect(mockUpdateEntry).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText('sheet-done'));
    expect(mockDismissTo).not.toHaveBeenCalled();
    expect(screen.queryByText(/ADOPT SHEET/)).toBeNull();
  });

  it('in the add flow, LEAVING without adopting ends nothing (the face is still unanswered)', () => {
    mockParams = { id: 'g1', adopt: '1', entryId: 'e9' };
    mockPage1 = ONE_CARD;
    renderList();

    fireEvent.press(screen.getByLabelText(/Alpha by nova/i));
    fireEvent.press(screen.getByLabelText('sheet-done')); // closed without adopting
    expect(mockDismissTo).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('‹ RETURN')); // …and Return goes back to the fork as before
    expect(mockBack).toHaveBeenCalled();
  });
});

// WALK-4 P2 (the folded-in extra) — this surface shipped `onBlock={() => setInspectCard(null)}`: a ⋯
// that closed the drawer and blocked nobody, with no report row at all. The game page's wiring is
// mirrored here so both affordances are REAL.
describe('walk-4 P2 — the sheet’s BLOCK/REPORT are real on this surface', () => {
  const ONE_CARD = {
    data: { items: [CARD('c1', 'Alpha')], total: 1, nextCursor: null },
    isLoading: false,
    isError: false,
  };

  it('BLOCK raises the destructive confirm, and confirming actually blocks the designer (SOC-09)', async () => {
    mockPage1 = ONE_CARD;
    renderList();
    fireEvent.press(screen.getByLabelText(/Alpha by nova/i));
    fireEvent.press(screen.getByLabelText('sheet-block'));

    // the confirm names the designer — the sheet did NOT just silently close
    expect(await screen.findByText('BLOCK NOVA?')).toBeTruthy();
    fireEvent.press(screen.getByText('BLOCK'));
    await waitFor(() => expect(mockBlockUser).toHaveBeenCalledWith('u-nova'));
  });

  it('REPORT closes the drawer and raises the MOD-01 report sheet for that CARD', async () => {
    mockPage1 = ONE_CARD;
    renderList();
    fireEvent.press(screen.getByLabelText(/Alpha by nova/i));
    fireEvent.press(screen.getByLabelText('sheet-report'));

    expect(screen.queryByText(/ADOPT SHEET/)).toBeNull(); // one drawer at a time
    expect(await screen.findByText(/report this card/i)).toBeTruthy();
  });
});
