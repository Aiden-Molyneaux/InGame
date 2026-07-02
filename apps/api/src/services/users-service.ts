import { z } from 'zod';
import type { PublicProfile, FriendProfile } from '@ingame/shared';
import * as profileRepo from '../repositories/profile-repo';
import * as relationshipRepo from '../repositories/relationship-repo';
import * as suspensionRepo from '../repositories/suspension-repo';
import * as profileService from './profile-service';
import { toPublicShape, toFriendShape } from '../serializers/user-shape';
import { NotFoundError } from '../errors/AppError';

const uuidSchema = z.string().uuid();

// GET /users/:id — the FIRST target-id, cross-principal route (G-D). This is where the REAL cross-user
// 4xx / privacy-SHAPE authz test finally becomes writable (SYS-07 was PROVISIONAL until this landed,
// 0052 §4).
//
// NON-DISCLOSURE COLLAPSE (api-contract line 62): a blocked (EITHER direction) / suspended / deleted /
// unknown / malformed-id target ALL resolve to the SAME generic NotFoundError an unknown id returns —
// never revealing which state, nor who blocked whom (MOD-09 / SOC-09 / AUTH-07).
//
// SHAPE (PROF-03): friend (or self) → the full shape; everyone else → the limited shape.
// ASSUMPTION(OQ-117): the 'friends' vs 'public' privacy nuance — whether a `public` profile exposes
// MORE than the limited shape to a non-friend — is not enumerated in the contract's two shapes and is
// deferred; M2 gates on friendship (the conservative reading) and stores/returns `privacy` on the
// friend shape. Reversible, non-STOP.
export async function getUserProfile(
  actorId: string,
  rawTargetId: string,
): Promise<PublicProfile | FriendProfile> {
  const parsed = uuidSchema.safeParse(rawTargetId);
  if (!parsed.success) throw new NotFoundError('User not found.'); // malformed id → same as unknown
  const targetId = parsed.data;

  const target = await profileRepo.getOwnProfile(targetId); // scope-to-owner read of the target row
  if (!target || target.deletedAt) throw new NotFoundError('User not found.'); // unknown / AUTH-07
  if (await relationshipRepo.isBlockedBetween(actorId, targetId)) {
    throw new NotFoundError('User not found.'); // SOC-09 (either direction)
  }
  if (await suspensionRepo.getActiveSuspension(targetId)) {
    throw new NotFoundError('User not found.'); // MOD-09
  }

  const isSelf = actorId === targetId;
  const relationship = isSelf
    ? 'friend'
    : await relationshipRepo.getRelationship(actorId, targetId);
  const mutualFriendsCount = isSelf
    ? 0
    : await relationshipRepo.countMutualFriends(actorId, targetId);

  if (relationship === 'friend') {
    const [gamertags, friendsCount] = await Promise.all([
      profileService.listGamertags(targetId),
      relationshipRepo.countFriends(targetId),
    ]);
    return toFriendShape(target, { relationship, mutualFriendsCount, friendsCount, gamertags });
  }
  return toPublicShape(target, { relationship, mutualFriendsCount });
}
