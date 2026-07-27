import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { PublicProfile, FriendProfile } from '@ingame/shared';
import prefsReducer from './store/prefsSlice';

// P9 — the friend/other-user Profile route (app/user/[id].tsx). Lives under src/ (NOT app/) so expo-
// router never treats it as a route (the P12/P13 lesson). Drives the shape matrix (friend/full · limited
// · 404 unavailable · loaderror) + the relationship-chip states + the report/block entry, on the REAL
// screen with the queries + router mocked.

let mockUser: { data?: unknown; isLoading: boolean; isError: boolean; error?: unknown; refetch: () => void } = {
  data: undefined,
  isLoading: true,
  isError: false,
  refetch: jest.fn(),
};
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockFriendReq = jest.fn(() => ({ unwrap: () => Promise.resolve({ ok: true }) }));

jest.mock('./store/friendApi', () => ({
  useGetUserQuery: () => mockUser,
  useCreateFriendRequestMutation: () => [mockFriendReq, { isLoading: false }],
  isFriendProfile: (p: { friendsCount?: number }) => 'friendsCount' in p,
}));
jest.mock('./store/achievementsApi', () => ({ useGetUserAchievementsQuery: () => ({ data: { summary: { earned: 0 }, earned: [] } }) }));
jest.mock('./store/reportApi', () => ({ useSubmitReportMutation: () => [jest.fn(), { isLoading: false }] }));
jest.mock('./store/communityApi', () => ({ useBlockUserMutation: () => [jest.fn(), { isLoading: false }] }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'friend-1111-1111-1111-111111111111' }),
}));
// Stub EntryCard (the Top-3 seats + the NOW PLAYING thumb) — skip the CardFace render; this suite
// tests the screen's shape/state logic, not the card face (EntryCard has its own test).
jest.mock('./components/EntryCard', () => ({
  EntryCard: ({ title }: { title: string }) => {
    const { Text } = require('react-native');
    return <Text>{`CARD:${title}`}</Text>;
  },
}));

import UserProfile from '../app/user/[id]';

// P9 fix-round — `privacy` DROPPED (F-16/0055: neither cross-user shape exposes the target's privacy
// value; 735f9b3) + the C4 trio added (stats · device · nowPlaying, 5db4fe2). Realistic values.
const FRIEND: FriendProfile = {
  id: 'friend-1111-1111-1111-111111111111',
  username: 'riko',
  avatarUrl: null,
  avatarConfig: null,
  memberSince: '2025-01-01T00:00:00Z',
  mutualFriendsCount: 3,
  relationship: 'friend',
  staff: true,
  bio: 'Survival-horror cartographer.',
  favouriteGenreIds: [],
  gamertags: [],
  friendsCount: 14,
  cardsPublished: 12, // CAT-07 — the CONTRIBUTIONS teaser count (owner walk-ruling 2026-07-20)
  top10: [], // P8: absorbs the concurrent P5 server-track FriendProfile.top10 addition (keeps typecheck green)
  stats: { games: 86, hours: 2400, completionPct: 71, cardsDesigned: 31, adoptionsReceived: 412, friends: 14 },
  device: {
    shellId: 'grape', // the C4 wire name (`shellId`, NOT /me/device's `activeShellId`)
    screenThemeId: 'midnight',
    stickerComposition: { version: 1, stickers: [] },
  },
  // PROF-01/05 (owner walk-ruling 2026-07-20) — the friend's PINNED FAVOURITE (flattened card, read-only).
  favouriteGame: {
    gameId: 'g-fav-1',
    title: 'Silent Hill',
    hours: 120,
    card: { id: 'c-fav', imageUrl: null, thumbUrl: null, isCustom: false, isPremium: false },
  },
  nowPlaying: {
    gameId: 'g-np-1',
    title: 'Resident Evil',
    hours: 24,
    card: { id: 'c-np', imageUrl: null, thumbUrl: null, isCustom: false, isPremium: false },
  },
};

// The null-pins variant — the schema keeps every pin nullable; each row must render NOTHING, quietly.
const FRIEND_NULL_TRIO: FriendProfile = {
  ...FRIEND,
  stats: null,
  device: null,
  favouriteGame: null,
  nowPlaying: null,
};

const LIMITED: PublicProfile = {
  id: 'friend-1111-1111-1111-111111111111',
  username: 'vanta',
  avatarUrl: null,
  avatarConfig: null,
  memberSince: '2024-01-01T00:00:00Z',
  mutualFriendsCount: 2,
  relationship: 'none',
};

function wrap(ui: React.ReactElement) {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  return <Provider store={store}>{ui}</Provider>;
}
function set(over: Partial<typeof mockUser>) {
  mockUser = { data: undefined, isLoading: false, isError: false, refetch: jest.fn(), ...over };
}

