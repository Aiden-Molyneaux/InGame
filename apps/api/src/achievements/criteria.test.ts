import { describe, it, expect } from 'vitest';
import type { AchievementCriterion } from '@ingame/shared';
import { targetOf, unitOf, triggerEventsOf } from './criteria';
import { matchesPredicate } from '../repositories/achievement-repo';

// Unit coverage for the pure criterion logic (no DB): the predicate matcher (B6 hour-window + B7/A12
// payload equality) + the target/unit/trigger accessors the engine + reads dispatch on.
// Tags: ACH-02, ACH-07.

describe('ACH-07: matchesPredicate (payload equality + UTC-hour window)', () => {
  const at = (hour: number) => new Date(Date.UTC(2026, 6, 17, hour, 30, 0));

  it('payloadEquals matches a string field and rejects a mismatch/absence', () => {
    const where = { payloadEquals: { status: 'beaten' } };
    expect(matchesPredicate({ status: 'beaten' }, at(12), where)).toBe(true);
    expect(matchesPredicate({ status: 'playing' }, at(12), where)).toBe(false);
    expect(matchesPredicate({}, at(12), where)).toBe(false);
  });

  it('the ACH-07 entity-target predicate matches only the configured gameId', () => {
    const where = { payloadEquals: { gameId: 'game-x' } };
    expect(matchesPredicate({ gameId: 'game-x' }, at(12), where)).toBe(true);
    expect(matchesPredicate({ gameId: 'game-y' }, at(12), where)).toBe(false);
  });

  it('occurredAtHourIn matches the B6 03:00–05:00 UTC window (hours 3,4) only', () => {
    const where = { occurredAtHourIn: [3, 4] };
    expect(matchesPredicate({}, at(3), where)).toBe(true);
    expect(matchesPredicate({}, at(4), where)).toBe(true);
    expect(matchesPredicate({}, at(5), where)).toBe(false);
    expect(matchesPredicate({}, at(2), where)).toBe(false);
  });

  it('an empty/undefined predicate always matches', () => {
    expect(matchesPredicate({}, at(12), undefined)).toBe(true);
    expect(matchesPredicate({ anything: '1' }, at(12), {})).toBe(true);
  });
});

describe('ACH-02: criterion accessors (target / unit / trigger events)', () => {
  it('count kinds expose a numeric target + unit; one-shot kinds have neither', () => {
    const count: AchievementCriterion = { kind: 'event_count', events: ['card.published'], threshold: 5, unit: 'cards' };
    expect(targetOf(count)).toBe(5);
    expect(unitOf(count)).toBe('cards');
    const match: AchievementCriterion = { kind: 'event_match', event: 'wallet.daily_claimed', where: { occurredAtHourIn: [3, 4] } };
    expect(targetOf(match)).toBeNull();
    expect(unitOf(match)).toBeUndefined();
    const dual: AchievementCriterion = { kind: 'dual_actor', event: 'collection.entry_added', link: 'recommendation', creditVia: 'recommender' };
    expect(targetOf(dual)).toBeNull();
  });

  it('triggerEventsOf returns the event types each kind listens to', () => {
    expect(triggerEventsOf({ kind: 'event_count', events: ['a', 'b'], threshold: 1, unit: 'x' })).toEqual(['a', 'b']);
    expect(triggerEventsOf({ kind: 'participant_count', event: 'friend.added', threshold: 1, unit: 'friends' })).toEqual(['friend.added']);
    expect(
      triggerEventsOf({ kind: 'received_count', event: 'card.adopted', creditVia: 'card_designer', threshold: 1, unit: 'adoptions' }),
    ).toEqual(['card.adopted']);
  });
});
