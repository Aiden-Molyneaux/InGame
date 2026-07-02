import { describe, it, expect } from 'vitest';
import { passwordSchema, registerRequestSchema } from './auth';

// CONVENTIONS rule 3 — the server-side parse is the security boundary. AUTH-01 credential policy
// (OQ-124): password 8–128, argon2, never composition-gated, never trimmed. 128 is a passphrase-
// friendly bound on the KDF input (argon2 has no 72-byte bcrypt truncation); breach-check is M5.
describe('AUTH-01: password bound (OQ-124)', () => {
  it('accepts the 8-char minimum and the 128-char maximum', () => {
    expect(passwordSchema.safeParse('x'.repeat(8)).success).toBe(true);
    expect(passwordSchema.safeParse('x'.repeat(128)).success).toBe(true);
  });

  it('rejects a password shorter than 8', () => {
    expect(passwordSchema.safeParse('x'.repeat(7)).success).toBe(false);
  });

  it('rejects a password longer than 128 (KDF-input bound)', () => {
    expect(passwordSchema.safeParse('x'.repeat(129)).success).toBe(false);
  });

  it('never trims the password (a secret is preserved verbatim)', () => {
    expect(passwordSchema.parse('  spaced pass  ')).toBe('  spaced pass  ');
  });
});

// AUTH-10 (OQ-119) — registration REQUIRES explicit terms acceptance; the client must send `true`.
describe('AUTH-10: register requires acceptedTerms (OQ-119)', () => {
  it('rejects a register body without acceptedTerms: true', () => {
    const base = { email: 'a@b.com', username: 'Aiden_M', password: 'x'.repeat(8) };
    expect(registerRequestSchema.safeParse({ ...base, acceptedTerms: false }).success).toBe(false);
    expect(registerRequestSchema.safeParse(base).success).toBe(false); // omitted
    expect(registerRequestSchema.safeParse({ ...base, acceptedTerms: true }).success).toBe(true);
  });
});
