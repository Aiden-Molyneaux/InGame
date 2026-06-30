import { describe, it, expect } from 'vitest';
import {
  patchMeRequestSchema,
  bioSchema,
  usernameSchema,
  BIO_MAX,
  PATCH_ME_FIELDS,
} from './profile';

// CONVENTIONS rule 3 — the server-side parse is the security boundary. These prove the bound +
// trim + sanitize behavior the F29 slice relies on (a zod failure serializes as 422 in the API).
describe('SYS-02: PATCH /me request schema', () => {
  it('accepts a valid bio and trims surrounding whitespace', () => {
    const parsed = patchMeRequestSchema.parse({ bio: '  hello world  ' });
    expect(parsed.bio).toBe('hello world');
  });

  it('rejects a bio longer than the 140-char bound', () => {
    const result = bioSchema.safeParse('x'.repeat(BIO_MAX + 1));
    expect(result.success).toBe(false);
  });

  it('counts length AFTER trim/sanitize (trailing spaces do not push it over)', () => {
    const padded = 'x'.repeat(BIO_MAX) + '     ';
    expect(bioSchema.safeParse(padded).success).toBe(true);
  });

  it('strips zero-width + bidi control characters (SYS-02/F19)', () => {
    const parsed = bioSchema.parse('a\u200Bb\u202Ec');
    expect(parsed).toBe('abc');
  });

  it('enforces the username charset [a-z0-9_] and length', () => {
    expect(usernameSchema.safeParse('good_name1').success).toBe(true);
    expect(usernameSchema.safeParse('BadName').success).toBe(false); // uppercase
    expect(usernameSchema.safeParse('no').success).toBe(false); // too short
    expect(usernameSchema.safeParse('has space').success).toBe(false);
  });

  it('rejects unknown keys (.strict) — the body never carries an actor id (SYS-01)', () => {
    const result = patchMeRequestSchema.safeParse({ bio: 'hi', userId: 'attacker' });
    expect(result.success).toBe(false);
  });

  it('exposes the contract field set for the fidelity snapshot', () => {
    expect(PATCH_ME_FIELDS).toEqual([
      'username',
      'bio',
      'favouriteGenreIds',
      'favouriteGameId',
      'privacy',
    ]);
  });
});
