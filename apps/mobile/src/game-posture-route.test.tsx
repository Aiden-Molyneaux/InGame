import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { CollectionResponse, FriendCollectionResponse, GameGalleryResponse } from '@ingame/shared';
import prefsReducer from './store/prefsSlice';

// W-D1 — the adaptive Game page posture RESOLVER (app/game/[id].tsx). ONE route adapts by DATA + the
// `?via=` param: FRIEND (via) · OWN (an entry in /me/collection) · CATALOG (neither). This file drives
// the REAL GamePage through all three postures (+ the L1/L2 lifecycle), asserting the branch it selects
// and the load-bearing posture rules: FRIEND is READ-ONLY (no edit/remove/now-playing — the overflow is
// REPORT-only), CATALOG offers ADD TO COLLECTION with PLAY locked + a browse-only gallery (Q4 no-adopt).
// The heavy leaf children (skia faces, sheets, the dock, the gallery, AboutTab) are stood in so the
// posture scaffolding renders cheaply; the gallery stand-in echoes its `canAdopt` prop for the Q4 check.

let mockParams: { id: string; via?: string } = { id: 'g1' };
let mockCollection: { data?: CollectionResponse; isLoading: boolean; isError: boolean; refetch: () => void } = {
  data: { items: [] } as unknown as CollectionResponse,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};
let mockUserCollection: { data?: FriendCollectionResponse; isLoading: boolean; isError: boolean; error?: unknown; refetch: () => void } = {
  data: undefined,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};
let mockUserProfile: { data?: { username: string } } = { data: { username: 'riko' } };
let mockGallery: { data?: GameGalleryResponse } = { data: { items: [] } as unknown as GameGalleryResponse };

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack, navigate: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('./store/api', () => ({
  useGetCollectionQuery: () => mockCollection,
  useGetWalletQuery: () => ({ data: { balance: 500 } }),
  useRemoveEntryMutation: () => [jest.fn(), { isLoading: false }],
  useSetNowPlayingMutation: () => [jest.fn()],
  useDeleteCardMutation: () => [jest.fn(), { isLoading: false }],
  useAddToCollectionMutation: () => [jest.fn(() => ({ unwrap: () => Promise.resolve({}) })), { isLoading: false }],
}));
jest.mock('./store/friendApi', () => ({
  useGetUserCollectionQuery: () => mockUserCollection,
  useGetUserQuery: () => mockUserProfile,
  isFriendProfile: (p: Record<string, unknown>) => 'friendsCount' in p,
}));
jest.mock('./store/communityApi', () => ({
  useGetGameGalleryQuery: () => mockGallery,
  useAdoptCardMutation: () => [jest.fn(() => ({ unwrap: () => Promise.resolve({}) })), { isLoading: false }],
  useBlockUserMutation: () => [jest.fn(() => ({ unwrap: () => Promise.resolve({}) })), { isLoading: false }],
}));
jest.mock('./store/queueApi', () => ({
  useAddQueueItemMutation: () => [jest.fn(() => ({ unwrap: () => Promise.resolve({}) })), { isLoading: false }],
}));
jest.mock('./store/reportApi', () => ({ useSubmitReportMutation: () => [jest.fn(), { isLoading: false }] }));
jest.mock('./store/hooks', () => ({ useAppSelector: () => 'tok', useAppDispatch: () => jest.fn() }));
jest.mock('./store/shareCard', () => ({ shareCardImage: jest.fn() }));
jest.mock('./components/SheetLock', () => ({ useSheetLocked: () => false }));

