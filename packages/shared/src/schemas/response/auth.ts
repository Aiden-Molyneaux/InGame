import { z } from 'zod';
import { selfProfileSchema } from './profile';

// RESPONSE/VIEW schemas for the AUTH-* endpoints (api-contract "Auth"). The `user` returned by
// register/login/apple is the caller's OWN self-shape (SelfProfile — the only shape exposing role +
// adminTier + usernamePending). Access token = short-lived JWT; refresh token = opaque, server-stored,
// rotating (AUTH-02).

/** register / login / apple → `{ user, accessToken, refreshToken }`. */
export const authSessionSchema = z
  .object({
    user: selfProfileSchema,
    accessToken: z.string(),
    refreshToken: z.string(),
  })
  .strict();
export type AuthSession = z.infer<typeof authSessionSchema>;

/** POST /auth/refresh → `{ accessToken, refreshToken }` (rotation — a NEW pair). */
export const refreshResultSchema = z
  .object({
    accessToken: z.string(),
    refreshToken: z.string(),
  })
  .strict();
export type RefreshResult = z.infer<typeof refreshResultSchema>;

/** The generic acknowledgement (logout, reset-request/confirm, verify) → `{ ok: true }`. */
export const okResultSchema = z.object({ ok: z.literal(true) }).strict();
export type OkResult = z.infer<typeof okResultSchema>;

/** GET /auth/username-available → `{ available, reason? }` (advisory; AUTH-11). */
export const usernameAvailabilitySchema = z
  .object({
    available: z.boolean(),
    reason: z.enum(['taken', 'screened', 'invalid']).optional(),
  })
  .strict();
export type UsernameAvailability = z.infer<typeof usernameAvailabilitySchema>;
