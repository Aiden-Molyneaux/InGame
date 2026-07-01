import { z } from 'zod';
import { boundedText } from '../sanitize';
import { platformSchema } from '../common';

// REQUEST/INPUT schemas for the gamertag CRUD endpoints (PROF-02; api-contract /me/gamertags). A
// handle is user-visible content → sanitized + length-bounded (SYS-02) and screened (MOD-07) at the
// service layer. `platform` is the controlled list (common.platformSchema).

export const GAMERTAG_HANDLE_MAX = 64;

export const gamertagHandleSchema = boundedText(GAMERTAG_HANDLE_MAX).pipe(z.string().min(1));

/** POST /me/gamertags — `{ platform, handle }`. */
export const createGamertagRequestSchema = z
  .object({
    platform: platformSchema,
    handle: gamertagHandleSchema,
  })
  .strict();
export type CreateGamertagRequest = z.infer<typeof createGamertagRequestSchema>;

/** PATCH /me/gamertags/:id — `{ platform?, handle? }` (at least one is required at the handler). */
export const updateGamertagRequestSchema = z
  .object({
    platform: platformSchema.optional(),
    handle: gamertagHandleSchema.optional(),
  })
  .strict();
export type UpdateGamertagRequest = z.infer<typeof updateGamertagRequestSchema>;

export const CREATE_GAMERTAG_FIELDS = Object.keys(createGamertagRequestSchema.shape) as Array<
  keyof CreateGamertagRequest
>;
