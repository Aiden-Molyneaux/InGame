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

jest.mock('./store/catalogRailsApi', () => ({
  useGetGameDetailQuery: () => mockDetail,
  // W-6 (CAT-13) — AboutTab's facts-block EDIT mode rides this mutation; inert here (its own
  // behavior suite is components/game/AboutTab.edit.test.tsx).
  useSubmitGameEditMutation: () => [jest.fn(), { isLoading: false }],
}));
jest.mock('./store/friendApi', () => ({ useGetFriendsWhoOwnQuery: () => mockFriendsWhoOwn }));
// W-6 — AboutTab now reads me (the A1 young-account pre-gate) + genres (the chip editor); undefined
// keeps the EDIT key live and the editors empty — these suites don't exercise the edit mode.
jest.mock('./store/api', () => ({
  useGetMeQuery: () => ({ data: undefined }),
  useGetGenresQuery: () => ({ data: undefined }),
}));
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
  avgRating: 4.2, // CAT-09 (owner walk m6) — community mean rating
  avgHours: 57, // CAT-09 — community mean hours
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

  it('renders the title, the EXPLICIT labeled details, the contributor credit and the community stats', () => {
    render(wrap(<AboutTab gameId="g1" onViewContributor={jest.fn()} onOpenUser={jest.fn()} />));
    expect(screen.getByText('Destiny')).toBeTruthy();
    // the labeled DETAILS rows (owner walk m6) — explicit label · value, absent fields omitted
    expect(screen.getByText('STUDIO')).toBeTruthy();
    expect(screen.getByText('PUBLISHER')).toBeTruthy();
    expect(screen.getByText('RELEASE DATE')).toBeTruthy();
    expect(screen.getByText('2014-09-09')).toBeTruthy(); // the release value
    expect(screen.getByText('GENRES')).toBeTruthy();
    // Bungie is BOTH the studio and the publisher here → one labeled row each (two matches)
    expect(screen.getAllByText('Bungie')).toHaveLength(2);
    expect(screen.getByText('MAVERICK')).toBeTruthy(); // CAT-05 contributor
    // community stats — laid out explicitly: collections + friends-have + the averages
    expect(screen.getByText('214')).toBeTruthy(); // collectionsCount
    expect(screen.getByText('COLLECTIONS')).toBeTruthy();
    expect(screen.getByText('FRIENDS HAVE IT')).toBeTruthy();
    expect(screen.getByText('4.2★')).toBeTruthy(); // avg rating
    expect(screen.getByText('AVG RATING')).toBeTruthy();
    expect(screen.getByText('57')).toBeTruthy(); // avg hours
    expect(screen.getByText('AVG HOURS')).toBeTruthy();
  });

  it('Finding 1 regression — the genre renders EXACTLY ONCE (no side-by-side duplicate)', () => {
    // the old layout rendered genres[0] in the meta subtitle AND again as a DISC-02 chip right beside
    // it; the explicit labeled GENRES row must render each genre a single time.
    render(wrap(<AboutTab gameId="g1" onViewContributor={jest.fn()} onOpenUser={jest.fn()} />));
    expect(screen.getAllByText('SHOOTER')).toHaveLength(1);
  });

  it('omits the AVG RATING / AVG HOURS rows when the game has no data to average (n=0)', () => {
    mockDetail = {
      data: { ...DETAIL, avgRating: null, avgHours: null },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    };
    render(wrap(<AboutTab gameId="g1" onViewContributor={jest.fn()} onOpenUser={jest.fn()} />));
    expect(screen.queryByText('AVG RATING')).toBeNull();
    expect(screen.queryByText('AVG HOURS')).toBeNull();
    // the always-present counts still render
    expect(screen.getByText('COLLECTIONS')).toBeTruthy();
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
