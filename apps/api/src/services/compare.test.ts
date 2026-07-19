import { describe, it, expect } from 'vitest';
import { buildCompare, leaderOf, type CompareInput } from './compare';

// SOC-03 · PROF-03 · F06 — the compare omission engine, unit-tested across all four privacy postures.
// This is where the compare field-diff precision lives (the integration path can only exercise the
// both-visible posture at M6 — no per-facet privacy toggle in the data model yet). Tags: SOC-03,
// PROF-03, F06.

const card = (id: string) => ({ id, imageUrl: null, thumbUrl: null, isCustom: false, isPremium: false });

const INPUT: CompareInput = {
  friend: { userId: '11111111-1111-1111-1111-111111111111', username: 'rival', avatarUrl: null, avatarConfig: null },
  yourHours: 40,
  yourGames: 3,
  theirHours: 55,
  theirGames: 4,
  games: [
    { gameId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', title: 'Shared', yourCard: card('c1'), theirCard: card('c2'), yourHours: 10, theirHours: 25 },
  ],
  cohort: [
    { userId: 'me', username: 'me', avatarUrl: null, avatarConfig: null, hours: 40, games: 3, isMe: true },
    { userId: '11111111-1111-1111-1111-111111111111', username: 'rival', avatarUrl: null, avatarConfig: null, hours: 55, games: 4, isMe: false },
  ],
};

describe('SOC-03: leaderOf', () => {
  it('resolves you / them / tie', () => {
    expect(leaderOf(5, 3)).toBe('you');
    expect(leaderOf(3, 5)).toBe('them');
    expect(leaderOf(4, 4)).toBe('tie');
  });
});

describe('PROF-03 · F06: compare omission — both visible (the M6 default posture)', () => {
  const res = buildCompare(INPUT, { hoursVisible: true, collectionVisible: true });
  it('carries the full shape — totals with theirHours/theirGames/leader, games, leaderboard', () => {
    expect(Object.keys(res.totals).sort()).toEqual(['leader', 'theirGames', 'theirHours', 'yourGames', 'yourHours']);
    expect(res.totals.leader).toBe('them'); // 40 vs 55
    expect(res.games).toHaveLength(1);
    const g0 = res.games![0]!;
    expect(Object.keys(g0).sort()).toEqual(['gameId', 'leader', 'theirCard', 'theirHours', 'title', 'yourCard', 'yourHours']);
    expect(g0.leader).toBe('them'); // 10 vs 25
    expect(res.leaderboard).toHaveLength(2);
    expect(res.leaderboard![0]).toMatchObject({ rank: 1, isMe: true });
  });
});

describe('PROF-03 · F06: friend HIDES HOURS → theirHours + totals.leader + leaderboard omitted, games axis survives', () => {
  const res = buildCompare(INPUT, { hoursVisible: false, collectionVisible: true });
  it('omits every theirHours + totals.leader + the whole leaderboard; keeps games + your hours', () => {
    expect(Object.keys(res.totals).sort()).toEqual(['theirGames', 'yourGames', 'yourHours']);
    expect('theirHours' in res.totals).toBe(false);
    expect('leader' in res.totals).toBe(false);
    expect(res.leaderboard).toBeUndefined();
    expect(res.games).toHaveLength(1);
    const g0 = res.games![0]!;
    expect('theirHours' in g0).toBe(false);
    expect(g0.yourHours).toBe(10); // your own hours survive
    expect(g0.leader).toBe('tie'); // no hours face-off possible
  });
});

describe('PROF-03 · F06: friend HIDES COLLECTION → games + totals.theirGames omitted, your totals survive', () => {
  const res = buildCompare(INPUT, { hoursVisible: true, collectionVisible: false });
  it('omits games + totals.theirGames; keeps hours totals + leaderboard', () => {
    expect(res.games).toBeUndefined();
    expect('theirGames' in res.totals).toBe(false);
    expect(res.totals.yourGames).toBe(3); // your own games survive
    expect(res.totals.theirHours).toBe(55); // hours still compare
    expect(res.leaderboard).toHaveLength(2);
  });
});

describe('PROF-03 · F06: friend HIDES BOTH → only your own totals remain', () => {
  const res = buildCompare(INPUT, { hoursVisible: false, collectionVisible: false });
  it('leaves totals with yourHours + yourGames only; no games, no leaderboard', () => {
    expect(Object.keys(res.totals).sort()).toEqual(['yourGames', 'yourHours']);
    expect(res.games).toBeUndefined();
    expect(res.leaderboard).toBeUndefined();
  });
});
