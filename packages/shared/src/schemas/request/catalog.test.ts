import { describe, it, expect } from 'vitest';
import { createGameRequestSchema, isoDateSchema } from './catalog';

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

// CAT-02 (walk-4 P2-c, product-spec 0.68 / api-contract 0.83) — only `name` is required. The M3 build
// had read the spec row's unmarked "genre(s)" as required (`.min(1)`), which blocked the create form;
// an EMPTY array is valid now. The field itself is still required in the body (send `[]`), the CAT-04
// controlled-list check still runs server-side on any ids present, and the cap still bites.
describe('CAT-02 createGameRequestSchema — genres are optional', () => {
  const uuid = '11111111-1111-4111-8111-111111111111';

  it('accepts an EMPTY genreIds', () => {
    expect(createGameRequestSchema.safeParse({ name: 'Celeste', genreIds: [] }).success).toBe(true);
  });

  it('still accepts genres when given, and still refuses a non-uuid id', () => {
    expect(createGameRequestSchema.safeParse({ name: 'Celeste', genreIds: [uuid] }).success).toBe(true);
    expect(createGameRequestSchema.safeParse({ name: 'Celeste', genreIds: ['rpg'] }).success).toBe(false);
  });

  it('still requires a name, still caps the list, still refuses unknown keys (.strict)', () => {
    expect(createGameRequestSchema.safeParse({ genreIds: [] }).success).toBe(false);
    expect(createGameRequestSchema.safeParse({ name: '', genreIds: [] }).success).toBe(false);
    expect(
      createGameRequestSchema.safeParse({ name: 'Celeste', genreIds: Array(9).fill(uuid) }).success,
    ).toBe(false);
    expect(
      createGameRequestSchema.safeParse({ name: 'Celeste', genreIds: [], createdBy: uuid }).success,
    ).toBe(false);
  });
});
