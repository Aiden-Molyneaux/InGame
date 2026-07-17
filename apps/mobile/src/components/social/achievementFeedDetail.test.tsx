import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { AchievementDefView } from '@ingame/shared';
import prefsReducer from '../../store/prefsSlice';
import { achievementDetailFor } from './achievementFeedDetail';
import { AchievementSheet } from '../achievements/AchievementSheet';

jest.mock('../../a11y/useReducedMotion', () => ({ useReducedMotion: () => true }));

// P8 walk-4 — the unlocked_achievement tap path: a visible def opens the EARNED detail (name · tier ·
// what-for · when-earned = the feed's occurredAt); a caller-masked secret opens SEALED (OQ-148 — the
// tap path leaks NOTHING the defs read masked; the P11 sealed-sheet pattern).

const VISIBLE: AchievementDefView = {
  id: 'ach-1',
  key: 'shelf-life',
  name: 'Shelf Life',
  description: 'Own 100 games.',
  criterion: { kind: 'event_count', events: ['collection.entry_added'], threshold: 100, unit: 'games' },
  tier: 'standard',
  kind: 'milestone',
  reward: { badge: true, pixels: 25 },
};
// The caller hasn't unlocked this secret → the defs read masks it: id + markers ONLY.
const MASKED: AchievementDefView = { id: 'ach-2', kind: 'secret', tier: 'secret', locked: true };
const OCCURRED = '2026-07-15T10:00:00Z';

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

describe('achievementDetailFor — the feed-tap → sheet-detail mapper', () => {
  it('a visible def → the EARNED detail: def data + when-earned = the feed occurredAt, reward stripped to the bare badge', () => {
    const d = achievementDetailFor([VISIBLE, MASKED], 'ach-1', OCCURRED);
    expect(d).toEqual({
      kind: 'earned',
      achievement: expect.objectContaining({
        name: 'Shelf Life',
        description: 'Own 100 games.',
        tier: 'standard',
        unlockedAt: OCCURRED,
        reward: { badge: true }, // no your-wallet PX copy on a friend's unlock
      }),
    });
  });

  it("OQ-148 — a MASKED secret → exactly { kind: 'locked' }: structurally ZERO fields to leak", () => {
    expect(achievementDetailFor([VISIBLE, MASKED], 'ach-2', OCCURRED)).toEqual({ kind: 'locked' });
  });

  it('defs not loaded / unknown id → null (the tap no-ops, never a wrong sheet)', () => {
    expect(achievementDetailFor(undefined, 'ach-1', OCCURRED)).toBeNull();
    expect(achievementDetailFor([VISIBLE], 'ach-zzz', OCCURRED)).toBeNull();
    expect(achievementDetailFor([VISIBLE], undefined, OCCURRED)).toBeNull();
  });
});

describe('the rendered sheet (OQ-148 no-leak proof)', () => {
  it('a named unlock renders the earned detail: name · tier · what-for · EARNED date', () => {
    render(wrap(<AchievementSheet detail={achievementDetailFor([VISIBLE], 'ach-1', OCCURRED)} onClose={jest.fn()} />));
    expect(screen.getByText('SHELF LIFE')).toBeTruthy();
    expect(screen.getByText('STANDARD')).toBeTruthy();
    expect(screen.getByText('Own 100 games.')).toBeTruthy();
    expect(screen.getByText(/EARNED · JUL 15, 2026/)).toBeTruthy();
  });

  it('a masked secret renders SEALED: ??? + SECRET + the generic line — zero name/description/reward leak', () => {
    render(wrap(<AchievementSheet detail={achievementDetailFor([VISIBLE, MASKED], 'ach-2', OCCURRED)} onClose={jest.fn()} />));
    expect(screen.getByText('? ? ?')).toBeTruthy();
    expect(screen.getByText('SECRET')).toBeTruthy();
    expect(screen.getByText(/Keep playing/)).toBeTruthy();
    // the no-leak sweep: nothing named, described, dated, or rewarded surfaces
    expect(screen.queryByText(/SHELF LIFE/)).toBeNull();
    expect(screen.queryByText(/Own 100 games/)).toBeNull();
    expect(screen.queryByText(/EARNED ·/)).toBeNull();
    expect(screen.queryByText(/REWARD/)).toBeNull();
    expect(screen.queryByText(/Pixels/)).toBeNull();
  });
});
