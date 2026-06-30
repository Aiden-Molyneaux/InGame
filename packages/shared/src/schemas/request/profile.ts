import { z } from 'zod';
import { boundedText } from '../sanitize';
import { privacySchema } from '../common';

// REQUEST/INPUT schemas — the rule-3 field-for-field half of the contract. These transcribe the
// api-contract PATCH /me body, never a paraphrase. The server-side parse of these IS the security
// boundary (decision 0051/F23; CONVENTIONS rule 3). Split from response/view schemas (owned by the
// F06 privacy serializer).

// SYS-02 input-validation policy (decision 0043): username 3–20, charset [a-z0-9_]; bio ≤140.
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const BIO_MAX = 140;
export const USERNAME_RE = /^[a-z0-9_]+$/;

export const usernameSchema = boundedText(USERNAME_MAX).pipe(
  z.string().min(USERNAME_MIN).regex(USERNAME_RE, 'username may only contain a–z, 0–9, and _'),
);

/** bio: one editable profile field, bound to ≤140 chars, trimmed + sanitized (SYS-02). */
export const bioSchema = boundedText(BIO_MAX);

/**
 * PATCH /me request body (api-contract PROF section):
 *   { username?, bio?, favouriteGenreIds?, favouriteGameId?, privacy? }
 * `.strict()` rejects unknown keys — the server never trusts an id in the body to identify the actor
 * (SYS-01); the actor is resolved from the authenticated principal only.
 */
export const patchMeRequestSchema = z
  .object({
    username: usernameSchema.optional(),
    bio: bioSchema.optional(),
    favouriteGenreIds: z.array(z.string().uuid()).optional(),
    favouriteGameId: z.string().uuid().nullable().optional(),
    privacy: privacySchema.optional(),
  })
  .strict();

export type PatchMeRequest = z.infer<typeof patchMeRequestSchema>;

/** The ordered field set of the PATCH /me body — consumed by the api-contract fidelity snapshot. */
export const PATCH_ME_FIELDS = Object.keys(patchMeRequestSchema.shape) as Array<
  keyof PatchMeRequest
>;