// heavy / posture-irrelevant children — stood in so the scaffolding renders cheaply. W-D1 D-1: the
// DualFaceHero mock ECHOES its framing props so the friend's dual-face (front label + back title +
// gated stats) is observable — proving FRIEND PLAY now reuses the SAME shared dual-face as OWN.
jest.mock('./components/game/DualFaceHero', () => ({
  DualFaceHero: (p: Record<string, unknown>) => {
    const { Text } = require('react-native');
    return (
      <Text>{`DUALFACE|face=${p.faceLabel ?? 'THE FACE'}|statsTitle=${p.statsTitle ?? 'YOUR STATS'}|statsLabel=${p.statsLabel ?? 'YOUR STATS'}|hours=${p.hours}|status=${p.status}`}</Text>
    );
  },
}));
jest.mock('./components/game/PlayDossier', () => ({ PlayDossier: () => null }));
jest.mock('./components/game/CardSwitcher', () => ({ CardSwitcher: () => null }));
jest.mock('./components/game/CardDetailSheet', () => ({ CardDetailSheet: () => null }));
jest.mock('./components/game/AdoptCardSheet', () => ({ AdoptCardSheet: () => null }));
jest.mock('./components/report/ReportSheet', () => ({ ReportSheet: () => null }));
jest.mock('./components/ConfirmSheet', () => ({ ConfirmSheet: () => null }));
jest.mock('./components/lifecycle/Toast', () => ({ Toast: () => null }));
jest.mock('./components/EntryCard', () => ({
  EntryCard: ({ title }: { title: string }) => {
    const { Text } = require('react-native');
    return <Text>{`CARD:${title}`}</Text>;
  },
}));
jest.mock('./components/game/AboutTab', () => ({
  // renders the D-3 `beforeFriends` slot so the CATALOG NOT-IN-COLLECTION band (now nested in ABOUT) shows
  AboutTab: ({ beforeFriends }: { beforeFriends?: React.ReactNode }) => {
    const { Text, View } = require('react-native');
    return (
      <View>
        <Text>ABOUT-TAB</Text>
        {beforeFriends}
      </View>
    );
  },
}));
// the gallery stand-in ECHOES `canAdopt` so the Q4 browse-only guard is observable at the seam
jest.mock('./components/game/CommunityGallery', () => ({
  CommunityGallery: ({ canAdopt }: { canAdopt?: boolean }) => {
    const { Text } = require('react-native');
    return <Text>{`GALLERY canAdopt=${canAdopt !== false}`}</Text>;
  },
}));
// PulledSheet renders its children inline so the FRIEND overflow's buttons are queryable
jest.mock('./components/PulledSheet', () => ({
  PulledSheet: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));
// GameTabDock stand-in — echoes the PLAY lock + lets a test switch to CARDS
jest.mock('./components/game/GameTabDock', () => ({
  GameTabDock: ({ onChange, lockPlay }: { onChange: (v: string) => void; lockPlay?: boolean }) => {
    const { View, Text, Pressable } = require('react-native');
    return (
      <View>
        <Text>{lockPlay ? 'PLAY-LOCKED' : 'PLAY-OK'}</Text>
        <Pressable accessibilityLabel="tab-cards" onPress={() => onChange('cards')}>
          <Text>go-cards</Text>
        </Pressable>
      </View>
    );
  },
}));

import GamePage from '../app/game/[id]';
import { ScreenButton } from './components/ScreenButton';

const MY_ENTRY = {
  entryId: 'me1',
  gameId: 'g1',
  title: 'Destiny',
  developer: 'Bungie',
  publisher: 'Bungie',
  releaseYear: 2014,
  genres: [{ id: 'gn', name: 'Shooter' }],
  hours: 210,
  percentComplete: 68,
  status: 'playing',
  ownedSince: '2014-09-09',
  addedAt: '2020-01-01T00:00:00Z',
  nowPlaying: false,
  card: { id: 'default', imageUrl: null, thumbUrl: null, isCustom: false, isPremium: false },
  rating: null,
  notes: null,
};
const FRIEND_CARD = {
  id: 'card-9',
  imageUrl: null,
  thumbUrl: null,
  isCustom: true,
  isPremium: false,
  equipped: { frame: 'ROSE FOIL' },
  designer: { userId: 'des-1', username: 'riko' },
};
const FRIEND_ITEM = {
  entryId: 'e1',
  gameId: 'g1',
  title: 'Destiny',
  developer: 'Bungie',
  publisher: 'Bungie',
  releaseYear: 2014,
  genres: [{ id: 'gn', name: 'Shooter' }],
  hours: 240,
  status: 'playing',
  ownedSince: '2014-09-09',
  nowPlaying: true,
  card: FRIEND_CARD,
};
const FRIEND_COL = { items: [FRIEND_ITEM], nextCursor: null, total: 1, collectionTotal: 1 } as unknown as FriendCollectionResponse;
const GALLERY_WITH_THEIRS = {
  items: [
    {
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
    },
  ],
} as unknown as GameGalleryResponse;

function wrap(ui: React.ReactElement) {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  return <Provider store={store}>{ui}</Provider>;
}

beforeEach(() => {
  mockParams = { id: 'g1' };
  mockCollection = { data: { items: [] } as unknown as CollectionResponse, isLoading: false, isError: false, refetch: jest.fn() };
  mockUserCollection = { data: undefined, isLoading: false, isError: false, refetch: jest.fn() };
  mockUserProfile = { data: { username: 'riko' } };
  mockGallery = { data: { items: [] } as unknown as GameGalleryResponse };
  mockPush.mockReset();
  mockReplace.mockReset();
  mockBack.mockReset();
});

describe('W-D1 posture resolver', () => {
  it('OWN — an entry in /me/collection and no via → today’s full page (PLAY)', () => {
    mockCollection = { data: { items: [MY_ENTRY] } as unknown as CollectionResponse, isLoading: false, isError: false, refetch: jest.fn() };
    render(wrap(<GamePage />));
    expect(screen.getByText('Destiny')).toBeTruthy(); // the OWN hero title
    expect(screen.getByText('SWITCH CARD')).toBeTruthy(); // an OWN-only action
    expect(screen.queryByText('NOT IN YOUR COLLECTION')).toBeNull();
    expect(screen.queryByText(/RIKO’S FACE/)).toBeNull();
  });

  it('FRIEND — ?via present → the friend posture (their read-only face), even when you also own it', () => {
    mockParams = { id: 'g1', via: 'friend-1' };
    mockCollection = { data: { items: [MY_ENTRY] } as unknown as CollectionResponse, isLoading: false, isError: false, refetch: jest.fn() }; // Q2: FRIEND wins
    mockUserCollection = { data: FRIEND_COL, isLoading: false, isError: false, refetch: jest.fn() };
    render(wrap(<GamePage />));
    expect(screen.getByText(/face=RIKO’S FACE/)).toBeTruthy(); // the shared dual-face, friend-framed
    expect(screen.queryByText('SWITCH CARD')).toBeNull(); // not the OWN page
  });

  it('CATALOG — no entry, no via → the neutral/not-owned posture', () => {
    render(wrap(<GamePage />)); // default: empty collection, no via
    expect(screen.getByText('NOT IN YOUR COLLECTION')).toBeTruthy();
    expect(screen.queryByText('SWITCH CARD')).toBeNull();
    expect(screen.queryByText(/RIKO’S FACE/)).toBeNull();
  });

  it('L1 — collection loading → the game skeleton', () => {
    mockCollection = { data: undefined, isLoading: true, isError: false, refetch: jest.fn() };
    render(wrap(<GamePage />));
    expect(screen.getByLabelText('Loading')).toBeTruthy();
  });

  it('L2 — collection error → SIGNAL LOST', () => {
    mockCollection = { data: undefined, isLoading: false, isError: true, refetch: jest.fn() };
    render(wrap(<GamePage />));
    expect(screen.getByText('SIGNAL LOST')).toBeTruthy();
  });
});

describe('W-D1 FRIEND posture — read-only + compose', () => {
  beforeEach(() => {
    mockParams = { id: 'g1', via: 'friend-1' };
    mockUserCollection = { data: FRIEND_COL, isLoading: false, isError: false, refetch: jest.fn() };
    mockUserProfile = { data: { username: 'riko' } };
  });

  it('D-1 — FRIEND PLAY reuses the OWN dual-face (their FACE + their STATS back, gated), read-only', () => {
    render(wrap(<GamePage />));
    // the shared DualFaceHero, friend-framed: front label + back title + the gated back stats flow through
    const df = screen.getByText(/^DUALFACE\|/);
    expect(df.props.children).toContain('face=RIKO’S FACE'); // THEIR front
    expect(df.props.children).toContain('statsTitle=RIKO’S STATS'); // THEIR back
    expect(df.props.children).toContain('hours=240'); // their gated play stats ride the back
    // SOC-11 gating by construction — the shared StatsBack carries NO notes/rating (the old inline
    // "NOTES · RATING / PRIVATE" block is retired); the privacy is stated in the note below the hero.
    expect(screen.queryByText('NOTES · RATING')).toBeNull();
    expect(screen.getByText(/stay private/)).toBeTruthy();
    // read-only: the overflow carries ONLY report — never a mutation of their entry
    expect(screen.getByText('REPORT THIS GAME')).toBeTruthy();
    expect(screen.queryByText('REMOVE FROM COLLECTION')).toBeNull();
    expect(screen.queryByText('SET AS NOW PLAYING')).toBeNull();
    expect(screen.queryByText('SWITCH CARD')).toBeNull();
  });

  it('unowned → ADOPT their card + ADD TO COLLECTION, no compare / no VIEW YOUR COPY', () => {
    mockCollection = { data: { items: [] } as unknown as CollectionResponse, isLoading: false, isError: false, refetch: jest.fn() };
    mockGallery = { data: GALLERY_WITH_THEIRS };
    render(wrap(<GamePage />));
    expect(screen.getByText('ADOPT RIKO’S CARD')).toBeTruthy();
    expect(screen.getByText('ADD TO COLLECTION')).toBeTruthy();
    expect(screen.queryByText('⇄ COMPARE — YOU vs THEM')).toBeNull();
    expect(screen.queryByText('VIEW YOUR COPY ›')).toBeNull();
  });

  it('D-4 — unowned with NO adopt-able card: ADD TO COLLECTION is orange /primary + STEPPED', () => {
    mockCollection = { data: { items: [] } as unknown as CollectionResponse, isLoading: false, isError: false, refetch: jest.fn() };
    mockGallery = { data: { items: [] } as unknown as GameGalleryResponse }; // their card not adopt-able → ADD is the sole primary
    const { UNSAFE_getAllByType } = render(wrap(<GamePage />));
    const add = UNSAFE_getAllByType(ScreenButton).find((b) => String(b.props.label).toLowerCase().includes('add to collection'));
    expect(add).toBeTruthy();
    expect(add!.props.variant).toBe('primary'); // orange, not gold (0069)
    expect(add!.props.stepped).toBe(true); // the pixel-stepped silhouette
  });

  it('D-4 — when an adopt-able card demotes ADD to the cream secondary, the step drops (never a cream step)', () => {
    mockCollection = { data: { items: [] } as unknown as CollectionResponse, isLoading: false, isError: false, refetch: jest.fn() };
    mockGallery = { data: GALLERY_WITH_THEIRS };
    const { UNSAFE_getAllByType } = render(wrap(<GamePage />));
    const add = UNSAFE_getAllByType(ScreenButton).find((b) => String(b.props.label).toLowerCase().includes('add to collection'));
    expect(add!.props.variant).toBe('secondary');
    expect(add!.props.stepped).toBeFalsy();
  });

  it('owned → the single-game compare fragment + VIEW YOUR COPY (swaps to OWN), no ADD', () => {
    mockCollection = { data: { items: [MY_ENTRY] } as unknown as CollectionResponse, isLoading: false, isError: false, refetch: jest.fn() };
    render(wrap(<GamePage />));
    expect(screen.getByText('⇄ COMPARE — YOU vs THEM')).toBeTruthy();
    expect(screen.queryByText('ADD TO COLLECTION')).toBeNull();
    fireEvent.press(screen.getByText('VIEW YOUR COPY ›'));
    expect(mockReplace).toHaveBeenCalledWith('/game/g1'); // drops `via` → re-renders OWN
  });

  it('CARDS tab = the community gallery (adopt-capable), never your switcher', () => {
    render(wrap(<GamePage />));
    fireEvent.press(screen.getByLabelText('tab-cards'));
    expect(screen.getByText('GALLERY canAdopt=true')).toBeTruthy();
  });
});

describe('W-D1 CATALOG posture — ADD + PLAY locked + Q4 no-adopt', () => {
  it('pins ADD TO COLLECTION and locks PLAY', () => {
    render(wrap(<GamePage />)); // empty collection, no via
    expect(screen.getByText('NOT IN YOUR COLLECTION')).toBeTruthy();
    expect(screen.getByText('+ ADD TO COLLECTION')).toBeTruthy();
    expect(screen.getByText('PLAY-LOCKED')).toBeTruthy();
  });

  it('CARDS is BROWSE-ONLY — the gallery gets canAdopt=false (Q4: no adopting a game you don’t own)', () => {
    render(wrap(<GamePage />));
    fireEvent.press(screen.getByLabelText('tab-cards'));
    expect(screen.getByText('GALLERY canAdopt=false')).toBeTruthy();
  });
});
