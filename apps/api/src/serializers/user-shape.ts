import {
  ANONYMIZED_AUTHOR,
  type AnonymizedAuthor,
  type FriendProfile,
  type Privacy,
  type PublicProfile,
  type Relationship,
  type Role,
  type SelfProfile,
} from '@ingame/shared';
import type { UserRow } from '../db/schema';

// F06 — the read-path privacy serializer. Every response that can carry another principal's data is
// shaped here from an EXPLICIT ALLOWLIST of fields (never the raw row), per the PROF-03 privacy
// state. A leaked field would fail the response zod schema (asserted by the relationship-matrix
// test). `GET /me` is the self-shape exemplar; the broader read-path build-out is M2-foundation.

export function toSelfShape(row: UserRow): SelfProfile {
  return {
    id: row.id,
    username: row.username,
    avatarUrl: row.avatarUrl, // null ⇒ default monogram (PROF-08)
    bio: row.bio,
    memberSince: row.createdAt.toISOString(),
    privacy: row.privacy as Privacy,
    role: row.role as Role,
    adminTier: row.adminTier, // self-view only exposes the tier (PROF-09)
  };
}

export interface OtherPrincipalContext {
  relationship: Relationship;
  mutualFriendsCount: number;
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
export function toFriendShape(row: UserRow, ctx: OtherPrincipalContext): FriendProfile {
  return {
    ...toPublicShape(row, ctx),
    bio: row.bio,
    privacy: row.privacy as Privacy,
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
