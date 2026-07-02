import {
  ANONYMIZED_AUTHOR,
  type AnonymizedAuthor,
  type FriendProfile,
  type GamertagView,
  type Privacy,
  type PublicProfile,
  type Relationship,
  type Role,
  type SelfGameExpansion,
  type SelfProfile,
  type SelfStats,
} from '@ingame/shared';
import type { UserRow, GamertagRow } from '../db/schema';

// F06 — the read-path privacy serializer. Every response that can carry another principal's data is
// shaped here from an EXPLICIT ALLOWLIST of fields (never the raw row), per the PROF-03 privacy
// state. A leaked field would fail the response zod schema (asserted by the relationship-matrix
// test). `GET /me` is the self-shape exemplar; `GET /users/:id` uses toPublicShape / toFriendShape.

/** PROF-02 — a gamertag row → its view shape (allowlist). */
export function toGamertagView(row: GamertagRow): GamertagView {
  return { id: row.id, platform: row.platform as GamertagView['platform'], handle: row.handle };
}

/** PROF-04 — the honest empty stat block (a fresh account, or a serializer default). */
export const EMPTY_SELF_STATS: SelfStats = {
  games: 0,
  hours: 0,
  completionPct: 0,
  cardsDesigned: 0,
  adoptionsReceived: 0,
  friends: 0,
};

/** Cross-table extras the self-view needs beyond the user row (loaded by the service). */
export interface SelfExtras {
  gamertags: GamertagView[];
  /** PROF-06 — when the next username change is allowed (ISO-8601 UTC), or null ⇒ allowed now. */
  usernameNextChangeAt: string | null;
  /** PROF-04 (M3) — derived from the real shelf by the service. */
  stats: SelfStats;
  /** PROF-01/05 + WTP-03 (M3) — the expanded pins (null ⇒ unset). */
  favouriteGame: SelfGameExpansion | null;
  nowPlaying: SelfGameExpansion | null;
}

export function toSelfShape(
  row: UserRow,
  extras: SelfExtras = {
    gamertags: [],
    usernameNextChangeAt: null,
    stats: EMPTY_SELF_STATS,
    favouriteGame: null,
    nowPlaying: null,
  },
): SelfProfile {
  return {
    id: row.id,
    username: row.username,
    avatarUrl: row.avatarUrl, // null ⇒ default monogram (PROF-08)
    bio: row.bio,
    memberSince: row.createdAt.toISOString(),
    privacy: row.privacy as Privacy,
    role: row.role as Role,
    adminTier: row.adminTier, // self-view only exposes the tier (PROF-09)
    usernamePending: row.usernamePending, // AUTH-09 completion gate
    emailVerified: row.emailVerifiedAt !== null, // AUTH-08 (derived, not the timestamp)
    favouriteGameId: row.favouriteGameId,
    favouriteGenreIds: row.favouriteGenreIds,
    gamertags: extras.gamertags,
    usernameNextChangeAt: extras.usernameNextChangeAt,
    stats: extras.stats,
    favouriteGame: extras.favouriteGame,
    nowPlaying: extras.nowPlaying,
  };
}

export interface OtherPrincipalContext {
  relationship: Relationship;
  mutualFriendsCount: number;
}

/** Friend-view adds the friend-visible cross-table extras (gamertags, honest friends-count). */
export interface FriendContext extends OtherPrincipalContext {
  friendsCount: number;
  gamertags: GamertagView[];
}

/** Non-friend / limited public shape (PROF-03) — nothing beyond this allowlist leaks. */
export function toPublicShape(row: UserRow, ctx: OtherPrincipalContext): PublicProfile {
  const base: PublicProfile = {
    id: row.id,
    username: row.username,
    avatarUrl: row.avatarUrl,
    memberSince: row.createdAt.toISOString(),
    mutualFriendsCount: ctx.mutualFriendsCount,
    relationship: ctx.relationship,
  };
  // Generic public trust badge only (PROF-09 — the tier is NOT disclosed publicly).
  if (row.role === 'admin') {
    base.staff = true;
  }
  return base;
}

/** Friend / full shape (PROF-05) — the public allowlist plus the friend-visible additions. */
export function toFriendShape(row: UserRow, ctx: FriendContext): FriendProfile {
  return {
    ...toPublicShape(row, ctx),
    bio: row.bio,
    privacy: row.privacy as Privacy,
    favouriteGenreIds: row.favouriteGenreIds,
    gamertags: ctx.gamertags,
    friendsCount: ctx.friendsCount,
  };
}

/**
 * AUTH-07 anonymized-author shape. A deleted user's still-public content (a card's `designer`, a
 * catalog entry's `createdBy`) must not leak the original username/userId — the serializer maps a
 * deleted author to the anonymized constant.
 */
export function authorShapeFor(
  author: Pick<UserRow, 'id' | 'username' | 'deletedAt'>,
): { userId: string; username: string } | AnonymizedAuthor {
  if (author.deletedAt) {
    return ANONYMIZED_AUTHOR;
  }
  return { userId: author.id, username: author.username };
}
