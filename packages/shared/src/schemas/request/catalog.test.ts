import { describe, it, expect } from 'vitest';
import { isoDateSchema } from './catalog';

// CAT-02 releaseDate / ownedSince — a plain calendar date. The regex fixes the shape; the refine must
// reject calendar-IMPOSSIBLE dates (Feb-31) rather than let Date.parse roll them over — else Postgres'
// `date` column raises 22008 at INSERT and the request 500s instead of returning a 422.
describe('CAT-02 isoDateSchema — calendar validity', () => {
  it('accepts real dates incl. a leap day', () => {
    expect(isoDateSchema.safeParse('2026-07-02').success).toBe(true);
    expect(isoDateSchema.safeParse('2024-02-29').success).toBe(true); // 2024 is a leap year
  });

  it('rejects calendar-impossible dates instead of rolling them over', () => {
    expect(isoDateSchema.safeParse('2024-02-31').success).toBe(false);
    expect(isoDateSchema.safeParse('2026-02-30').success).toBe(false);
    expect(isoDateSchema.safeParse('2026-04-31').success).toBe(false);
    expect(isoDateSchema.safeParse('2025-02-29').success).toBe(false); // 2025 is NOT a leap year
  });

  it('rejects malformed strings', () => {
    expect(isoDateSchema.safeParse('2026-13-01').success).toBe(false);
    expect(isoDateSchema.safeParse('2026-00-10').success).toBe(false);
    expect(isoDateSchema.safeParse('not-a-date').success).toBe(false);
  });
});
