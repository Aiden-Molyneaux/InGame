import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { FeedItem, FeedItemType } from '@ingame/shared';
import prefsReducer from '../../store/prefsSlice';

// Mock EntryCard to a stub (avoids the skia CardFace path in jest) — the feed peek carries the title.
jest.mock('../EntryCard', () => {
  const { Text } = require('react-native');
  return { EntryCard: ({ title }: { title: string }) => <Text>{`CARD:${title}`}</Text> };
});

import { FeedRow } from './FeedRow';

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

function item(type: FeedItemType, over: Partial<FeedItem> = {}): FeedItem {
  return {
    feedItemId: `${type}:a:1`,
    actor: { userId: 'act-1', username: 'riko', avatarUrl: null },
    type,
    aggregateCount: 1,
    objects: [{ gameId: 'g1', title: 'Hades' }],
    occurredAt: '2026-07-16T10:00:00Z',
    windowStart: '2026-07-16T00:00:00Z',
    windowEnd: '2026-07-16T12:00:00Z',
    ...over,
  };
}

describe('FeedRow — SOC-06 type-copy matrix + aggregation', () => {
  it('added_games → the aggregate count line ("added 12 games")', () => {
    render(
      wrap(
        <FeedRow
          item={item('added_games', { aggregateCount: 12, objects: [{ gameId: 'g1', title: 'Hades' }, { gameId: 'g2', title: 'Celeste' }, { gameId: 'g3', title: 'Elden Ring' }] })}
          onActorPress={jest.fn()}
          onObjectPress={jest.fn()}
        />,
      ),
    );
    expect(screen.getByText('12 games')).toBeTruthy();
    // +N more = aggregateCount − objects.length = 12 − 3 = 9
    expect(screen.getByText('+9')).toBeTruthy();
  });

  it('beat_game / completed_game / published_card name the game', () => {
    const cases: [FeedItemType, string][] = [
      ['beat_game', 'beat'],
      ['completed_game', 'completed'],
      ['published_card', 'published a card for'],
    ];
    for (const [type, verb] of cases) {
      const { unmount } = render(wrap(<FeedRow item={item(type)} onActorPress={jest.fn()} onObjectPress={jest.fn()} />));
      expect(screen.getByText(verb)).toBeTruthy();
      expect(screen.getByText('Hades')).toBeTruthy();
      unmount();
    }
  });

  it('unlocked_achievement renders the label, no +N more', () => {
    render(
      wrap(
        <FeedRow
          item={item('unlocked_achievement', { aggregateCount: 1, objects: [{ achievementId: 'ach-1', label: 'Shelf Life' }] })}
          onActorPress={jest.fn()}
          onObjectPress={jest.fn()}
        />,
      ),
    );
    expect(screen.getByText('Shelf Life')).toBeTruthy();
    expect(screen.queryByText(/^\+/)).toBeNull();
  });

  it('walk-4 — the achievement tile is a labelled button; tap fires onAchievementPress with the achievementId', () => {
    const onAch = jest.fn();
    render(
      wrap(
        <FeedRow
          item={item('unlocked_achievement', { aggregateCount: 1, objects: [{ achievementId: 'ach-1', label: 'Shelf Life' }] })}
          onActorPress={jest.fn()}
          onObjectPress={jest.fn()}
          onAchievementPress={onAch}
        />,
      ),
    );
    fireEvent.press(screen.getByLabelText('Shelf Life details'));
    expect(onAch).toHaveBeenCalledWith('ach-1');
  });

  it('walk-3 regression — two peeked cards for the SAME game render without a React duplicate-key error', () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(
        wrap(
          <FeedRow
            item={item('published_card', {
              aggregateCount: 2,
              objects: [
                { gameId: 'g1', title: 'Hades', card: { id: 'card-1', imageUrl: null, thumbUrl: null } },
                { gameId: 'g1', title: 'Hades', card: { id: 'card-2', imageUrl: null, thumbUrl: null } },
              ],
            })}
            onActorPress={jest.fn()}
            onObjectPress={jest.fn()}
          />,
        ),
      );
      expect(screen.getAllByText('CARD:Hades')).toHaveLength(2);
      const dupKey = errSpy.mock.calls.find((c) => String(c[0]).includes('same key'));
      expect(dupKey).toBeUndefined();
    } finally {
      errSpy.mockRestore();
    }
  });

  it('actor tap → onActorPress(actorId); a peeked card tap → onObjectPress(gameId)', () => {
    const onActor = jest.fn();
    const onObject = jest.fn();
    render(wrap(<FeedRow item={item('beat_game')} onActorPress={onActor} onObjectPress={onObject} />));
    fireEvent.press(screen.getByLabelText('riko profile'));
    expect(onActor).toHaveBeenCalledWith('act-1');
    fireEvent.press(screen.getByLabelText('Hades'));
    expect(onObject).toHaveBeenCalledWith('g1');
  });
});
