import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { EarnedAchievement, InProgressAchievement, MeAchievementsResponse } from '@ingame/shared';
import prefsReducer from './store/prefsSlice';

// P11 — the self Achievements route (app/achievements.tsx). Under src/ (NOT app/) so expo-router never
// bundles it as a route (the contributor-route precedent). Drives the P1/P2/V1-3/D3/L1/L2 matrix on the
// REAL screen with the query + /me + router mocked. Asserts the screen composes the sections + routes
// into the right VIEW ALL / detail sheet — the lifecycle KIT states are the kit's own tests.

let mockAch: { data?: MeAchievementsResponse; isLoading: boolean; isError: boolean; refetch: () => void } = {
  data: undefined,
  isLoading: true,
  isError: false,
  refetch: jest.fn(),
};
const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('./store/achievementsApi', () => ({ useGetMyAchievementsQuery: () => mockAch }));
jest.mock('./store/api', () => ({ useGetMeQuery: () => ({ data: { id: 'me', username: 'maverick', avatarUrl: null } }) }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn(), navigate: jest.fn() }),
}));

import Achievements from '../app/achievements';

const def = (over: Record<string, unknown>) => ({
  key: 'a1_first_print',
  name: 'Ach',
  description: 'Do the thing.',
  criterion: {},
  tier: 'standard' as const,
  kind: 'milestone' as const,
  reward: { badge: true as const, pixels: 50 },
  ...over,
});
const earned = (n: number, tier: 'prestige' | 'standard' | 'secret' = 'standard'): EarnedAchievement =>
  def({ id: `e${n}`, name: `EarnedAch${n}`, tier, unlockedAt: '2026-03-12T00:00:00Z' }) as EarnedAchievement;
const prog = (n: number, current: number, target: number): InProgressAchievement =>
  def({ id: `p${n}`, key: 'a2_press_operator', name: `ProgAch${n}`, progress: { current, target, unit: 'cards' } }) as InProgressAchievement;

const FULL: MeAchievementsResponse = {
  summary: { earned: 2, inProgress: 2, secretsFound: 1, secretsTotal: 6 },
  earned: [earned(1, 'prestige'), earned(2, 'standard')],
  inProgress: [prog(1, 5, 25), prog(2, 3, 1)], // p2: current > target (the GAP-4 clamp case)
  secrets: { found: [def({ id: 's1', key: 'b6_night_shift', name: 'NightShift', tier: 'secret', unlockedAt: '2026-03-12T00:00:00Z' }) as EarnedAchievement], lockedCount: 5 },
};

const EMPTY: MeAchievementsResponse = {
  summary: { earned: 0, inProgress: 0, secretsFound: 0, secretsTotal: 6 },
  earned: [],
  inProgress: [],
  secrets: { found: [], lockedCount: 6 },
};

function wrap(ui: React.ReactElement) {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  return <Provider store={store}>{ui}</Provider>;
}
function set(over: Partial<typeof mockAch>) {
  mockAch = { data: undefined, isLoading: false, isError: false, refetch: jest.fn(), ...over };
}

