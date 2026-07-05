import { z } from 'zod';
import { platformSchema } from '../common';

// RESPONSE/VIEW schema for a gamertag (PROF-02). Emitted by the serializer from an allowlist (never
// the raw row). Friend-visible on GET /users/:id (PROF-05); owner-managed on GET /me/gamertags.

export const gamertagViewSchema = z
  .object({
    id: z.string().uuid(),
    platform: platformSchema,
    handle: z.string(),
  })
  .strict();
export type GamertagView = z.infer<typeof gamertagViewSchema>;

/** GET /me/gamertags — the caller's gamertags. */
export const gamertagListSchema = z.object({ items: z.array(gamertagViewSchema) }).strict();
export type GamertagList = z.infer<typeof gamertagListSchema>;
