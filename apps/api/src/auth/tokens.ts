import { SignJWT, jwtVerify } from 'jose';
import { randomBytes, createHash } from 'node:crypto';
import { loadEnv } from '../config/env';
import { AuthFailedError, ServerError } from '../errors/AppError';

// AUTH-02 token service. Two token kinds, deliberately different:
//   • ACCESS  — a short-lived, STATELESS HS256 JWT (sub = userId). Verified on every request with no
//               DB hit. jose is ESM-native + zero-dep.
//   • REFRESH / RESET / VERIFY — OPAQUE high-entropy random secrets. Only their SHA-256 hash is
//               stored server-side; the plaintext is returned to the client once. A fast hash is
//               correct here (unlike a password, the input is 256-bit random — not brute-forceable),
//               and it means a DB leak never yields a usable token.

const ISSUER = 'ingame';

function secretKey(): Uint8Array {
  const secret = loadEnv().jwtSigningSecret;
  if (secret.length < 16) {
    // A misconfiguration (500), NOT an auth failure — never mask it as a neutral 401.
    throw new ServerError('JWT_SIGNING_SECRET is not configured.');
  }
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(userId: string): Promise<string> {
  const ttl = loadEnv().accessTokenTtlSeconds;
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(secretKey());
}

export interface AccessClaims {
  userId: string;
}

/** Verify an access token. Expired / invalid / malformed → neutral AuthFailedError (401). */
export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const key = secretKey(); // a misconfig ServerError (500) propagates BEFORE the neutral catch
  try {
    const { payload } = await jwtVerify(token, key, { issuer: ISSUER });
    if (!payload.sub) throw new AuthFailedError();
    return { userId: payload.sub };
  } catch {
    throw new AuthFailedError();
  }
}

export interface OpaqueTokenPair {
  /** Returned to the client ONCE. Never stored. */
  token: string;
  /** Stored server-side (the only persisted form). */
  tokenHash: string;
}

export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Mint a fresh opaque token + its stored hash (refresh / password-reset / email-verify). */
export function generateOpaqueToken(bytes = 32): OpaqueTokenPair {
  const token = randomBytes(bytes).toString('base64url');
  return { token, tokenHash: hashOpaqueToken(token) };
}
