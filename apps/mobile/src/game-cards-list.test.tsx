import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react-native';
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

let mockParams: { id: string; adopt?: string } = { id: 'g1', adopt: '1' };
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
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn() }),
}));
jest.mock('./store/api', () => ({
  useGetWalletQuery: () => ({ data: { balance: 500 } }),
}));
jest.mock('./store/communityApi', () => ({
  useGetGameGalleryQuery: (...args: unknown[]) => mockGalleryHook(...(args as [])),
  useLazyGetGameGalleryQuery: () => [mockTrigger, { isFetching: false }],
  useAdoptCardMutation: () => [mockAdopt, { isLoading: false }],
}));
// Stub the sheet (the hold-to-adopt UX is its own tested surface) — visible+card renders a marker.
jest.mock('./components/game/AdoptCardSheet', () => {
  const React2 = require('react');
  const { Text } = require('react-native');
  return {
    AdoptCardSheet: ({ card, visible }: { card: { name: string } | null; visible: boolean }) =>
      visible && card ? React2.createElement(Text, null, `ADOPT SHEET — ${card.name}`) : null,
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
  mockPush.mockClear();
  mockBack.mockClear();
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
