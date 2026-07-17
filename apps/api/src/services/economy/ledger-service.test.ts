import { describe, it, expect } from 'vitest';
import { credit, debit } from './ledger-service';
import type { Executor } from '../../db/client';

// M5 F-3 (§4 economy-audit LOW) — the ECON-07 positive-amount floor on the credit/debit primitives.
// No DB CHECK constraint exists on `currency_ledger.delta`, so corrupted upstream content (e.g. a bad
// `store_products.pixels` of 0/negative) must be refused HERE, before anything locks or writes. The
// poisoned executor proves the refusal happens before any DB touch (nothing locked, nothing written).
// The signed-delta operator path (`adjustPixels`, ECON-11) deliberately bypasses these primitives.

const POISONED = new Proxy(
  {},
  {
    get() {
      throw new Error('DB touched — the positive-amount assert must fire BEFORE any query');
    },
  },
) as Executor;

describe('ECON-07 (F-3): credit/debit refuse non-positive amounts before any DB touch', () => {
  it('credit with 0 / negative / fractional throws SYNCHRONOUSLY; the executor is never touched', () => {
    for (const amount of [0, -5, 2.5]) {
      expect(() => credit(POISONED, 'user-1', { amount, reason: 'pack_purchase' })).toThrow(
        /positive integer/,
      );
    }
  });

  it('debit with 0 / negative / fractional throws SYNCHRONOUSLY; the executor is never touched', () => {
    for (const amount of [0, -3, 0.1]) {
      expect(() => debit(POISONED, 'user-1', { amount, reason: 'acquire' })).toThrow(
        /positive integer/,
      );
    }
  });
});
