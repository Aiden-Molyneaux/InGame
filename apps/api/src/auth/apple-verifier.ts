import { createHash } from 'node:crypto';
import {
  createRemoteJWKSet,
  jwtVerify,
  errors as joseErrors,
  type JWTVerifyGetKey,
} from 'jose';
import { AuthFailedError, ServerError } from '../errors/AppError';
import { loadEnv } from '../config/env';

// AUTH-03/09 Sign-in-with-Apple, isolated behind ONE interface. M2 shipped the STUB verifier + ALL
// downstream machinery (usernamePending, link-by-verified-email, the auth_identities write); the
// auth-epic P-D swap-in below is the REAL verifier the M2 comment promised — remote JWKS + iss/aud/
// exp + raw-nonce→SHA-256 binding — selected by `APPLE_VERIFIER` (the IAP_PROVIDER/EMAIL_PROVIDER
// fail-closed pattern; the stub accepts forgeable `mock.*` tokens, so production refuses it: running
// it there is total account takeover). The client native SIWA button stays a P-E concern (outside
// Expo Go; E2E rides the first EAS build, P16).

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

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';

/** true for the boolean OR the string form — Apple sends `email_verified`/`is_private_email` both ways. */
function claimBool(v: unknown): boolean {
  return v === true || v === 'true';
}

/**
 * The REAL verifier (auth-epic P-D). Verification chain, all failures neutral:
 *   1. Signature against Apple's remote JWKS (jose caches keys + handles rollover/cooldown
 *      internally; the singleton below makes the key set process-cached).
 *   2. `iss` = appleid.apple.com · `aud` = the app bundle id (APPLE_BUNDLE_ID) · `exp` — enforced by
 *      jose; `algorithms: ['RS256']` pins the alg (no HS256 confusion).
 *   3. NONCE BINDING: the client sends the RAW nonce (contract shape unchanged); Apple's token
 *      carries the SHA-256 hex the client set on the native request → assert
 *      `payload.nonce === sha256hex(nonce)`.
 * Error posture: any token/claim/nonce failure → neutral AuthFailedError (401). A JWKS FETCH /
 * infrastructure failure → ServerError (500) — infrastructure down is not "bad credentials" (the
 * tokens.ts misconfiguration precedent).
 * TESTABILITY SEAM: the constructor takes an optional jose key-resolver; default = the remote JWKS.
 * Integration tests inject a local fixture JWKS (jose generateKeyPair) and sign real RS256 tokens —
 * no network in CI.
 */
export class RealAppleVerifier implements AppleTokenVerifier {
  private readonly getKey: JWTVerifyGetKey;

  constructor(opts: { keyResolver?: JWTVerifyGetKey } = {}) {
    this.getKey = opts.keyResolver ?? createRemoteJWKSet(new URL(APPLE_JWKS_URL));
  }

  async verify(identityToken: string, nonce: string): Promise<AppleIdentity> {
    let payload: Record<string, unknown>;
    try {
      ({ payload } = await jwtVerify(identityToken, this.getKey, {
        issuer: APPLE_ISSUER,
        audience: loadEnv().appleBundleId,
        algorithms: ['RS256'],
      }));
    } catch (err) {
      if (err instanceof joseErrors.JOSEError) {
        // JWKS-infrastructure failures (timeout / malformed key-set response) are 500s; every OTHER
        // jose failure (bad signature, wrong iss/aud, expired, no matching key, malformed token,
        // disallowed alg) is a neutral 401.
        if (err.code === 'ERR_JWKS_TIMEOUT' || err.code === 'ERR_JWKS_INVALID') {
          throw new ServerError('Apple JWKS unavailable.');
        }
        throw new AuthFailedError();
      }
      // A non-jose throw out of the key resolver (fetch/network error) — infrastructure, not credentials.
      throw new ServerError('Apple JWKS unavailable.');
    }

    const expectedNonce = createHash('sha256').update(nonce).digest('hex');
    if (typeof payload.nonce !== 'string' || payload.nonce !== expectedNonce) {
      throw new AuthFailedError();
    }
    if (typeof payload.sub !== 'string' || !payload.sub) throw new AuthFailedError();

    return {
      subject: payload.sub,
      email: typeof payload.email === 'string' && payload.email ? payload.email : null,
      emailVerified: claimBool(payload.email_verified),
    };
  }
}

// ── provider selection (the IAP_PROVIDER/EMAIL_PROVIDER singleton pattern) ──────────────────────

let verifier: AppleTokenVerifier | null = null;

export function getAppleVerifier(): AppleTokenVerifier {
  if (!verifier) {
    const env = loadEnv();
    if (env.appleVerifier === 'stub') {
      if (env.nodeEnv === 'production') {
        // Unreachable via loadEnv (which already throws) — kept fail-closed at the build site too.
        throw new Error(
          "APPLE_VERIFIER='stub' is refused in production — the stub accepts forgeable mock.* tokens " +
            '(total account takeover). Set APPLE_VERIFIER to a real verifier.',
        );
      }
      verifier = stubAppleVerifier;
    } else if (env.appleVerifier === 'apple') {
      verifier = new RealAppleVerifier();
    } else {
      throw new Error(
        `APPLE_VERIFIER='${env.appleVerifier}' is not a known verifier — 'stub' (dev/test) or 'apple'.`,
      );
    }
  }
  return verifier;
}

/** Test/seam hook — inject an alternate verifier (e.g. the real one with a fixture JWKS). */
export function setAppleVerifier(next: AppleTokenVerifier): void {
  verifier = next;
}

/** Test hook — drop the singleton so the next `getAppleVerifier()` rebuilds from env. */
export function resetAppleVerifier(): void {
  verifier = null;
}

/** DEV/TEST ONLY — mint a mock Apple identity token the stub verifier accepts. */
export function makeMockAppleToken(identity: {
  sub: string;
  email?: string | null;
  emailVerified?: boolean;
}): string {
  const payload = Buffer.from(JSON.stringify(identity)).toString('base64url');
  return `mock.${payload}`;
}
