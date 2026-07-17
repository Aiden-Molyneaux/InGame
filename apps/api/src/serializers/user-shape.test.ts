import { describe, it, expect } from 'vitest';
import {
  selfProfileSchema,
  publicProfileSchema,
  friendProfileSchema,
  anonymizedAuthorSchema,
  type Relationship,
} from '@ingame/shared';
import {
  toSelfShape,
  toPublicShape,
  toFriendShape,
  authorShapeFor,
} from './user-shape';
import type { UserRow } from '../db/schema';

function makeUser(over: Partial<UserRow> = {}): UserRow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    username: 'curator',
    usernameNormalized: 'curator',
    email: 'curator@example.com',
    passwordHash: null,
    emailVerifiedAt: null,
    bio: 'collector of trophies',
    avatarUrl: null,
    privacy: 'friends',
    role: 'user',
    adminTier: null,
    favouriteGameId: null,
    favouriteGenreIds: [],
    usernamePending: false,
    usernameChangedAt: null,
    nowPlayingGameId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...over,
  };
}

// F06 — the read-path privacy serializer + the relationship-matrix harness. The response schemas are
// `.strict()`, so a leaked field (a serializer spreading the raw row) would FAIL these. The standing
// matrix asserts the FIELD-SET per relationship, not just a status code.
describe('F06: read-path privacy serializer (relationship matrix)', () => {
  it('self-shape exposes role + adminTier and validates (GET /me exemplar)', () => {
    const out = toSelfShape(makeUser({ role: 'admin', adminTier: 2 }));
    expect(selfProfileSchema.parse(out)).toEqual(out);
    expect(out.adminTier).toBe(2);
  });

  const relationships: Relationship[] = ['none', 'outgoing', 'incoming', 'friend'];

  it('public (non-friend/limited) shape leaks nothing beyond the allowlist', () => {
    for (const relationship of relationships) {
      const out = toPublicShape(makeUser(), { relationship, mutualFriendsCount: 3 });
      // strict schema rejects any extra field — proves no bio/privacy/email leak to non-friends.
      expect(publicProfileSchema.parse(out)).toEqual(out);
      expect('bio' in out).toBe(false);
      expect('email' in out).toBe(false);
    }
  });

  it('friend (full) shape adds exactly bio + top10 + the C4 trio (stats/device/nowPlaying) — NO privacy (F-16/0055)', () => {
    const out = toFriendShape(makeUser(), {
      relationship: 'friend',
      mutualFriendsCount: 5,
      friendsCount: 12,
      gamertags: [],
      top10: [],
      // M6 C4 — the PROF-05 board rows (stats six-pack · THEIR-DEVICE · nowPlaying pin).
      stats: { games: 2, hours: 40, completionPct: 50, cardsDesigned: 1, adoptionsReceived: 0, friends: 12 },
      device: { shellId: 'teal', screenThemeId: 'midnight', stickerComposition: { version: 1, stickers: [] } },
      nowPlaying: null,
    });
    expect(friendProfileSchema.parse(out)).toEqual(out);
    expect(out.bio).toBe('collector of trophies');
    expect(out.friendsCount).toBe(12);
    expect(out.top10).toEqual([]);
    expect(out.stats).toMatchObject({ games: 2, hours: 40 }); // C4 — PROF-04 six-pack on the friend shape
    expect(out.device).toMatchObject({ shellId: 'teal', screenThemeId: 'midnight' }); // C4 — DEV-02/04
    expect(out.nowPlaying).toBeNull(); // C4 — WTP-03 (no pin)
    expect('email' in out).toBe(false);
    // F-16 / decision 0055 — neither cross-user shape exposes the target's own `privacy` value (the
    // ruled-never-implemented drop, landed with the C4 follow-up).
    expect('privacy' in out).toBe(false);
    // F06 — the LIMITED shape must NOT gain the C4 trio (the strict publicProfileSchema proves it).
    const limited = toPublicShape(makeUser(), { relationship: 'none', mutualFriendsCount: 0 });
    expect('stats' in limited).toBe(false);
    expect('device' in limited).toBe(false);
    expect('nowPlaying' in limited).toBe(false);
  });

  it('exposes only a GENERIC staff badge publicly (PROF-09 — tier not disclosed)', () => {
    const out = toPublicShape(makeUser({ role: 'admin', adminTier: 4 }), {
      relationship: 'none',
      mutualFriendsCount: 0,
    });
    expect(out.staff).toBe(true);
    expect('adminTier' in out).toBe(false);
  });

  it('AUTH-07: a deleted author serializes to the anonymized-author shape (no PII leak)', () => {
    const deleted = authorShapeFor(makeUser({ deletedAt: new Date(), username: 'realname' }));
    expect(anonymizedAuthorSchema.parse(deleted)).toEqual(deleted);
    expect(JSON.stringify(deleted)).not.toContain('realname');

    const active = authorShapeFor(makeUser());
    expect(active).toEqual({
      userId: '11111111-1111-4111-8111-111111111111',
      username: 'curator',
    });
  });
});
