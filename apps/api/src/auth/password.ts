import { hash as argonHash, verify as argonVerify, type Options } from '@node-rs/argon2';

// AUTH-01 — password hashing behind ONE interface so the algorithm is swappable (the same
// isolate-the-impl discipline as AppleTokenVerifier). The default is argon2id (@node-rs/argon2 —
// prebuilt native, no node-gyp). The plaintext password is NEVER logged, stored, or trimmed.
//
// The argon2id PARAMETERS are pinned EXPLICITLY — variant + memory/time/parallelism + output length —
// rather than inherited from the @node-rs/argon2 defaults, so a future library default change can't
// silently weaken hashing (M2 lead-audit hardening). Values are the OWASP argon2id recommendation:
// m = 19456 KiB (19 MiB), t = 2, p = 1, 32-byte tag. `verify` derives its cost from the parameters
// encoded in the stored hash, so it takes no options. `algorithm: 2` is Argon2id — pinned by numeric
// value because the library's `Algorithm` is an AMBIENT const enum (unusable as a value under
// `isolatedModules`); 2 is its Argon2id member.
const ARGON2ID_OPTIONS: Options = {
  algorithm: 2, // Argon2id
  memoryCost: 19456, // KiB (19 MiB)
  timeCost: 2, // iterations
  parallelism: 1, // lanes
  outputLen: 32, // bytes
};

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(storedHash: string, plain: string): Promise<boolean>;
}

export const argon2Hasher: PasswordHasher = {
  hash(plain) {
    return argonHash(plain, ARGON2ID_OPTIONS);
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