describe('P9 friend-profile route — the shape matrix', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockBack.mockReset();
    mockFriendReq.mockClear();
  });

  it('loading → the skeleton frame', () => {
    set({ isLoading: true });
    render(wrap(<UserProfile />));
    expect(screen.getAllByLabelText('Loading').length).toBeGreaterThan(0);
  });

  it('friend/full → identity, FRIEND tag, the counts, VIEW COLLECTION + COMPARE doors', () => {
    set({ data: FRIEND });
    render(wrap(<UserProfile />));
    expect(screen.getByText('riko')).toBeTruthy();
    expect(screen.getByText('FRIEND')).toBeTruthy(); // relationship chip
    expect(screen.getByText('STAFF')).toBeTruthy(); // generic staff badge (PROF-09)
    expect(screen.getByText('14 FRIENDS · 3 MUTUAL')).toBeTruthy();
    expect(screen.getByText('VIEW COLLECTION')).toBeTruthy();
    expect(screen.getByText('COMPARE HOURS')).toBeTruthy();
  });

  it('friend VIEW COLLECTION → the friend collection route', () => {
    set({ data: FRIEND });
    render(wrap(<UserProfile />));
    fireEvent.press(screen.getByText('VIEW COLLECTION'));
    expect(mockPush).toHaveBeenCalledWith('/user/friend-1111-1111-1111-111111111111/collection');
  });

  it('friend COMPARE → the compare route', () => {
    set({ data: FRIEND });
    render(wrap(<UserProfile />));
    fireEvent.press(screen.getByText('COMPARE HOURS'));
    expect(mockPush).toHaveBeenCalledWith('/compare/friend-1111-1111-1111-111111111111');
  });

  it('W-B10 r1 — VIEW COLLECTION + COMPARE HOURS render as ONE paired row (side-by-side keys)', () => {
    set({ data: FRIEND });
    render(wrap(<UserProfile />));
    const row = screen.getByTestId('door-row');
    // both keys live INSIDE the one row container…
    expect(within(row).getByText('VIEW COLLECTION')).toBeTruthy();
    expect(within(row).getByText('COMPARE HOURS')).toBeTruthy();
    // …and the container is a flex ROW (the paired-action grammar, not a stack)
    const flat = Object.assign({}, ...[row.props.style].flat(Infinity).filter(Boolean));
    expect(flat.flexDirection).toBe('row');
  });

  it('W-B10 r2+r3 — the FRIEND tag + the mutuals count sit together in the identity-foot row', () => {
    set({ data: FRIEND });
    render(wrap(<UserProfile />));
    const foot = screen.getByTestId('identity-foot');
    expect(within(foot).getByText('FRIEND')).toBeTruthy(); // the relationship seat (r2)
    expect(within(foot).getByText('14 FRIENDS · 3 MUTUAL')).toBeTruthy(); // mutuals beside friendsCount (r3)
  });

  it('W-B10 r4 — the section sequence mirrors the self profile at head (STATS → ACHIEVEMENTS → CONTRIBUTIONS → PINNED FAVOURITE → NOW PLAYING → THEIR DEVICE → doors)', () => {
    set({ data: FRIEND });
    render(wrap(<UserProfile />));
    // getAllByText returns tree order — the sequence probe. (TOP 3 absent: fixture top10 is [].)
    const seq = screen
      .getAllByText(/^(STATS|ACHIEVEMENTS|CONTRIBUTIONS|PINNED FAVOURITE|TOP 3|NOW PLAYING|THEIR DEVICE|VIEW COLLECTION)$/)
      .map((el) => (Array.isArray(el.props.children) ? el.props.children.join('') : el.props.children));
    // CONTRIBUTIONS seats right after ACHIEVEMENTS (mirrors the self profile's MY CONTRIBUTIONS placement).
    expect(seq).toEqual(['STATS', 'ACHIEVEMENTS', 'CONTRIBUTIONS', 'PINNED FAVOURITE', 'NOW PLAYING', 'THEIR DEVICE', 'VIEW COLLECTION']);
  });

  it('the ACHIEVEMENTS head carries NO "View all" — the teaser ROW is the door (owner sitting 2026-07-27, P5-f)', () => {
    set({ data: FRIEND });
    render(wrap(<UserProfile />));
    // the Achievements PAGE keeps its own View all; the profile header doubling it was the nit.
    // TertiaryLink renders `${label.toUpperCase()} ›` — assert the RENDERED text (Murr: the raw-label
    // query matched nothing in either world and could never fail).
    expect(screen.queryByText('VIEW ALL ›')).toBeNull();
    // the row-door stands: the whole teaser row navigates
    expect(screen.getByLabelText(`View ${FRIEND.username}'s achievements`)).toBeTruthy();
  });

  it('C4 trio — STATS tiles render the six-pack (percentile chips absent, M7)', () => {
    set({ data: FRIEND });
    render(wrap(<UserProfile />));
    expect(screen.getByText('STATS')).toBeTruthy();
    expect(screen.getByText('86')).toBeTruthy(); // games
    expect(screen.getByText('2,400h')).toBeTruthy(); // hours
    expect(screen.getByText('71%')).toBeTruthy(); // completion
    expect(screen.getByText('412')).toBeTruthy(); // adoptionsReceived (real, un-zeroed — 735f9b3)
    expect(screen.queryByText(/TOP \d+%/)).toBeNull(); // PROF-07 chips absent, not faked
  });

  it('C4 trio — THEIR DEVICE renders the {shell · theme} readout (read-only; no EDIT, toggle EXPECTED)', () => {
    set({ data: FRIEND });
    render(wrap(<UserProfile />));
    expect(screen.getByText('THEIR DEVICE')).toBeTruthy();
    expect(screen.getByText('POCKET · GRAPE')).toBeTruthy(); // wire `shellId` resolved
    expect(screen.getByText('MIDNIGHT SCREEN')).toBeTruthy(); // 0 stickers → no sticker segment
    expect(screen.queryByText('EDIT')).toBeNull(); // their device is not editable
    expect(screen.queryByText('VIEW IN THEIRS')).toBeNull(); // the 0012 chrome toggle — EXPECTED, not half-built
  });

  it('C4 trio — NOW PLAYING renders the pin (thumb + title + hours) and taps into the SOC-11 detail', () => {
    set({ data: FRIEND });
    render(wrap(<UserProfile />));
    expect(screen.getByText('NOW PLAYING')).toBeTruthy();
    expect(screen.getByText('RESIDENT EVIL')).toBeTruthy();
    expect(screen.getByText('24 HRS LOGGED')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Open Resident Evil'));
    // W-D1 — the friend-entry route retired; NOW PLAYING opens /game/[id]?via=<friend> (FRIEND posture).
    expect(mockPush).toHaveBeenCalledWith('/game/g-np-1?via=friend-1111-1111-1111-111111111111');
  });

  it('PINNED FAVOURITE (PROF-01/05 · owner walk-ruling) — renders the pinned favourite (title + hours) and taps into the game page', () => {
    set({ data: FRIEND });
    render(wrap(<UserProfile />));
    expect(screen.getByText('PINNED FAVOURITE')).toBeTruthy();
    expect(screen.getByText('SILENT HILL')).toBeTruthy();
    expect(screen.getByText('120 HRS')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Open Silent Hill'));
    // FRIEND posture — the pinned-favourite handle opens the game page carrying the friend context.
    expect(mockPush).toHaveBeenCalledWith('/game/g-fav-1?via=friend-1111-1111-1111-111111111111');
  });

  it('PINNED FAVOURITE — null (no pin) renders NOTHING, quietly (null-guard)', () => {
    set({ data: { ...FRIEND, favouriteGame: null } });
    render(wrap(<UserProfile />));
    expect(screen.queryByText('PINNED FAVOURITE')).toBeNull();
    // the rest of the friend view is untouched
    expect(screen.getByText('NOW PLAYING')).toBeTruthy();
    expect(screen.getByText('VIEW COLLECTION')).toBeTruthy();
  });

  it('a null trio + null favourite renders NOTHING for those rows, quietly (null-guards)', () => {
    set({ data: FRIEND_NULL_TRIO });
    render(wrap(<UserProfile />));
    expect(screen.queryByText('STATS')).toBeNull();
    expect(screen.queryByText('THEIR DEVICE')).toBeNull();
    expect(screen.queryByText('NOW PLAYING')).toBeNull();
    expect(screen.queryByText('PINNED FAVOURITE')).toBeNull();
    // the rest of the friend view is untouched
    expect(screen.getByText('VIEW COLLECTION')).toBeTruthy();
  });

  it('CONTRIBUTIONS teaser (CAT-07 · owner walk-ruling; walk-4 P5-e dropped the possessive "{NAME}\'S" prefix — redundant, already on their profile) — renders the PUBLISHED count and routes to the contributor screen', () => {
    set({ data: FRIEND });
    render(wrap(<UserProfile />));
    expect(screen.getByText('CONTRIBUTIONS')).toBeTruthy();
    expect(screen.getByText('12 CARDS DESIGNED')).toBeTruthy(); // cardsPublished (published only, not drafts)
    fireEvent.press(screen.getByLabelText("View riko's contributions"));
    expect(mockPush).toHaveBeenCalledWith('/contributor/friend-1111-1111-1111-111111111111'); // P13 cross-user door
  });

  it('CONTRIBUTIONS teaser — shown even at ZERO (mirrors the self profile: always present, no hide-on-empty)', () => {
    set({ data: { ...FRIEND, cardsPublished: 0 } });
    render(wrap(<UserProfile />));
    expect(screen.getByText('CONTRIBUTIONS')).toBeTruthy();
    expect(screen.getByText('0 CARDS DESIGNED')).toBeTruthy();
  });

  it('ACHIEVEMENTS + CONTRIBUTIONS counts wear the F-06 body rung (11) like the personal Profile — NOT the oversized title rung (owner walk-ruling)', () => {
    set({ data: FRIEND });
    render(wrap(<UserProfile />));
    const sizeOf = (label: string) =>
      (Object.assign({}, ...[screen.getByText(label).props.style].flat(Infinity).filter(Boolean)) as { fontSize?: number }).fontSize;
    // Both teaser counts share the achCount grammar; the self profile stepped this DOWN to body 11 (N-A5),
    // the friend's was 15 (title) — the "larger than it's supposed to" bug. 11 = the F-06 body rung.
    expect(sizeOf('0 EARNED')).toBe(11);
    expect(sizeOf('12 CARDS DESIGNED')).toBe(sizeOf('0 EARNED')); // shared-constant identity, not a duplicated literal
  });

  it('COMPARE HOURS wears the WHITE/cream SECONDARY voice (0069/0070), not the orange accent (owner walk-ruling)', () => {
    set({ data: FRIEND });
    render(wrap(<UserProfile />));
    // the label ink is the secondary voice (brand.navy #1d2a4a), NOT the action-alt accentInk (#14121f).
    const compare = screen.getByText('COMPARE HOURS');
    const flat: Record<string, unknown> = Object.assign({}, ...[compare.props.style].flat(Infinity).filter(Boolean));
    expect(flat.color).toBe('#1d2a4a'); // brand.navy — the 0069 secondary/cream keycap ink
  });

  it('limited (non-friend) → FRIENDS ONLY lock-well + ADD FRIEND; no doors', () => {
    set({ data: LIMITED });
    render(wrap(<UserProfile />));
    expect(screen.getByText('FRIENDS ONLY')).toBeTruthy();
    expect(screen.getByText('ADD FRIEND')).toBeTruthy(); // relationship=none
    expect(screen.getByText('2 MUTUAL')).toBeTruthy();
    expect(screen.queryByText('VIEW COLLECTION')).toBeNull();
    expect(screen.queryByText('COMPARE HOURS')).toBeNull();
  });

  it('the ⋯ overflow (report/block entry) is present on the profile', () => {
    set({ data: FRIEND });
    render(wrap(<UserProfile />));
    expect(screen.getByLabelText('Profile options')).toBeTruthy();
  });

  it('the ⋯ overflow opens the report SHEET with CONTENT, mounted OUTSIDE the scroll (owner-walk scrim-no-content regression)', () => {
    set({ data: FRIEND });
    render(wrap(<UserProfile />));
    fireEvent.press(screen.getByLabelText('Profile options'));
    // the sheet renders real CONTENT, not just a scrim: the drawer header + a report reason + the scrim.
    expect(screen.getByText('REPORT THIS USER')).toBeTruthy(); // PulledSheet title (reportHeader('user'))
    expect(screen.getByText('SPAM')).toBeTruthy(); // a MOD-01 user reason row
    expect(screen.getByLabelText('Close')).toBeTruthy(); // the scrim Pressable
    // …and the drawer is a SCREEN-ROOT SIBLING of the scroll, NOT a descendant of it — the PulledSheet
    // contract. An absolute-fill overlay mounted INSIDE the ScrollView anchors to the scroll CONTENT, so
    // the scrim covered the viewport but the sheet docked off-screen (the "shadow but nothing appears" bug).
    const scroll = screen.getByTestId('profile-scroll');
    expect(within(scroll).queryByText('REPORT THIS USER')).toBeNull();
    expect(within(scroll).queryByLabelText('Close')).toBeNull();
  });

  it('404 → the terminal Unavailable (MOD-09, no retry)', () => {
    set({ isError: true, error: { status: 404 } });
    render(wrap(<UserProfile />));
    expect(screen.getByText("This profile can't be shown right now.")).toBeTruthy();
    expect(screen.queryByText('RETRY')).toBeNull();
  });

  it('a network error → the retryable LoadError', () => {
    set({ isError: true, error: { status: 'FETCH_ERROR' } });
    render(wrap(<UserProfile />));
    expect(screen.getByText('RETRY')).toBeTruthy();
  });
});
