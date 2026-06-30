import { describe, it, expect } from 'vitest';
import {
  compositionSchema,
  compositionHash,
  COMPOSITION_SCHEMA_VERSION,
} from './composition';

// F21 — the version-aware hash. The contract: deterministic, content-sensitive, version-aware.
describe('CARD-15/F21: composition schemaVersion + version-aware hash', () => {
  it('defaults elements and requires the known schemaVersion', () => {
    const parsed = compositionSchema.parse({ schemaVersion: COMPOSITION_SCHEMA_VERSION });
    expect(parsed.elements).toEqual([]);
  });

  it('rejects an unknown schemaVersion (flatten dispatches on it)', () => {
    const result = compositionSchema.safeParse({ schemaVersion: 999, elements: [] });
    expect(result.success).toBe(false);
  });

  it('is deterministic for equal compositions', () => {
    const a = compositionSchema.parse({ schemaVersion: 1, elements: [{ k: 'circle' }] });
    const b = compositionSchema.parse({ schemaVersion: 1, elements: [{ k: 'circle' }] });
    expect(compositionHash(a)).toBe(compositionHash(b));
  });

  it('changes when content changes', () => {
    const a = compositionSchema.parse({ schemaVersion: 1, elements: [{ k: 'circle' }] });
    const b = compositionSchema.parse({ schemaVersion: 1, elements: [{ k: 'square' }] });
    expect(compositionHash(a)).not.toBe(compositionHash(b));
  });

  it('is version-aware (the prefix encodes schemaVersion)', () => {
    const a = compositionSchema.parse({ schemaVersion: 1, elements: [] });
    expect(compositionHash(a).startsWith('v1-')).toBe(true);
  });
});
