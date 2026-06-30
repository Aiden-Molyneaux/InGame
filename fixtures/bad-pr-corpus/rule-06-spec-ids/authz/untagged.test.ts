// DELIBERATELY BAD (rule-06-spec-ids). A risk-domain test (under an `authz/` dir) with NO stable
// spec-ID tag — grep-traceability (spec ↔ test ↔ code) silently breaks. CONVENTIONS rule 6 flags it.
import { describe, it, expect } from 'vitest';

describe('it checks the thing works', () => {
  it('does a thing', () => {
    expect(1 + 1).toBe(2);
  });
});
