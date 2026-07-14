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
