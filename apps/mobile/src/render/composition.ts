// CARD-15 card composition — vector elements + closed attributes, flattened by skia (M4 §1 render
// spike, GO 2026-07-05). Coordinates are normalized 0..1 of the card face, so ONE composition renders
// at any size (the PROOF size-ladder). This is the render-consumable shape; the full zod formalization
// into packages/shared + the product-spec/api-contract ripple is the next formalization pass.

export const COMPOSITION_SCHEMA_VERSION = 1 as const;
export const MAX_ELEMENTS = 30; // CARD-15 cap — server-configurable, starts at 30 (OQ-008)

export type CardElement =
  | { type: 'rect'; x: number; y: number; w: number; h: number; rotation?: number; fill: string }
  | { type: 'ellipse'; x: number; y: number; w: number; h: number; rotation?: number; fill: string }
  | { type: 'poly'; shape: 'star' | 'diamond' | 'triangle'; x: number; y: number; w: number; h: number; rotation?: number; fill: string }
  | { type: 'text'; x: number; y: number; text: string; size: number; fill: string };

export type CardComposition = {
  schemaVersion: typeof COMPOSITION_SCHEMA_VERSION;
  base: { gradient: [string, string] } | { fill: string };
  elements: CardElement[]; // cap MAX_ELEMENTS
  frame?: { color: string; width: number }; // width normalized 0..1 of card width
  nameplate?: { title: string; plate: string; ink: string; size: number };
  effect?: { kind: 'none' | 'scanline'; intensity: number }; // rendered as a RUNTIME overlay, not baked
};

/** The spike's sample card (the AURORA / CELESTE composition), also used by the render tests. */
export const SAMPLE_COMPOSITION: CardComposition = {
  schemaVersion: COMPOSITION_SCHEMA_VERSION,
  base: { gradient: ['#241a4d', '#0e0b1e'] },
  elements: [
    { type: 'poly', shape: 'star', x: 0.5, y: 0.34, w: 0.52, h: 0.52, fill: '#e8c14a' },
    { type: 'ellipse', x: 0.72, y: 0.2, w: 0.14, h: 0.14, fill: '#f3ecd9' },
    { type: 'rect', x: 0.5, y: 0.62, w: 0.64, h: 0.028, fill: '#e85ad0' },
    { type: 'rect', x: 0.5, y: 0.66, w: 0.44, h: 0.02, fill: '#c9a227' },
    { type: 'poly', shape: 'diamond', x: 0.24, y: 0.24, w: 0.1, h: 0.1, rotation: 20, fill: '#7ad0e8' },
    { type: 'text', x: 0.5, y: 0.55, text: 'CELESTE', size: 0.075, fill: '#f3ecd9' },
  ],
  frame: { color: '#e8c14a', width: 0.012 },
  nameplate: { title: 'AURORA', plate: '#141026', ink: '#f3ecd9', size: 0.05 },
  effect: { kind: 'scanline', intensity: 0.55 },
};
