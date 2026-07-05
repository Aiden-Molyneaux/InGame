// CARD-15 card composition (render module). The vector ELEMENT schema + the cap are now the single
// source in @ingame/shared (formalized at M4); this module adds the render-consumable CLOSED
// attributes (base/frame/nameplate/effect) that the skia flatten draws — they reference cosmetic ids
// once the Styler + COSM roster (0063) formalize them, so they stay render-local for now. Coordinates
// are normalized 0..1 of the card face (one composition renders at any size — the PROOF size-ladder).
export { MAX_ELEMENTS, COMPOSITION_SCHEMA_VERSION } from '@ingame/shared';
export type { CardElement } from '@ingame/shared';
import { COMPOSITION_SCHEMA_VERSION, type CardElement } from '@ingame/shared';

export type CardComposition = {
  schemaVersion: typeof COMPOSITION_SCHEMA_VERSION;
  base: { gradient: [string, string] } | { fill: string };
  elements: CardElement[]; // cap MAX_ELEMENTS (validated by the shared compositionSchema)
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
