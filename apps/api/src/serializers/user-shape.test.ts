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
    avatarConfig: null,
    privacy: 'friends',
    role: 'user',
    adminTier: null,
    favouriteGameId: null,
    favouriteGenreIds: [],
    usernamePending: false,
    usernameChangedAt: null,
    nowPlayingGameId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    lastSeenAt: null, // M6 P7 presence stamp — never serialized to any shape (admin-console only)
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

  it('CAT-07 — cardsPublished (the MY CONTRIBUTIONS teaser count) rides the self shape, distinct from stats.cardsDesigned', () => {
    const out = toSelfShape(makeUser(), {
      gamertags: [],
      usernameNextChangeAt: null,
      // finished designs (private + published) = 4; PUBLISHED contributions = 2 — the teaser shows 2.
      stats: { games: 0, hours: 0, completionPct: 0, cardsDesigned: 4, adoptionsReceived: 0, friends: 0 },
      favouriteGame: null,
      nowPlaying: null,
      top10: [],
      cardsPublished: 2,
    });
    expect(selfProfileSchema.parse(out)).toEqual(out);
    expect(out.cardsPublished).toBe(2); // the public-contributions count (the teaser)
    expect(out.stats.cardsDesigned).toBe(4); // the finished-designs stat stays independent
  });

  it('PROF-08 (W-4) — avatarConfig rides on the self + both cross-user shapes (null default + a set config)', () => {
    // null default (byte-identical to today's monogram) parses on every shape.
    expect(toSelfShape(makeUser()).avatarConfig).toBeNull();
    expect(toPublicShape(makeUser(), { relationship: 'none', mutualFriendsCount: 0 }).avatarConfig).toBeNull();
    // a set config survives the strict schemas on the self + friend/public shapes.
    const cfg = { bg: '#101018', ink: '#ffd23f', glyph: 'AM', frame: 'ring' as const };
    const self = toSelfShape(makeUser({ avatarConfig: cfg }));
    expect(selfProfileSchema.parse(self)).toEqual(self);
    expect(self.avatarConfig).toEqual(cfg);
    const pub = toPublicShape(makeUser({ avatarConfig: cfg }), { relationship: 'none', mutualFriendsCount: 0 });
    expect(publicProfileSchema.parse(pub)).toEqual(pub);
    expect(pub.avatarConfig).toEqual(cfg);
    const friend = toFriendShape(makeUser({ avatarConfig: cfg }), {
      relationship: 'friend',
      mutualFriendsCount: 0,
      friendsCount: 0,
      gamertags: [],
      cardsPublished: 0,
      top10: [],
      stats: { games: 0, hours: 0, completionPct: 0, cardsDesigned: 0, adoptionsReceived: 0, friends: 0 },
      device: { shellId: 'teal', screenThemeId: 'midnight', stickerComposition: { version: 1, stickers: [] } },
      favouriteGame: null,
      nowPlaying: null,
    });
    expect(friendProfileSchema.parse(friend)).toEqual(friend);
    expect(friend.avatarConfig).toEqual(cfg);
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

  it('friend (full) shape adds exactly bio + top10 + cardsPublished + the C4 trio (stats/device/nowPlaying) + favouriteGame — NO privacy (F-16/0055)', () => {
    const favCard = { id: 'default', imageUrl: null, thumbUrl: null, isCustom: false as const, isPremium: false };
    const out = toFriendShape(makeUser(), {
      relationship: 'friend',
      mutualFriendsCount: 5,
      friendsCount: 12,
      gamertags: [],
      cardsPublished: 3, // CAT-07 — {USERNAME}'S CONTRIBUTIONS teaser count (published only)
      top10: [],
      // M6 C4 — the PROF-05 board rows (stats six-pack · THEIR-DEVICE · nowPlaying pin).
      stats: { games: 2, hours: 40, completionPct: 50, cardsDesigned: 1, adoptionsReceived: 0, friends: 12 },
      device: { shellId: 'teal', screenThemeId: 'midnight', stickerComposition: { version: 1, stickers: [] } },
      // PROF-01/05 (owner walk-ruling) — the PINNED FAVOURITE (flattened card, same expansion as nowPlaying).
      favouriteGame: { gameId: '22222222-2222-4222-8222-222222222222', title: 'Silent Hill', hours: 120, card: favCard },
      nowPlaying: null,
    });
    expect(friendProfileSchema.parse(out)).toEqual(out);
    expect(out.bio).toBe('collector of trophies');
    expect(out.friendsCount).toBe(12);
    expect(out.cardsPublished).toBe(3); // CAT-07 — the {USERNAME}'S CONTRIBUTIONS teaser count rides the friend shape
    expect(out.top10).toEqual([]);
    expect(out.stats).toMatchObject({ games: 2, hours: 40 }); // C4 — PROF-04 six-pack on the friend shape
    expect(out.device).toMatchObject({ shellId: 'teal', screenThemeId: 'midnight' }); // C4 — DEV-02/04
    expect(out.favouriteGame).toMatchObject({ title: 'Silent Hill', hours: 120 }); // PROF-01/05 pinned favourite
    expect('composition' in out.favouriteGame!.card).toBe(false); // never the layers cross-user (OQ-122)
    expect(out.nowPlaying).toBeNull(); // C4 — WTP-03 (no pin)
    expect('email' in out).toBe(false);
    // F-16 / decision 0055 — neither cross-user shape exposes the target's own `privacy` value (the
    // ruled-never-implemented drop, landed with the C4 follow-up).
    expect('privacy' in out).toBe(false);
    // F06 — the LIMITED shape must NOT gain the C4 trio (the strict publicProfileSchema proves it).
    const limited = toPublicShape(makeUser(), { relationship: 'none', mutualFriendsCount: 0 });
    expect('stats' in limited).toBe(false);
    expect('device' in limited).toBe(false);
    expect('favouriteGame' in limited).toBe(false);
    expect('nowPlaying' in limited).toBe(false);
    expect('cardsPublished' in limited).toBe(false); // CAT-07 — the teaser count is friend-only (F06 allowlist)
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
