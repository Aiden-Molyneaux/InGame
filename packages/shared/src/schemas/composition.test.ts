import { describe, it, expect } from 'vitest';
import {
  compositionSchema,
  cardElementSchema,
  compositionHash,
  COMPOSITION_SCHEMA_VERSION,
  MAX_ELEMENTS,
} from './composition';

const rect = (fill: string) => ({ type: 'rect' as const, x: 0.5, y: 0.5, w: 0.2, h: 0.2, fill });

describe('CARD-15/F21: composition schema + version-aware hash', () => {
  it('defaults elements and requires the known schemaVersion', () => {
    const parsed = compositionSchema.parse({ schemaVersion: COMPOSITION_SCHEMA_VERSION });
    expect(parsed.elements).toEqual([]);
  });

  it('rejects an unknown schemaVersion (flatten dispatches on it)', () => {
    expect(compositionSchema.safeParse({ schemaVersion: 999, elements: [] }).success).toBe(false);
  });

  it('validates the vector element types (rect/ellipse/poly/text) and rejects malformed ones', () => {
    expect(cardElementSchema.safeParse(rect('#fff')).success).toBe(true);
    expect(cardElementSchema.safeParse({ type: 'poly', shape: 'star', x: 0.5, y: 0.5, w: 0.5, h: 0.5, fill: '#e8c14a' }).success).toBe(true);
    expect(cardElementSchema.safeParse({ type: 'text', x: 0.5, y: 0.5, text: 'HI', size: 0.08, fill: '#fff' }).success).toBe(true);
    expect(cardElementSchema.safeParse({ type: 'blob', x: 0, y: 0 }).success).toBe(false); // unknown type
    expect(cardElementSchema.safeParse({ type: 'rect', x: 0.5, y: 0.5, w: 0.2, h: 0.2 }).success).toBe(false); // missing fill
  });

  it('enforces the cap-30 element ceiling (CARD-15)', () => {
    const at = { schemaVersion: 1, elements: Array.from({ length: MAX_ELEMENTS }, () => rect('#fff')) };
    const over = { schemaVersion: 1, elements: Array.from({ length: MAX_ELEMENTS + 1 }, () => rect('#fff')) };
    expect(compositionSchema.safeParse(at).success).toBe(true);
    expect(compositionSchema.safeParse(over).success).toBe(false);
  });

  it('is a deterministic, content-sensitive, version-aware hash', () => {
    const a = compositionSchema.parse({ schemaVersion: 1, elements: [rect('#111')] });
    const b = compositionSchema.parse({ schemaVersion: 1, elements: [rect('#111')] });
    const c = compositionSchema.parse({ schemaVersion: 1, elements: [rect('#222')] });
    expect(compositionHash(a)).toBe(compositionHash(b));
    expect(compositionHash(a)).not.toBe(compositionHash(c));
    expect(compositionHash(a).startsWith('v1-')).toBe(true);
  });
});
