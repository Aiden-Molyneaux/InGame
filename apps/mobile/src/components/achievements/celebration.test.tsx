import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { EarnedAchievement, MeAchievementsResponse } from '@ingame/shared';
import authReducer, { setTokens } from '../../store/authSlice';
import prefsReducer, { setLastSeenUnlockCount } from '../../store/prefsSlice';

// P11 — the ACH-06 in-app celebration seam (ARCH-A4 / ASSUMPTION-1). Proves the poll-free refetch-DELTA
// trigger: a first observation baselines SILENTLY, a later INCREASE fires the moment for the NEWEST
// unlock row, dismiss consumes it, and the CelebrationMoment renders under reduce-motion (static).

let mockMe: { data?: MeAchievementsResponse } = { data: undefined };
jest.mock('../../store/achievementsApi', () => ({ useGetMyAchievementsQuery: () => mockMe }));
// reduce-motion ON — the static variant path (deterministic, no Animated timers in jest).
jest.mock('../../a11y/useReducedMotion', () => ({ useReducedMotion: () => true }));

import { CelebrationHost } from './CelebrationHost';
import { CelebrationMoment } from './CelebrationMoment';

const ach = (id: string, name: string, unlockedAt: string, tier: 'prestige' | 'standard' | 'secret' = 'standard'): EarnedAchievement => ({
  id,
  key: 'a1_first_print',
  name,
  description: `${name} — do the thing.`,
  criterion: {} as never,
  tier,
  kind: 'milestone',
  reward: { badge: true, pixels: 50 },
  unlockedAt,
});

const me = (over: Partial<MeAchievementsResponse['summary']>, earned: EarnedAchievement[], found: EarnedAchievement[] = []): MeAchievementsResponse => ({
  summary: { earned: earned.length, inProgress: 0, secretsFound: found.length, secretsTotal: 6, ...over },
  earned,
  inProgress: [],
  secrets: { found, lockedCount: 6 - found.length },
});

function makeStore() {
  const store = configureStore({ reducer: { auth: authReducer, prefs: prefsReducer } });
  store.dispatch(setTokens({ accessToken: 'tok', refreshToken: 'ref' })); // authed
  return store;
}

describe('P11 ACH-06 celebration trigger (useUnlockCelebration + CelebrationHost)', () => {
  it('baselines SILENTLY on the first observation — never re-celebrates existing unlocks on a fresh session', () => {
    mockMe = { data: me({ earned: 1 }, [ach('e1', 'FirstPrint', '2026-03-01T00:00:00Z')]) };
    const store = makeStore();
    render(
      <Provider store={store}>
        <CelebrationHost />
      </Provider>,
    );
    // no celebration on the first read...
    expect(screen.queryByText('ACHIEVEMENT UNLOCKED')).toBeNull();
    // ...but the baseline is recorded (earned 1 + secretsFound 0 = 1).
    expect(store.getState().prefs.lastSeenUnlockCount).toBe(1);
  });

  it('fires the moment on an INCREASE, for the NEWEST unlocked row', () => {
    // pre-baselined at 1; the new read has 2 earned + 1 found secret (total 3) — the secret is the newest.
    mockMe = { data: me({ earned: 1 }, [ach('e1', 'Older', '2026-03-01T00:00:00Z')]) };
    const store = makeStore();
    store.dispatch(setLastSeenUnlockCount(1));
    const { rerender } = render(
      <Provider store={store}>
        <CelebrationHost />
      </Provider>,
    );
    expect(screen.queryByText('ACHIEVEMENT UNLOCKED')).toBeNull();

    act(() => {
      mockMe = {
        data: me({ earned: 2 }, [ach('e1', 'Older', '2026-03-01T00:00:00Z'), ach('e2', 'Middle', '2026-03-05T00:00:00Z')], [ach('s1', 'NewestEgg', '2026-03-09T00:00:00Z', 'secret')]),
      };
      rerender(
        <Provider store={store}>
          <CelebrationHost />
        </Provider>,
      );
    });

    expect(screen.getByText('ACHIEVEMENT UNLOCKED')).toBeTruthy();
    expect(screen.getByText('NEWESTEGG')).toBeTruthy(); // the latest unlockedAt across earned + found
    // the baseline advances so it can't re-fire (2 earned + 1 secret = 3)
    expect(store.getState().prefs.lastSeenUnlockCount).toBe(3);
  });

  it('dismiss (CONTINUE) consumes the celebration', () => {
    mockMe = { data: me({ earned: 1 }, [ach('e1', 'Older', '2026-03-01T00:00:00Z')]) };
    const store = makeStore();
    store.dispatch(setLastSeenUnlockCount(0)); // not null → fires on total>0
    render(
      <Provider store={store}>
        <CelebrationHost />
      </Provider>,
    );
    expect(screen.getByText('ACHIEVEMENT UNLOCKED')).toBeTruthy();
    fireEvent.press(screen.getByText('CONTINUE'));
    expect(screen.queryByText('ACHIEVEMENT UNLOCKED')).toBeNull();
  });
});

describe('CelebrationMoment — reduce-motion static variant', () => {
  it('renders the badge, title, reward + CONTINUE fully (no animation) under reduce-motion', () => {
    const store = configureStore({ reducer: { auth: authReducer, prefs: prefsReducer } });
    render(
      <Provider store={store}>
        <CelebrationMoment achievement={ach('e1', 'GoldFoil', '2026-03-12T00:00:00Z', 'prestige')} onContinue={jest.fn()} />
      </Provider>,
    );
    expect(screen.getByText('ACHIEVEMENT UNLOCKED')).toBeTruthy();
    expect(screen.getByText('GOLDFOIL')).toBeTruthy();
    expect(screen.getByText('+50 PIXELS')).toBeTruthy();
    expect(screen.getByText('CONTINUE')).toBeTruthy();
  });
});
