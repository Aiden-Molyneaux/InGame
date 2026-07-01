import { AuthFailedError } from '../errors/AppError';

// AUTH-03/09 Sign-in-with-Apple, isolated behind ONE interface so ONLY the impl swaps at enrollment.
//
// DEFERRED to Apple Developer enrollment (M1-P), NOT claimed done in M2:
//   (a) the REAL server verifier — validate the `identityToken` JWT signature against Apple's public
//       JWKS + bind the `nonce`;
//   (b) the client native SIWA button (lives OUTSIDE Expo Go, un-exercisable in the Expo Go loop).
//
// M2 ships the STUB verifier + ALL downstream machinery (usernamePending, link-by-verified-email,
// the auth_identities write) so the swap at enrollment is a single-file change.

export interface AppleIdentity {
  /** The Apple stable subject id (`sub`) — the identity key. */
  subject: string;
  /** The Apple-verified email (may be a private-relay address), or null if not shared. */
  email: string | null;
  emailVerified: boolean;
}

export interface AppleTokenVerifier {
  verify(identityToken: string, nonce: string): Promise<AppleIdentity>;
}

/**
 * The STUB verifier. It decodes a mock token (`mock.<base64url-json>`) so the whole downstream flow is
 * built + tested now; a REAL Apple identity token (a signed JWT) does NOT match this format and is
 * rejected — the real verifier is deferred to enrollment. The `nonce` is accepted here; the real
 * verifier binds it against the token's `nonce` claim.
 */
export const stubAppleVerifier: AppleTokenVerifier = {
  async verify(identityToken, _nonce) {
    const match = /^mock\.([A-Za-z0-9_-]+)$/.exec(identityToken);
    if (!match || !match[1]) throw new AuthFailedError();
    try {
      const decoded = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8')) as {
        sub?: unknown;
        email?: unknown;
        emailVerified?: unknown;
      };
      if (typeof decoded.sub !== 'string' || !decoded.sub) throw new AuthFailedError();
      return {
        subject: decoded.sub,
        email: typeof decoded.email === 'string' ? decoded.email : null,
        emailVerified: decoded.emailVerified !== false,
      };
    } catch (err) {
      if (err instanceof AuthFailedError) throw err;
      throw new AuthFailedError();
    }
  },
};

/** DEV/TEST ONLY — mint a mock Apple identity token the stub verifier accepts. */
export function makeMockAppleToken(identity: {
  sub: string;
  email?: string | null;
  emailVerified?: boolean;
}): string {
  const payload = Buffer.from(JSON.stringify(identity)).toString('base64url');
  return `mock.${payload}`;
}
