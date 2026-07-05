import { z } from 'zod';

// CARD-15 composition — vector elements (CARD-02) + closed attributes, flattened to a static image by
// skia (the M4 render module, apps/mobile/src/render). F21: the composition carries a schemaVersion
// from the first persisted draft + a version-aware hash; asset/effect IDs are append-only. At M4 the
// vector ELEMENT schema is formalized here (rect/ellipse/poly/text); the CLOSED attributes (frame /
// effect+intensity / finish / nameplate / title) reference cosmetic ids (COSM-01) and are formalized
// with the Styler + the COSM roster (0063) — so the envelope stays `.passthrough()` until then.

export const COMPOSITION_SCHEMA_VERSION = 1 as const;
export const MAX_ELEMENTS = 30; // CARD-15 element cap — server-configurable, starts at 30 (OQ-008)

// A placeable vector element (CARD-02). Coordinates are normalized 0..1 of the card face, so one
// composition renders at any size (the PROOF size-ladder). `fill` is a colour for the free baseline;
// premium fills/assets reference cosmetic ids in a later schemaVersion.
const box = { x: z.number(), y: z.number(), w: z.number(), h: z.number(), rotation: z.number().optional(), fill: z.string() };
export const cardElementSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('rect'), ...box }),
  z.object({ type: z.literal('ellipse'), ...box }),
  z.object({ type: z.literal('poly'), shape: z.enum(['star', 'diamond', 'triangle']), ...box }),
  z.object({ type: z.literal('text'), x: z.number(), y: z.number(), rotation: z.number().optional(), fill: z.string(), text: z.string(), size: z.number() }),
]);
export type CardElement = z.infer<typeof cardElementSchema>;

export const compositionSchema = z
  .object({
    // flatten dispatches on this + REJECTS unknown versions (decision 0051/F21).
    schemaVersion: z.literal(COMPOSITION_SCHEMA_VERSION),
    // The drawable vector layers, capped (CARD-15). Closed attributes ride the passthrough envelope.
    elements: z.array(cardElementSchema).max(MAX_ELEMENTS).default([]),
  })
  .passthrough();

export type Composition = z.infer<typeof compositionSchema>;

/** Stable, sorted-key canonical JSON — the input to the version-aware hash. */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

/**
 * A deterministic, dependency-free (RN-safe) version-aware hash. FNV-1a over the canonical form,
 * prefixed with the schemaVersion so CARD-19 dedup can never collide across schema versions. A
 * cryptographic content-hash can replace this later — the contract here is only: deterministic,
 * content-sensitive, and version-aware.
 */
export function compositionHash(composition: Composition): string {
  const canonical = canonicalize(composition);
  const FNV_PRIME = 0x100000001b3n;
  const MASK = 0xffffffffffffffffn;
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < canonical.length; i++) {
    const code = canonical.charCodeAt(i);
    h = ((h ^ BigInt(code & 0xff)) * FNV_PRIME) & MASK;
    const hi = code >> 8;
    if (hi) h = ((h ^ BigInt(hi)) * FNV_PRIME) & MASK;
  }
  return `v${composition.schemaVersion}-${h.toString(16).padStart(16, '0')}`;
}