describe('P11 self achievements route — the state matrix', () => {
  beforeEach(() => {
    mockBack.mockReset();
    mockPush.mockReset();
  });

  it('L1 — loading renders the skeleton frame', () => {
    set({ isLoading: true });
    render(wrap(<Achievements />));
    expect(screen.getByText('ACHIEVEMENTS')).toBeTruthy();
    expect(screen.getAllByLabelText('Loading').length).toBeGreaterThan(0);
  });

  it('P1 — populated: SUMMARY counts, TierLegend, all three sections + REWARDS', () => {
    set({ data: FULL });
    render(wrap(<Achievements />));
    // SUMMARY tiles ('EARNED' + 'IN PROGRESS' appear as both a StatTile label AND a section head)
    expect(screen.getAllByText('EARNED').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IN PROGRESS').length).toBeGreaterThan(0);
    expect(screen.getByText('1 / 6')).toBeTruthy(); // secretsFound / secretsTotal
    // TierLegend
    expect(screen.getByText('PRESTIGE')).toBeTruthy();
    expect(screen.getByText('STANDARD')).toBeTruthy();
    expect(screen.getByText('SECRET')).toBeTruthy();
    // sections + rewards
    expect(screen.getByText('EARNEDACH1')).toBeTruthy();
    expect(screen.getByText('PROGACH1')).toBeTruthy();
    expect(screen.getByText('NIGHTSHIFT')).toBeTruthy();
    expect(screen.getByText('REWARDS EARNED')).toBeTruthy();
  });

  it('P1 — SECRETS renders the found egg + the locked ??? mystery slots', () => {
    set({ data: FULL });
    render(wrap(<Achievements />));
    // the root SECRETS section caps mysteries at 3 (lockedCount 5 → 3 slots)
    expect(screen.getAllByLabelText('Locked secret achievement').length).toBe(3);
  });

  it('P2 — empty: the NON-gold cold-start hook + VIEW MY COLLECTION (not a dead end)', () => {
    set({ data: EMPTY });
    render(wrap(<Achievements />));
    expect(screen.getByText('NO TROPHIES YET')).toBeTruthy();
    expect(screen.getByText('VIEW MY COLLECTION')).toBeTruthy();
    // no rewards / no sections leak in the empty state
    expect(screen.queryByText('REWARDS EARNED')).toBeNull();
  });

  it('VIEW ALL · Earned — routes to the full-list view (V1)', () => {
    set({ data: FULL });
    render(wrap(<Achievements />));
    const viewAll = screen.getAllByText('VIEW ALL ›');
    fireEvent.press(viewAll[0]); // the EARNED section's VIEW ALL
    expect(screen.getByText('EARNED')).toBeTruthy();
    expect(screen.getByText(/prestige first/)).toBeTruthy();
    expect(screen.getByText('‹ ACHIEVEMENTS')).toBeTruthy();
  });

  it('D1 — tapping an earned tile opens the detail sheet with its reward', () => {
    set({ data: FULL });
    render(wrap(<Achievements />));
    fireEvent.press(screen.getByLabelText('EARNEDACH1 achievement'));
    // the sheet's REWARD heading is unique (the root section is "REWARDS EARNED"); the PX chip also
    // appears in that section, so assert ≥1 rather than exactly one.
    expect(screen.getByText('REWARD')).toBeTruthy();
    expect(screen.getAllByText('+50 PIXELS').length).toBeGreaterThan(0);
  });

  it('D3 — the locked ??? sheet is SEALED (no name / criterion / reward leaks)', () => {
    set({ data: FULL });
    render(wrap(<Achievements />));
    fireEvent.press(screen.getAllByLabelText('Locked secret achievement')[0]);
    // the sealed sheet shows only the generic mystery copy
    expect(screen.getByText(/This one's a secret/)).toBeTruthy();
    // NO reward/prize block, NO progress readout leaks on a sealed secret
    expect(screen.queryByText('REWARD')).toBeNull();
    expect(screen.queryByText('PRIZE')).toBeNull();
    expect(screen.queryByText(/TO GO/)).toBeNull();
  });

  it('D2 — the in-progress sheet clamps "N TO GO" to 0 when current exceeds target (GAP-4)', () => {
    set({ data: FULL });
    render(wrap(<Achievements />));
    // open the IN PROGRESS VIEW ALL so both progress tiles are reachable, then the current>target one.
    fireEvent.press(screen.getAllByText('VIEW ALL ›')[1]); // IN PROGRESS section
    fireEvent.press(screen.getByLabelText('PROGACH2 achievement')); // current 3 > target 1
    expect(screen.getByText('0 TO GO')).toBeTruthy();
  });

  it('L2 — a network error renders the retryable LoadError', () => {
    set({ isError: true });
    render(wrap(<Achievements />));
    expect(screen.getByText('RETRY')).toBeTruthy();
  });
});
