import { z } from 'zod';
import { boundedText } from '../sanitize';
import { usernameSchema } from './profile';

// REQUEST/INPUT schemas for the AUTH-* endpoints (api-contract "Auth" section) — the rule-3
// field-for-field half of the contract, transcribed never paraphrased. The SERVER-SIDE parse of
// these IS the security boundary (decision 0051/F23; CONVENTIONS rule 3). Every user-supplied string
// is length-bounded. NOTE: passwords are NEVER sanitized/trimmed (that would silently alter the
// secret) — only presence + length are validated; the argon2 hash is the real gate (AUTH-01).

export const EMAIL_MAX = 254; // RFC 5321 practical maximum
export const PASSWORD_MIN = 8; // AUTH-01 — minimum 8 characters
// AUTH-01 / OQ-124 — passphrase-friendly upper bound on the KDF input (argon2 has no 72-byte bcrypt
// truncation, so 128 > that; still bounds a long-password DoS). No composition rules; breach-check → M5.
export const PASSWORD_MAX = 128;
export const TOKEN_MAX = 4096; // opaque credential / JWT upper bound

/** A valid, bounded, sanitized email. Case-folding to lowercase happens at the service boundary. */
export const emailSchema = boundedText(EMAIL_MAX).pipe(z.string().email());

/** Registration/reset password — enforces the AUTH-01 strength floor. Not trimmed. */
export const passwordSchema = z.string().min(PASSWORD_MIN).max(PASSWORD_MAX);

/**
 * Login password — presence + bound ONLY (never the strength floor): a too-short/wrong password must
 * surface the SAME neutral AUTH_FAILED as an unknown account, not a 422 that discloses the rule
 * (AUTH-11 anti-enumeration).
 */
export const loginPasswordSchema = z.string().min(1).max(PASSWORD_MAX);

/** An opaque bearer credential (refresh / reset / verify token, or an Apple identity token / nonce). */
export const opaqueTokenSchema = z.string().min(1).max(TOKEN_MAX);

/** POST /auth/register — `{ email, username, password, acceptedTerms }` (AUTH-01/08/10). */
export const registerRequestSchema = z
  .object({
    email: emailSchema,
    username: usernameSchema,
    password: passwordSchema,
    acceptedTerms: z.literal(true), // AUTH-10 — registration REQUIRES acceptance
  })
  .strict();
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

/** POST /auth/login — `{ email, password }` (AUTH-02). */
export const loginRequestSchema = z
  .object({
    email: emailSchema,
    password: loginPasswordSchema,
  })
  .strict();
export type LoginRequest = z.infer<typeof loginRequestSchema>;

/** POST /auth/apple — `{ identityToken, nonce }` (AUTH-03/09). */
export const appleRequestSchema = z
  .object({
    identityToken: opaqueTokenSchema,
    nonce: z.string().min(1).max(512),
  })
  .strict();
export type AppleRequest = z.infer<typeof appleRequestSchema>;

/** POST /auth/refresh — `{ refreshToken }` (AUTH-02, rotation). */
export const refreshRequestSchema = z.object({ refreshToken: opaqueTokenSchema }).strict();
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

/** POST /auth/logout — `{ refreshToken }` (AUTH-05, invalidates the refresh token). */
export const logoutRequestSchema = z.object({ refreshToken: opaqueTokenSchema }).strict();
export type LogoutRequest = z.infer<typeof logoutRequestSchema>;

/** POST /auth/password-reset/request — `{ email }` (AUTH-04; neutral response). */
export const passwordResetRequestSchema = z.object({ email: emailSchema }).strict();
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;

/** POST /auth/password-reset/confirm — `{ token, password }` (AUTH-04; single-use, ~1h). */
export const passwordResetConfirmSchema = z
  .object({
    token: opaqueTokenSchema,
    password: passwordSchema,
  })
  .strict();
export type PasswordResetConfirm = z.infer<typeof passwordResetConfirmSchema>;

/** POST /auth/verify-email/confirm — `{ token }` (AUTH-08, soft). */
export const verifyEmailConfirmSchema = z.object({ token: opaqueTokenSchema }).strict();
export type VerifyEmailConfirm = z.infer<typeof verifyEmailConfirmSchema>;

/**
 * GET /auth/username-available?u= — advisory pre-check (AUTH-11). Lenient bound (NOT the strict
 * username regex) so the handler can classify + report `reason: "invalid"` for a malformed candidate
 * rather than 422-ing it; uniqueness + screening stay authoritative at register / PATCH /me.
 */
export const usernameAvailabilityQuerySchema = z
  .object({ u: z.string().min(1).max(40) })
  .strict();
export type UsernameAvailabilityQuery = z.infer<typeof usernameAvailabilityQuerySchema>;

// Ordered field sets consumed by the api-contract fidelity snapshot (F09; rule-3).
export const REGISTER_FIELDS = Object.keys(registerRequestSchema.shape) as Array<
  keyof RegisterRequest
>;
export const LOGIN_FIELDS = Object.keys(loginRequestSchema.shape) as Array<keyof LoginRequest>;
export const APPLE_FIELDS = Object.keys(appleRequestSchema.shape) as Array<keyof AppleRequest>;
export const REFRESH_FIELDS = Object.keys(refreshRequestSchema.shape) as Array<keyof RefreshRequest>;
export const LOGOUT_FIELDS = Object.keys(logoutRequestSchema.shape) as Array<keyof LogoutRequest>;
export const RESET_REQUEST_FIELDS = Object.keys(passwordResetRequestSchema.shape) as Array<
  keyof PasswordResetRequest
>;
export const RESET_CONFIRM_FIELDS = Object.keys(passwordResetConfirmSchema.shape) as Array<
  keyof PasswordResetConfirm
>;
export const VERIFY_CONFIRM_FIELDS = Object.keys(verifyEmailConfirmSchema.shape) as Array<
  keyof VerifyEmailConfirm
>;
