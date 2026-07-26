import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { UserAchievementsResponse } from '@ingame/shared';
import prefsReducer from './store/prefsSlice';

// P11 — the friend Achievements route (app/user/[id]/achievements.tsx). Under src/ (NOT app/). Drives
// P3 (earned-only) · P4 (privacy-limited lock-well) · MOD-09 (404 → Unavailable) with the reads mocked.

let mockAch: { data?: UserAchievementsResponse; isLoading: boolean; isError: boolean; error?: unknown; refetch: () => void } = {
  data: undefined,
  isLoading: true,
  isError: false,
  refetch: jest.fn(),
};
// The friend-user read (GET /users/:id) — settable so the P1-c identity tests can vary avatarConfig/
// memberSince. Defaults to the plain riko shape the pre-existing lifecycle tests assume.
let mockUser: unknown = { id: 'riko-id', username: 'riko', avatarUrl: null };
const mockBack = jest.fn();

jest.mock('./store/achievementsApi', () => ({ useGetUserAchievementsQuery: () => mockAch }));
jest.mock('./store/friendApi', () => ({ useGetUserQuery: () => ({ data: mockUser }) }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack, replace: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'riko-id' }),
}));

import FriendAchievements from '../app/user/[id]/achievements';

const FRIEND: UserAchievementsResponse = {
  summary: { earned: 2 },
  earned: [
    // OQ-148 (W-C3b) — a friend's earned SECRET arrives MASKED (no name/key/real-tier), so it can't be
    // reverse-engineered by looking at their page; it still COUNTS in summary.earned (2).
    { id: 's1', kind: 'secret', tier: 'secret', locked: true, unlockedAt: '2026-03-12T00:00:00Z' },
    { id: 'e1', key: 'a1_first_print', name: 'FirstPrint', tier: 'standard', unlockedAt: '2026-02-01T00:00:00Z' },
  ],
};
const LOCKED: UserAchievementsResponse = { summary: { earned: 12 }, locked: true };

function wrap(ui: React.ReactElement) {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  return <Provider store={store}>{ui}</Provider>;
}
function set(over: Partial<typeof mockAch>) {
  mockAch = { data: undefined, isLoading: false, isError: false, refetch: jest.fn(), ...over };
}

