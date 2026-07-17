import { z } from 'zod';

// REQUEST/INPUT schemas for social actions (SOC-09). The actor is the authenticated principal ONLY —
// `.strict()` refuses any smuggled actor id. `userId` here is the TARGET of the action (who to block),
// which is legitimately body-supplied (it is not the actor).

/** POST /me/blocks body: { userId } — the target to block (SOC-09). */
export const blockUserRequestSchema = z
  .object({
    userId: z.string().uuid(),
  })
  .strict();

export type BlockUserRequest = z.infer<typeof blockUserRequestSchema>;

/**
 * POST /friends/requests body: { toUserId } — the TARGET of a friend request (SOC-08). The actor is the
 * authenticated principal ONLY (`.strict()` refuses a smuggled actor id); `toUserId` is legitimately
 * body-supplied (it is not the actor). Self-target (toUserId === actor) is refused server-side (SELF_TARGET).
 */
export const createFriendRequestSchema = z
  .object({
    toUserId: z.string().uuid(),
  })
  .strict();

export type CreateFriendRequest = z.infer<typeof createFriendRequestSchema>;
