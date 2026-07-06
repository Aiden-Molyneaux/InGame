import { z } from 'zod';

// CARD-15 composition — vector elements (CARD-02) + closed attributes, flattened to a static image by
// skia (the M4 render module, apps/mobile/src/render). F21: the composition carries a schemaVersion
// from the first persisted draft + a version-aware hash; asset/effect IDs are append-only. At M4 the
// vector ELEMENT schema is formalized here (rect/ellipse/poly/text/icon); the CLOSED attributes (frame /
// effect+intensity / finish / nameplate / title) reference cosmetic ids (COSM-01) and are formalized
// with the Styler + the COSM roster (0063) — so the envelope stays `.passthrough()` until then.
//
// M4 §3.4 Canvas additions (canvas-manifest F21 note): the `icon` element (the 0063 §1 Essentials
// icons), pentagon/hexagon/octagon poly shapes, and the CARD-10 per-element creative fields — all
// ADDITIVE at schemaVersion 1. Client+server ship together in this monorepo; an older parser
// safeParse-fails a newer document → the default face (graceful, CardFace.parseComposition); the
// version-aware hash is content-sensitive over new fields automatically.

export const COMPOSITION_SCHEMA_VERSION = 1 as const;
export const MAX_ELEMENTS = 30; // CARD-15 element cap — server-configurable, starts at 30 (OQ-008)

// CARD-10 per-element creative fields (all optional — absent = the plain solid-fill element) +
// the CARD-08 layers-panel metadata (name/lock/hide persist with the layer).
const creative = {
  opacity: z.number().min(0).max(1).optional(),
  fill2: z.string().optional(), // second gradient stop — present = GRADIENT fill (CARD-10)
  stroke: z.object({ color: z.string(), width: z.number() }).optional(), // width normalized 0..1 of card W
  glow: z.boolean().optional(), // soft outer glow (CARD-10 shadow&glow — the free half)
  blend: z.enum(['screen', 'multiply']).optional(), // absent = normal (CARD-10 blend modes)
  flipH: z.boolean().optional(),
  flipV: z.boolean().optional(),
  name: z.string().max(24).optional(), // CARD-08 rename — the slip label
  locked: z.boolean().optional(), // CARD-08 lock — refuses bed edits
  hidden: z.boolean().optional(), // CARD-08 hide — not rendered (rack keeps the slip)
};

// A placeable vector element (CARD-02). Coordinates are normalized 0..1 of the card face, so one
// composition renders at any size (the PROOF size-ladder). `fill` is a colour for the free baseline;
// premium fills/assets reference cosmetic ids in a later schemaVersion.
const box = { x: z.number(), y: z.number(), w: z.number(), h: z.number(), rotation: z.number().optional(), fill: z.string(), ...creative };
export const cardElementSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('rect'), radius: z.number().min(0).max(1).optional(), ...box }), // radius 0..1 of the smaller side (rounded-rect, CARD-10)
  z.object({ type: z.literal('ellipse'), ...box }),
  z.object({ type: z.literal('poly'), shape: z.enum(['star', 'diamond', 'triangle', 'pentagon', 'hexagon', 'octagon']), ...box }),
  // The 0063 §1 Essentials icons — `iconId` resolves in the client render-module registry; an
  // unknown id renders nothing (degrade, never a crash).
  z.object({ type: z.literal('icon'), iconId: z.string().max(32), ...box }),
  z.object({
    type: z.literal('text'),
    x: z.number(),
    y: z.number(),
    rotation: z.number().optional(),
    fill: z.string(),
    text: z.string().max(64), // MOD-07: unscreened at M4 (decision 0062 §6 — closed beta)
    size: z.number(),
    fontId: z.string().max(32).optional(), // 0063 §4 title fonts double as the placeable-glyph fonts
    arc: z.number().min(-180).max(180).optional(), // CARD-11 curved/arc text (degrees; absent = straight)
    opacity: z.number().min(0).max(1).optional(),
    blend: z.enum(['screen', 'multiply']).optional(),
    glow: z.boolean().optional(),
    name: z.string().max(24).optional(),
    locked: z.boolean().optional(),
    hidden: z.boolean().optional(),
  }),
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
