import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { GameDetail, GameGalleryResponse } from '@ingame/shared';
import prefsReducer from './store/prefsSlice';
import { AboutTab } from './components/game/AboutTab';
import { CommunityGallery } from './components/game/CommunityGallery';

// W-D1 — the shared ABOUT fill (real AboutTab renders the W-C5 game-detail aggregate) + the CATALOG Q4
// browse-only guard (real CommunityGallery: `canAdopt={false}` structurally removes the adopt path).

let mockDetail: { data?: GameDetail; isLoading: boolean; isError: boolean; refetch: () => void } = {
  data: undefined,
  isLoading: true,
  isError: false,
  refetch: jest.fn(),
};
let mockFriendsWhoOwn: { data?: { friendsWhoOwn: Array<{ userId: string; username: string; avatarUrl: string | null; hours?: number }>; count: number }; isLoading: boolean } = {
  data: { friendsWhoOwn: [], count: 0 },
  isLoading: false,
};
let mockGallery: { data?: GameGalleryResponse; isLoading: boolean; isError: boolean; refetch: () => void } = {
  data: { items: [] } as unknown as GameGalleryResponse,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

jest.mock('./store/catalogRailsApi', () => ({ useGetGameDetailQuery: () => mockDetail }));
jest.mock('./store/friendApi', () => ({ useGetFriendsWhoOwnQuery: () => mockFriendsWhoOwn }));
jest.mock('./store/communityApi', () => ({ useGetGameGalleryQuery: () => mockGallery }));
jest.mock('./components/game/FlatCardImage', () => ({
  FlatCardImage: () => null,
  pickFlatSource: () => null,
}));

const DETAIL: GameDetail = {
  id: 'g1',
  name: 'Destiny',
  studio: 'Bungie',
  publisher: 'Bungie',
  releaseDate: '2014-09-09',
  genres: [{ id: 'gn', name: 'Shooter' }],
  collectionsCount: 214,
  friendsHaveCount: 3,
  inCollection: false,
  contributor: { userId: 'mav-1', username: 'maverick' },
  friendsWhoOwn: [],
};

function wrap(ui: React.ReactElement) {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  return <Provider store={store}>{ui}</Provider>;
}

describe('W-D1 ABOUT tab — from the game-detail aggregate', () => {
  beforeEach(() => {
    mockDetail = { data: DETAIL, isLoading: false, isError: false, refetch: jest.fn() };
    mockFriendsWhoOwn = {
      data: { friendsWhoOwn: [{ userId: 'v1', username: 'vanta', avatarUrl: null, hours: 182 }], count: 3 },
      isLoading: false,
    };
  });

  it('renders the canonical facts, genre chips, contributor credit and CAT-09 presence counts', () => {
    render(wrap(<AboutTab gameId="g1" onViewContributor={jest.fn()} onOpenUser={jest.fn()} />));
    expect(screen.getByText('Destiny')).toBeTruthy();
    expect(screen.getByText('BUNGIE · 2014 · SHOOTER')).toBeTruthy();
    expect(screen.getByText('▸ BUNGIE')).toBeTruthy(); // studio chip
    expect(screen.getByText('MAVERICK')).toBeTruthy(); // CAT-05 contributor
    expect(screen.getByText('214')).toBeTruthy(); // collectionsCount
    expect(screen.getByText('IN COLLECTIONS')).toBeTruthy();
    expect(screen.getByText('FRIENDS HAVE IT')).toBeTruthy();
  });

  it('the contributor credit routes to the contributor profile', () => {
    const onViewContributor = jest.fn();
    render(wrap(<AboutTab gameId="g1" onViewContributor={onViewContributor} onOpenUser={jest.fn()} />));
    fireEvent.press(screen.getByLabelText(/Added to the catalog by maverick/));
    expect(onViewContributor).toHaveBeenCalledWith('mav-1');
  });

  it('renders the CAT-09c named friends-who-own list (rows → their profile)', () => {
    const onOpenUser = jest.fn();
    render(wrap(<AboutTab gameId="g1" onViewContributor={jest.fn()} onOpenUser={onOpenUser} />));
    expect(screen.getByText('FRIENDS WHO OWN IT — 3')).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Open vanta's profile"));
    expect(onOpenUser).toHaveBeenCalledWith('v1');
  });

  it('a game-detail load error surfaces an inline retry (never a crash)', () => {
    mockDetail = { data: undefined, isLoading: false, isError: true, refetch: jest.fn() };
    render(wrap(<AboutTab gameId="g1" onViewContributor={jest.fn()} onOpenUser={jest.fn()} />));
    expect(screen.getByText("COULDN'T LOAD THE GAME FACTS")).toBeTruthy();
  });
});

const CARD = {
  id: 'card-9',
  name: 'Rose',
  imageUrl: null,
  thumbUrl: null,
  isPremium: false,
  adoptionCount: 3,
  priceForYou: 0,
  components: [],
  designer: { userId: 'des-1', username: 'riko' },
  byViewer: false,
  adopted: false,
};

describe('W-D1 CommunityGallery — the Q4 no-adopt guard', () => {
  beforeEach(() => {
    mockGallery = { data: { items: [CARD] } as unknown as GameGalleryResponse, isLoading: false, isError: false, refetch: jest.fn() };
  });

  it('adopt-capable (default) — tapping a card opens the adopt path (onInspect fires)', () => {
    const onInspect = jest.fn();
    render(wrap(
      <CommunityGallery gameId="g1" onInspect={onInspect} onDesignACard={jest.fn()} onViewDesigner={jest.fn()} />,
    ));
    fireEvent.press(screen.getByLabelText(/Rose by riko/));
    expect(onInspect).toHaveBeenCalled();
  });

  it('browse-only (canAdopt=false) — the card renders but has NO adopt path (onInspect never fires)', () => {
    const onInspect = jest.fn();
    render(wrap(
      <CommunityGallery gameId="g1" canAdopt={false} onInspect={onInspect} onDesignACard={jest.fn()} onViewDesigner={jest.fn()} />,
    ));
    // the face still renders (browsing allowed) — its a11y sentence omits the adopt phrasing …
    fireEvent.press(screen.getByLabelText(/Rose by riko, adopted 3 times/));
    // … and pressing it does NOT open the adopt sheet (the guard is structural, AS-5)
    expect(onInspect).not.toHaveBeenCalled();
  });
});
