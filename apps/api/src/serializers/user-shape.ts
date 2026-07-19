import {
  ANONYMIZED_AUTHOR,
  type AnonymizedAuthor,
  type FriendDevice,
  type FriendGameExpansion,
  type FriendProfile,
  type FriendTopTenEntry,
  type GamertagView,
  type Privacy,
  type PublicProfile,
  type Relationship,
  type Role,
  type SelfGameExpansion,
  type SelfProfile,
  type SelfStats,
  type SelfTopTenEntry,
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
  /** SOC-04 (M6 P5) — the actor's own Top-10, rank-ordered (`[]` ⇒ never curated). */
  top10: SelfTopTenEntry[];
  /** CAT-07 — the PUBLISHED-card count backing the MY CONTRIBUTIONS teaser (public contributions;
   *  distinct from `stats.cardsDesigned` = finished designs). Owner ruling 2026-07-19. */
  cardsPublished: number;
}

export function toSelfShape(
  row: UserRow,
  extras: SelfExtras = {
    gamertags: [],
    usernameNextChangeAt: null,
    stats: EMPTY_SELF_STATS,
    favouriteGame: null,
    nowPlaying: null,
    top10: [],
    cardsPublished: 0,
  },
): SelfProfile {
  return {
    id: row.id,
    username: row.username,
    avatarUrl: row.avatarUrl, // null ⇒ default monogram (PROF-08)
    avatarConfig: row.avatarConfig, // PROF-08 (W-4 Monogram Forge) — null ⇒ default monogram
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
    top10: extras.top10,
    cardsPublished: extras.cardsPublished,
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
  /** SOC-04 (M6 P5) — the target's Top-10, FLATTENED (never `composition`, OQ-122). */
  top10: FriendTopTenEntry[];
  /** PROF-04/05 (M6 C4) — the target's six-pack (the SAME statsOf computation the self shape runs).
   *  PROF-07 percentile chips stay absent (threshold-gated; the percentile engine rides M7). */
  stats: SelfStats;
  /** DEV-02/04 (M6 C4, decision 0012) — the THEIR-DEVICE payload (`shellId` is the wire name). */
  device: FriendDevice;
  /** WTP-03 (M6 C4) — the target's Now-Playing pin (flattened card), or null. */
  nowPlaying: FriendGameExpansion | null;
}

/** Non-friend / limited public shape (PROF-03) — nothing beyond this allowlist leaks. */
export function toPublicShape(row: UserRow, ctx: OtherPrincipalContext): PublicProfile {
  const base: PublicProfile = {
    id: row.id,
    username: row.username,
    avatarUrl: row.avatarUrl,
    avatarConfig: row.avatarConfig, // PROF-08 (W-4) — public-safe cosmetic; friend shape inherits via spread
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

/** Friend / full shape (PROF-05) — the public allowlist plus the friend-visible additions. NO `privacy`:
 *  F-16 / decision 0055 — neither cross-user shape exposes the target's own privacy value (the stray
 *  field the contract ruled dropped-in-code; implemented M6 C4 follow-up). */
export function toFriendShape(row: UserRow, ctx: FriendContext): FriendProfile {
  return {
    ...toPublicShape(row, ctx),
    bio: row.bio,
    favouriteGenreIds: row.favouriteGenreIds,
    gamertags: ctx.gamertags,
    friendsCount: ctx.friendsCount,
    top10: ctx.top10,
    stats: ctx.stats, // M6 C4 — PROF-04 six-pack (friend-visible aggregates, PROF-05)
    device: ctx.device, // M6 C4 — DEV-02/04 THEIR-DEVICE (decision 0012)
    nowPlaying: ctx.nowPlaying, // M6 C4 — WTP-03 pin (flattened card)
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
