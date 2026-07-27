import { describe, it, expect } from 'vitest';
import { meetsAdminTier } from './admin';

// SYS-08: the admin-tier predicate behind `requireAdminTier` (M6 P7 admin console, decision 0081).
// The middleware is a thin wrapper around this function — the DB read and the 403 are mechanical, the
// DECISION lives here, so it is tested directly and exhaustively. Tiers are NESTED (Admin I ⊂ II ⊂ III
// ⊂ IV), and every ambiguous shape must FAIL CLOSED.

describe('SYS-08: meetsAdminTier — the nested-tier gate', () => {
  it('admits an admin whose tier meets or exceeds the requirement (nesting)', () => {
    expect(meetsAdminTier('admin', 1, 1)).toBe(true);
    expect(meetsAdminTier('admin', 4, 1)).toBe(true);
    expect(meetsAdminTier('admin', 3, 2)).toBe(true);
    expect(meetsAdminTier('admin', 4, 4)).toBe(true);
  });

  it('refuses an admin whose tier is BELOW the requirement', () => {
    expect(meetsAdminTier('admin', 1, 2)).toBe(false);
    expect(meetsAdminTier('admin', 2, 3)).toBe(false);
    expect(meetsAdminTier('admin', 3, 4)).toBe(false);
  });

  it('refuses a plain user, whatever tier value rides along', () => {
    expect(meetsAdminTier('user', null, 1)).toBe(false);
    // The belt-and-braces case: a `user` row carrying a stray tier is STILL not an admin. Role is the
    // primary gate; the tier only ranks admins (SYS-08).
    expect(meetsAdminTier('user', 4, 1)).toBe(false);
  });

  it('FAILS CLOSED on every malformed shape', () => {
    expect(meetsAdminTier('admin', null, 1)).toBe(false); // admin with no tier
    expect(meetsAdminTier('admin', undefined, 1)).toBe(false);
    expect(meetsAdminTier('admin', 0, 1)).toBe(false); // below the 1..4 range
    expect(meetsAdminTier('admin', 5, 4)).toBe(false); // above the 1..4 range
    expect(meetsAdminTier('admin', 2.5, 2)).toBe(false); // non-integer
    expect(meetsAdminTier(null, 4, 1)).toBe(false);
    expect(meetsAdminTier(undefined, 4, 1)).toBe(false);
    expect(meetsAdminTier('ADMIN', 4, 1)).toBe(false); // exact match only — no case-folding
    // decision 0034 burned the `moderator` value; it must never re-enter through this gate.
    expect(meetsAdminTier('moderator', 4, 1)).toBe(false);
  });
});