describe('P11 friend achievements route', () => {
  beforeEach(() => {
    mockBack.mockReset();
    mockUser = { id: 'riko-id', username: 'riko', avatarUrl: null };
  });

  it('L1 — loading renders the skeleton frame', () => {
    set({ isLoading: true });
    render(wrap(<FriendAchievements />));
    expect(screen.getByText('ACHIEVEMENTS')).toBeTruthy();
    expect(screen.getAllByLabelText('Loading').length).toBeGreaterThan(0);
  });

  it('P3 — earned-only: named milestone renders; the earned SECRET is a SEALED ??? (OQ-148, no name/tier leak)', () => {
    set({ data: FRIEND });
    render(wrap(<FriendAchievements />));
    expect(screen.getByText('‹ RETURN TO RIKO')).toBeTruthy();
    expect(screen.getByText('EARNED')).toBeTruthy();
    // the named milestone renders normally
    expect(screen.getByText('FIRSTPRINT')).toBeTruthy();
    // W-C3b — the masked secret renders as the sealed ??? MysterySlot (the P11 self-page grammar), and
    // its identifying fields NEVER reach the DOM: no name, no key-derived label, no "SECRET" tier tag.
    expect(screen.getByLabelText('Locked secret achievement')).toBeTruthy();
    expect(screen.queryByText('NIGHTSHIFT')).toBeNull();
    expect(screen.queryByText('NIGHT SHIFT')).toBeNull();
    // PROF-05 — a friend view still never leaks IN PROGRESS
    expect(screen.queryByText('IN PROGRESS')).toBeNull();
  });

  it('W-C3b — tapping the masked secret opens the SEALED sheet (no name/criterion/tier reveal)', () => {
    set({ data: FRIEND });
    render(wrap(<FriendAchievements />));
    fireEvent.press(screen.getByLabelText('Locked secret achievement'));
    // the sealed D3 variant — the generic mystery copy only, never the underlying achievement
    expect(screen.getByText(/This one's a secret/)).toBeTruthy();
    expect(screen.queryByText('NIGHTSHIFT')).toBeNull();
    expect(screen.queryByText('REWARD')).toBeNull();
  });

  it('P4 — privacy-limited: the honest headline count + the ACHIEVEMENTS HIDDEN lock-well', () => {
    set({ data: LOCKED });
    render(wrap(<FriendAchievements />));
    expect(screen.getByText('ACHIEVEMENTS HIDDEN')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy(); // honest headline count reads
    expect(screen.getAllByText('—').length).toBeGreaterThan(0); // in-progress / secrets hidden
    // no badges leak
    expect(screen.queryByText('NIGHTSHIFT')).toBeNull();
  });

  it('MOD-09 — a 404 collapses to the terminal Unavailable (no retry)', () => {
    set({ isError: true, error: { status: 404 } });
    render(wrap(<FriendAchievements />));
    expect(screen.getByText("These achievements can't be shown right now.")).toBeTruthy();
    expect(screen.queryByText('RETRY')).toBeNull();
  });

  it('L2 — a network error renders the retryable LoadError', () => {
    set({ isError: true, error: { status: 'FETCH_ERROR' } });
    render(wrap(<FriendAchievements />));
    expect(screen.getByText('RETRY')).toBeTruthy();
  });

  it('VIEW ALL — routes to the full earned list', () => {
    set({ data: FRIEND });
    render(wrap(<FriendAchievements />));
    fireEvent.press(screen.getByText('VIEW ALL ›'));
    expect(screen.getByText(/prestige first/)).toBeTruthy();
    expect(screen.getByText('‹ ACHIEVEMENTS')).toBeTruthy();
  });

  // ── P1-c (walk-4 fix) — the friend identity header must carry the SAME facets the Contributions
  // page does. Pre-fix the page passed ONLY avatarUrl + staff to <IdentityBlock>, DROPPING the
  // Monogram Forge config (a friend's forged avatar rendered as the plain default initials → the
  // "identity missing" the owner saw) and memberSince (no MEMBER SINCE line). These fail pre-fix. ──
  const RIKO_FORGED = {
    id: 'riko-id',
    username: 'riko',
    avatarUrl: null,
    // PROF-08 monogram forge — a distinct glyph + colour pair; the configured Avatar labels itself
    // "<username> monogram" (vs the default box, which has no such label).
    avatarConfig: { bg: '#2a1f4d', ink: '#e8c14a', glyph: 'RK', frame: 'ring' },
    memberSince: '2025-11-03T00:00:00Z',
  };

  it('P1-c — renders the friend Monogram Forge avatar (avatarConfig threaded, not dropped to default initials)', () => {
    set({ data: FRIEND });
    mockUser = RIKO_FORGED;
    render(wrap(<FriendAchievements />));
    // the CONFIGURED monogram identifies itself; pre-fix (no avatarConfig prop) the Avatar fell back to
    // the default box, which carries NO accessibility label — so this query returned null.
    expect(screen.getByLabelText('riko monogram')).toBeTruthy();
  });

  it('P1-c — renders MEMBER SINCE from the user shape (memberSince threaded, matching Contributions)', () => {
    set({ data: FRIEND });
    mockUser = RIKO_FORGED;
    render(wrap(<FriendAchievements />));
    expect(screen.getByText(/MEMBER SINCE/)).toBeTruthy();
  });

  it('P1-c — the privacy-limited (locked) view also carries the full identity header', () => {
    set({ data: LOCKED });
    mockUser = RIKO_FORGED;
    render(wrap(<FriendAchievements />));
    expect(screen.getByLabelText('riko monogram')).toBeTruthy();
    expect(screen.getByText(/MEMBER SINCE/)).toBeTruthy();
  });
});
