// CARD-15 card composition (render module). The vector ELEMENT schema + the cap are now the single
// source in @ingame/shared (formalized at M4); this module adds the render-consumable CLOSED
// attributes (base/frame/nameplate/effect) that the skia flatten draws — they reference cosmetic ids
// once the Styler + COSM roster (0063) formalize them, so they stay render-local for now. Coordinates
// are normalized 0..1 of the card face (one composition renders at any size — the PROOF size-ladder).
export { MAX_ELEMENTS, COMPOSITION_SCHEMA_VERSION } from '@ingame/shared';
export type { CardElement } from '@ingame/shared';
import { COMPOSITION_SCHEMA_VERSION, type CardElement } from '@ingame/shared';

// The 0063 free-baseline closed-attribute kinds (COSM-02 — the Styler build makes them real,
// decision 0066/styler-manifest). All ADDITIVE inside the shared schema's `.passthrough()` envelope:
// schemaVersion stays 1 (F21 — older renderers ignore unknown fields; flatten still dispatches on
// the version). Premium kinds (frost/fire/galaxy · holo/foil/metallic · ornate/gold frames) are M5.
export type FrameKind = 'thin-line' | 'double-line' | 'ticket-notch' | 'bracket-corners' | 'pixel-border';
export type EffectKind = 'none' | 'soft-glow' | 'scanline' | 'gradient-sheen' | 'dust' | 'vignette';
export type FinishKind = 'none' | 'matte' | 'subtle-gloss';
export type NameplateShape = 'slab' | 'ribbon' | 'bevel';

export type CardComposition = {
  schemaVersion: typeof COMPOSITION_SCHEMA_VERSION;
  base: { gradient: [string, string] } | { fill: string };
  elements: CardElement[]; // cap MAX_ELEMENTS (validated by the shared compositionSchema)
  frame?: { kind?: FrameKind; color: string; width: number }; // width normalized 0..1 of card width; kind defaults thin-line
  nameplate?: { shape?: NameplateShape; fontId?: string; title: string; plate: string; ink: string; size: number }; // shape defaults slab; fontId defaults clean-sans
  effect?: { kind: EffectKind; intensity: number }; // ONE at a time (CARD-12) — a RUNTIME overlay, not baked
  finish?: { kind: FinishKind }; // stacks OVER the effect; binary material, no slider (CARD-12/OQ-048)
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
