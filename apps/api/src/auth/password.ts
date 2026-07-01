import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';

// AUTH-01 — password hashing behind ONE interface so the algorithm is swappable (the same
// isolate-the-impl discipline as AppleTokenVerifier). The default is argon2id (@node-rs/argon2 —
// prebuilt native, no node-gyp). The plaintext password is NEVER logged, stored, or trimmed.

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(storedHash: string, plain: string): Promise<boolean>;
}

export const argon2Hasher: PasswordHasher = {
  hash(plain) {
    return argonHash(plain);
  },
  async verify(storedHash, plain) {
    try {
      return await argonVerify(storedHash, plain);
    } catch {
      // A malformed/absent hash (e.g. an Apple-only account with no password) → verification fails,
      // never throws — the caller surfaces the neutral AUTH_FAILED (AUTH-11).
      return false;
    }
  },
};
