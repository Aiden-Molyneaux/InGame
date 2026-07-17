import { timeAgo, cooldownRemaining } from './timeAgo';

// P8 — the SOC-06/08 relative-time + cooldown grammar (deterministic via an injected `now`).
const NOW = Date.parse('2026-07-16T12:00:00Z');

describe('timeAgo', () => {
  it('sub-minute → JUST NOW', () => {
    expect(timeAgo('2026-07-16T11:59:40Z', NOW)).toBe('JUST NOW');
  });
  it('minutes / hours', () => {
    expect(timeAgo('2026-07-16T11:30:00Z', NOW)).toBe('30M AGO');
    expect(timeAgo('2026-07-16T07:00:00Z', NOW)).toBe('5H AGO');
  });
  it('yesterday vs N days', () => {
    expect(timeAgo('2026-07-15T10:00:00Z', NOW)).toBe('YESTERDAY');
    expect(timeAgo('2026-07-13T12:00:00Z', NOW)).toBe('3D AGO');
  });
  it('older than a week → an absolute month/day', () => {
    // exact calendar label is locale-dependent; assert it is NOT a relative "AGO" form
    expect(timeAgo('2026-06-01T12:00:00Z', NOW)).not.toMatch(/AGO|YESTERDAY|JUST NOW/);
  });
  it('absent / unparseable → empty', () => {
    expect(timeAgo(null, NOW)).toBe('');
    expect(timeAgo('not-a-date', NOW)).toBe('');
  });
});

describe('cooldownRemaining', () => {
  it('a near future window → TRY AGAIN IN N D', () => {
    expect(cooldownRemaining('2026-07-20T12:00:00Z', NOW)).toBe('TRY AGAIN IN 4 D');
  });
  it('already lapsed / absent → empty (caller re-enables ADD)', () => {
    expect(cooldownRemaining('2026-07-01T12:00:00Z', NOW)).toBe('');
    expect(cooldownRemaining(undefined, NOW)).toBe('');
  });
});
