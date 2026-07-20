import type {
  PasswordResetRequest,
  PasswordResetVerify,
  PasswordResetVerifyResult,
  PasswordResetConfirm,
  OkResult,
  AuthSession,
  AppleRequest,
} from '@ingame/shared';
import { passwordResetVerifyResultSchema } from '@ingame/shared';
import { api } from './api';

// AUTH-04 (auth-epic P-C) + AUTH-03 (P-E) — the auth-epic client endpoints. INJECTED into the base
// `api` slice from its own file (the friendApi / communityApi / settingsApi precedent) so api.ts is
// touched zero times (the concurrent auth-server track owns it). All of these are PRE-AUTH (no
// Authorization header — the baseQuery skips its reauth branch for `/auth/*`, and there is no session
// yet), matching login/register. The 6-digit-code flow exchanges the emailed code for the short-lived
// reset PROOF:
//
//   request → always neutral 200 { ok } (never reveals whether the email exists — AUTH-11)
//   verify  → { resetToken } on a match; every miss (unknown email · wrong · expired · attempts
//             exhausted) is the SAME neutral 422 VALIDATION_ERROR reason:"invalid_code"
//   confirm → { ok } on success; an invalid/expired/consumed proof is 422 reason:"invalid_token"
//
// None of these mutate cached client data (the user is signed OUT through the whole flow; confirm
// revokes every server session), so no invalidatesTags — nothing in the RTK cache to move.
const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    // POST /auth/password-reset/request { email } — S1 SEND CODE + S2 RESEND. Neutral 200 always.
    requestPasswordReset: build.mutation<OkResult, PasswordResetRequest>({
      query: (body) => ({ url: '/auth/password-reset/request', method: 'POST', body }),
    }),
    // POST /auth/password-reset/verify { email, code } — S2. A match returns the reset proof, which the
    // screen holds in COMPONENT STATE ONLY (never redux, never storage). Parsed at the seam (the
    // resetToken is load-bearing — the executable-contract convention).
    verifyResetCode: build.mutation<PasswordResetVerifyResult, PasswordResetVerify>({
      query: (body) => ({ url: '/auth/password-reset/verify', method: 'POST', body }),
      transformResponse: (raw): PasswordResetVerifyResult => passwordResetVerifyResultSchema.parse(raw),
    }),
    // POST /auth/password-reset/confirm { token, password } — S3. `token` is the verify-step proof
    // (NOT the code); the server re-checks length + HIBP and revokes every session on success.
    confirmPasswordReset: build.mutation<OkResult, PasswordResetConfirm>({
      query: (body) => ({ url: '/auth/password-reset/confirm', method: 'POST', body }),
    }),
    // AUTH-03/09 (P-E) — POST /auth/apple { identityToken, nonce }. `nonce` is the RAW client nonce
    // (the server SHA-256-hexes it and binds it against the token's `nonce` claim — apple-verifier.ts);
    // the HASHED nonce rides only the native signInAsync request. Returns the same AuthSession shape as
    // login/register (first sign-in → user.usernamePending true, completed via PATCH /me { username }).
    // Mirrors login's cache posture exactly — a fresh session invalidates the same signed-in reads.
    appleSignIn: build.mutation<AuthSession, AppleRequest>({
      query: (body) => ({ url: '/auth/apple', method: 'POST', body }),
      invalidatesTags: ['Me', 'Collection', 'Catalog'],
    }),
  }),
});

export const {
  useRequestPasswordResetMutation,
  useVerifyResetCodeMutation,
  useConfirmPasswordResetMutation,
  useAppleSignInMutation,
} = authApi;

export { authApi };
