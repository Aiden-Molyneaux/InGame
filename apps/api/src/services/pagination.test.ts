import { describe, it, expect } from 'vitest';
import { decodeOffsetCursor } from './pagination';

// MAJOR-1 — the offset-cursor decode is the ONE gate between an opaque `?cursor=` and a SQL OFFSET
// bind. The old `Number()` + `Number.isInteger` guard waved through numeric-overflow tokens (`1e21`,
// `10000000000000000000`) that then 500'd on the pg bigint bind. This locks the accept/reject table:
// 1–9 digits only → the parsed int; everything else → 0 (silent page 1, the house grammar — never an
// error). Tags: SYS-01, CAT-07.

describe('decodeOffsetCursor — accept/reject table', () => {
  it('accepts 1–9 ASCII digits and returns the parsed non-negative int', () => {
    expect(decodeOffsetCursor('0')).toBe(0);
    expect(decodeOffsetCursor('1')).toBe(1);
    expect(decodeOffsetCursor('24')).toBe(24);
    expect(decodeOffsetCursor('007')).toBe(7); // leading zeros are fine
    expect(decodeOffsetCursor('999999999')).toBe(999_999_999); // the 9-digit ceiling
  });

  it('rejects (→ 0) anything outside the narrow digit shape', () => {
    // absent / empty
    expect(decodeOffsetCursor(undefined)).toBe(0);
    expect(decodeOffsetCursor('')).toBe(0);
    // the numeric-overflow hole the old guard let through → now 0, never a colossal offset
    expect(decodeOffsetCursor('1e21')).toBe(0);
    expect(decodeOffsetCursor('10000000000000000000')).toBe(0); // 20 digits, > 9-digit cap
    expect(decodeOffsetCursor('1000000000')).toBe(0); // exactly 10 digits — one past the cap
    // non-numeric / malformed
    expect(decodeOffsetCursor('abc')).toBe(0);
    expect(decodeOffsetCursor('-5')).toBe(0);
    expect(decodeOffsetCursor('+5')).toBe(0);
    expect(decodeOffsetCursor('1.5')).toBe(0);
    expect(decodeOffsetCursor('0x10')).toBe(0);
    expect(decodeOffsetCursor(' 5 ')).toBe(0);
    expect(decodeOffsetCursor('5abc')).toBe(0);
  });

  it('never returns a value that could overflow a bigint bind (bounded at 999_999_999)', () => {
    for (const raw of ['1e21', '10000000000000000000', '99999999999999999999']) {
      const offset = decodeOffsetCursor(raw);
      expect(offset).toBe(0);
      expect(Number.isSafeInteger(offset)).toBe(true);
    }
    expect(decodeOffsetCursor('999999999')).toBeLessThanOrEqual(999_999_999);
  });
});
