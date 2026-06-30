// DELIBERATELY BAD (rule-06-spec-ids). A risk-domain test tagged with a well-formed but UNREGISTERED
// spec id (SYS-999 does not exist in the specs) — a typo'd id makes grep-traceability lie.
// CONVENTIONS rule 6 validates tags against the generated id-registry and flags this.
import { describe, it, expect } from 'vitest';

describe('SYS-999: a stable id that does not exist in any spec', () => {
  it('pretends to cover authorization', () => {
    expect(true).toBe(true);
  });
});
