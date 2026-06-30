import { mutation } from '../db/mutation';
import * as profileRepo from '../repositories/profile-repo';
import { NotFoundError } from '../errors/AppError';
import type { UserRow } from '../db/schema';

// Profile service. Reads delegate to the scoped repo; the bio update is the F29 golden-path mutation.

export async function getOwnProfile(actorId: string): Promise<UserRow | null> {
  return profileRepo.getOwnProfile(actorId);
}

/**
 * @mutation — the F29 golden-path mutation (PATCH /me bio). Ownership is enforced by the SYS-01
 * scoped helper inside the repo; the domain event is emitted in the SAME transaction via the seam.
 * The `@mutation` wrapper is the single seam the authz / emit / (future) audit checks all key off.
 */
export const updateBio = mutation(
  { name: 'profile.updateBio', specIds: ['SYS-01', 'SYS-02', 'PROF-01'] },
  async (ctx, actorId, input: { bio: string }): Promise<UserRow> => {
    const profile = await profileRepo.updateOwnBio(actorId, input.bio, ctx.tx);
    if (!profile) {
      throw new NotFoundError('Profile not found.');
    }
    await ctx.emit({
      eventType: 'profile.bio_updated',
      entityRef: { type: 'user', id: actorId },
      // Payload minimization (F18): the changed field-set + ids, never the whole row.
      payload: { fields: ['bio'] },
    });
    return profile;
  },
);
