import {
  COMPOSITION_SCHEMA_VERSION,
} from '@ingame/shared';
import type {
  CardComposition,
  EffectKind,
  FinishKind,
  FrameKind,
  NameplateShape,
} from '../render/composition';

// The COSM-02 roster (decision 0063, EXPANDED by decision 0068 — the Styler consumes it as client
// constants at M4; cosmetic entities + the `/card-bases` routes ride the curated roster later,
// 0066/styler-manifest). Ids are stable strings (the CARD-24b preset recipes reference them) and MATCH
// the server registry's cosmeticId space one-for-one (`apps/api/src/config/cosmetics.ts` — no
// synthetic namespacing).
// 2026-07-09: the once-deferred premium kinds (ornate/glow/foil/marquee frames · grain/halftone/
// frost/embers effects · linen/holographic/metallic finishes · 5 fonts) landed ALL as `tier: 'basic'`
// (0068 §3) — a placeholder posture pending the re-tag.
// 2026-07-13 (decision 0075, P10): the re-tag lands — `tier: 'premium'` below is now a REAL entitlement
// gate (COSM-03/M5), not declarative-only. Two items retired from the roster (still render on legacy
// documents via `render/buildCard.ts`'s kind support — the retired `pixel-border`/`grain` precedent):
// BRACKETS (`bracket-corners`) frame · SUBTLE GLOSS (`subtle-gloss`) finish.
// NO spec-ID strings in the display names (OQ-110).

export type CosmeticTier = 'basic' | 'premium';
export interface RosterItem<T extends string = string> {
  id: T;
  name: string; // display copy (F-06-sized by the consumer)
  tier?: CosmeticTier; // COSM-03 gating metadata; absent = basic (the pre-0068 entries are all basic)
}

// ── Frames (0063 §4 — structural kinds; neutral free tones) ─────────────────────────────────────
export interface FrameDef extends RosterItem {
  kind: FrameKind | null; // null = none/clean
  color: string;
  width: number; // normalized 0..1 of card width
}
// FILLED BANDS (owner iteration, 2026-07-09): every band frame is a SOLID border about as thick as
// the Double Line/Chrome footprint — `width` is the band's VISIBLE thickness (normalized to card W;
// frameNodes strokes 2× and lets the clip take the outer half). Double Line/Chrome keep their
// two-rule structure (they ARE the thickness reference); brackets keep corner arms, beefed to match.
// PIXEL retired to the ledger (docs/design/cosmetics-ledger.md) — the renderer keeps the kind for
// legacy documents (F21). Same-KIND frames are disambiguated by `color` downstream (styler selection,
// preset derive, EquipReadout — kind+color, never kind alone).
const BAND = 0.045; // the Double-Line-footprint band thickness
// BRACKETS (`bracket-corners`) retired from the roster (decision 0075) — `FrameKind` keeps the kind for
// legacy-document rendering (`render/buildCard.ts`), the picker just no longer offers it.
export const FRAMES: FrameDef[] = [
  { id: 'clean', name: 'CLEAN', kind: null, color: '', width: 0, tier: 'basic' },
  { id: 'thin-line', name: 'LINE', kind: 'thin-line', color: '#c9c5e6', width: BAND, tier: 'basic' },
  { id: 'double-line', name: 'DOUBLE LINE', kind: 'double-line', color: '#9b97c0', width: 0.017, tier: 'basic' },
  { id: 'ticket-notch', name: 'TICKET', kind: 'ticket-notch', color: '#f3ecd9', width: BAND, tier: 'basic' },
  // ── decision 0068 additions, RE-TAGGED by decision 0075 (P10) ────────────────────────────────
  { id: 'thin-gold', name: 'GOLD', kind: 'thin-line', color: '#e8c14a', width: BAND, tier: 'premium' },
  { id: 'lime', name: 'LIME', kind: 'thin-line', color: '#a9e34b', width: BAND, tier: 'basic' },
  { id: 'bubblegum', name: 'BUBBLEGUM', kind: 'thin-line', color: '#e85ad0', width: BAND, tier: 'basic' },
  { id: 'chrome', name: 'CHROME', kind: 'double-line', color: '#d8d5ec', width: 0.017, tier: 'premium' },
  // STUB rides the ticket-notch kind in the app accent-orange so it stays distinct from cream TICKET.
  { id: 'stub', name: 'STUB', kind: 'ticket-notch', color: '#ff9f43', width: BAND, tier: 'basic' },
  { id: 'ornate-gold', name: 'ORNATE GOLD', kind: 'ornate', color: '#e8c14a', width: BAND, tier: 'premium' },
  { id: 'ember-glow', name: 'EMBER GLOW', kind: 'glow', color: '#ff5a5a', width: 0.04, tier: 'premium' },
  { id: 'plasma', name: 'PLASMA', kind: 'glow', color: '#5ad0ff', width: 0.04, tier: 'premium' },
  { id: 'holo-foil', name: 'HOLO FOIL', kind: 'foil', color: '#e85ad0', width: BAND, tier: 'premium' },
  { id: 'marquee', name: 'MARQUEE', kind: 'marquee', color: '#e8c14a', width: BAND, tier: 'premium' },
];

// ── Effects (0063 §2 — ONE at a time + intensity, CARD-12) ─────────────────────────────────────
export interface EffectDef extends RosterItem {
  kind: EffectKind;
}
export const EFFECTS: EffectDef[] = [
  { id: 'none', name: 'NONE', kind: 'none' },
  { id: 'soft-glow', name: 'SOFT GLOW', kind: 'soft-glow' },
  // SCANLINE re-tagged premium by decision 0075 (P10) — moved out of the free set.
  { id: 'scanline', name: 'SCANLINE', kind: 'scanline', tier: 'premium' },
  { id: 'gradient-sheen', name: 'SHEEN', kind: 'gradient-sheen' },
  { id: 'dust', name: 'DUST', kind: 'dust' },
  { id: 'vignette', name: 'VIGNETTE', kind: 'vignette' },
  // ── decision 0068 additions, RE-TAGGED by decision 0075 (P10; FROST + EMBERS animate live). GRAIN
  // retired to the ledger (owner iteration 2026-07-09); the renderer keeps the kind for legacy
  // documents (F21). ──
  { id: 'halftone', name: 'HALFTONE', kind: 'halftone', tier: 'premium' },
  { id: 'frost', name: 'FROST', kind: 'frost', tier: 'premium' },
  { id: 'embers', name: 'EMBERS', kind: 'embers', tier: 'premium' },
];
export const DEFAULT_INTENSITY = 0.6;

// ── Finishes (0063 §3 — binary materials, stack OVER the effect) ───────────────────────────────
export interface FinishDef extends RosterItem {
  kind: FinishKind;
}
// SUBTLE GLOSS (`subtle-gloss`) retired from the roster (decision 0075) — `FinishKind` keeps the kind
// for legacy-document rendering (`render/buildCard.ts`), the picker just no longer offers it.
export const FINISHES: FinishDef[] = [
  { id: 'none', name: 'STANDARD', kind: 'none' },
  { id: 'matte', name: 'MATTE', kind: 'matte' },
  // ── decision 0068 additions, RE-TAGGED by decision 0075 (P10; HOLOGRAPHIC + METALLIC sweep a
  // sheen live) ────────────────────────────────────────────────────────────────────────────────
  { id: 'linen', name: 'LINEN', kind: 'linen', tier: 'premium' },
  { id: 'holographic', name: 'HOLOGRAPHIC', kind: 'holographic', tier: 'premium' },
  { id: 'metallic', name: 'METALLIC', kind: 'metallic', tier: 'premium' },
];

// ── Nameplates (0063 §4 / decision 0018 — the plate OBJECT; shapes keep the name legible) ──────
// A PLATE IS REQUIRED (owner ruling, OQ-135 resolved 2026-07-06 — "the name always renders"):
// NONE left the roster; legacy `shape:'none'` documents render as SLAB (buildCard coerces).
export interface NameplateDef extends RosterItem {
  shape: NameplateShape;
}
export const NAMEPLATES: NameplateDef[] = [
  { id: 'slab', name: 'SLAB', shape: 'slab' },
  { id: 'ribbon', name: 'RIBBON', shape: 'ribbon' },
  { id: 'bevel', name: 'BEVEL', shape: 'bevel' },
  // ── decision 0068 additions (all basic-now; static geometry) ──────────────────────────────────
  { id: 'capsule', name: 'CAPSULE', shape: 'capsule', tier: 'basic' },
  { id: 'tab', name: 'TAB', shape: 'tab', tier: 'basic' },
  { id: 'arch', name: 'ARCH', shape: 'arch', tier: 'basic' },
  { id: 'dogtag', name: 'DOGTAG', shape: 'dogtag', tier: 'basic' },
  // BRASS re-tagged premium by decision 0075 (P10) — the only premium nameplate.
  { id: 'brass', name: 'BRASS', shape: 'brass', tier: 'premium' },
];

// ── Title styling (CARD-11 — font + ink). CHAKRA + PAYTONE were the M4 pair; decision 0068 adds
// five more (each a bundled @expo-google-fonts dep, registered by fontId in useCardSkiaCtx). A
// fontId with no loaded typeface falls back to the default face — never a crash (CardComposition). ──
export const FONTS: RosterItem[] = [
  { id: 'clean-sans', name: 'CHAKRA' },
  { id: 'bold-display', name: 'PAYTONE' },
  // ── decision 0068 additions, RE-TAGGED by decision 0075 (P10; amended — 3 premium fonts → 4) ───
  { id: 'press-start', name: 'PIXEL', tier: 'basic' },
  { id: 'bitter', name: 'SLAB', tier: 'premium' },
  { id: 'space-mono', name: 'MONO', tier: 'premium' },
  { id: 'pacifico', name: 'SCRIPT', tier: 'premium' },
  { id: 'stencil', name: 'STENCIL', tier: 'premium' },
];
export const INKS: Array<RosterItem & { color: string }> = [
  { id: 'cream', name: 'CREAM', color: '#f3ecd9' },
  { id: 'midnight', name: 'MIDNIGHT', color: '#14121f' },
  { id: 'gold', name: 'GOLD', color: '#e8c14a' },
  { id: 'pink', name: 'PINK', color: '#e85ad0' },
  { id: 'cyan', name: 'CYAN', color: '#7ad0e8' },
  { id: 'moss', name: 'MOSS', color: '#a8c980' },
];

// ── Base palettes + the start-from sources (CARD-16 — never a blank canvas) ────────────────────
// (exported for the Canvas ADD sheet's BASE row — one seed palette, no second source)
export const BASE_GRADIENTS: Array<[string, string]> = [
  ['#241a4d', '#0e0b1e'],
  ['#0e2b26', '#08120f'],
  ['#3a1430', '#150713'],
  ['#12263f', '#070d16'],
  ['#402a10', '#170e04'],
];

function plate(title: string, ink = '#f3ecd9', shape: NameplateShape = 'slab', fontId = 'clean-sans') {
  return { shape, fontId, title: title.toUpperCase(), plate: '#141026', ink, size: 0.05 };
}

/** The CARD-18 default face as a composition — the BaseRail's incumbent forefront. */
export function defaultBase(gameTitle: string): CardComposition {
  return {
    schemaVersion: COMPOSITION_SCHEMA_VERSION,
    base: { gradient: BASE_GRADIENTS[0]! },
    elements: [],
    nameplate: plate(gameTitle),
  };
}

export interface StartSource {
  id: string;
  name: string;
  kindLabel: 'DEFAULT' | 'TEMPLATE' | 'KIT' | 'PRESET';
  compose: (gameTitle: string) => CardComposition;
}

/** Templates = single faces; kits arrive wearing a frame + effect bundle (COSM-02). */
export const START_SOURCES: StartSource[] = [
  { id: 'default', name: 'DEFAULT', kindLabel: 'DEFAULT', compose: defaultBase },
  {
    id: 'tpl-nebula',
    name: 'NEBULA',
    kindLabel: 'TEMPLATE',
    compose: (t) => ({
      schemaVersion: COMPOSITION_SCHEMA_VERSION,
      base: { gradient: ['#241a4d', '#0e0b1e'] },
      elements: [
        { type: 'poly', shape: 'star', x: 0.5, y: 0.34, w: 0.5, h: 0.5, fill: '#e8c14a' },
        { type: 'ellipse', x: 0.72, y: 0.2, w: 0.13, h: 0.13, fill: '#f3ecd9' },
        { type: 'poly', shape: 'diamond', x: 0.24, y: 0.24, w: 0.1, h: 0.1, rotation: 20, fill: '#7ad0e8' },
      ],
      nameplate: plate(t),
    }),
  },
  {
    id: 'tpl-horizon',
    name: 'HORIZON',
    kindLabel: 'TEMPLATE',
    compose: (t) => ({
      schemaVersion: COMPOSITION_SCHEMA_VERSION,
      base: { gradient: ['#12263f', '#070d16'] },
      elements: [
        { type: 'rect', x: 0.5, y: 0.55, w: 0.9, h: 0.012, fill: '#e85ad0' },
        { type: 'rect', x: 0.5, y: 0.6, w: 0.7, h: 0.008, fill: '#7ad0e8' },
        { type: 'ellipse', x: 0.5, y: 0.32, w: 0.34, h: 0.34, fill: '#e8c14a' },
      ],
      nameplate: plate(t, '#7ad0e8'),
    }),
  },
  {
    id: 'kit-arcade',
    name: 'ARCADE',
    kindLabel: 'KIT',
    compose: (t) => ({
      schemaVersion: COMPOSITION_SCHEMA_VERSION,
      base: { gradient: ['#3a1430', '#150713'] },
      elements: [
        { type: 'poly', shape: 'triangle', x: 0.5, y: 0.36, w: 0.42, h: 0.38, fill: '#e85ad0' },
        { type: 'rect', x: 0.5, y: 0.62, w: 0.56, h: 0.02, fill: '#7ad0e8' },
      ],
      // (pixel-border retired 2026-07-09 — the kit wears cyan brackets now; ledger entry)
      frame: { kind: 'bracket-corners', color: '#7ad0e8', width: 0.028 },
      effect: { kind: 'scanline', intensity: 0.55 },
      nameplate: plate(t, '#f3ecd9', 'slab', 'bold-display'),
    }),
  },
  {
    id: 'kit-museum',
    name: 'MUSEUM',
    kindLabel: 'KIT',
    compose: (t) => ({
      schemaVersion: COMPOSITION_SCHEMA_VERSION,
      base: { gradient: ['#0e2b26', '#08120f'] },
      elements: [
        { type: 'ellipse', x: 0.5, y: 0.38, w: 0.5, h: 0.5, fill: '#a8c980' },
        { type: 'ellipse', x: 0.5, y: 0.38, w: 0.36, h: 0.36, fill: '#0e2b26' },
      ],
      frame: { kind: 'double-line', color: '#c9c5e6', width: 0.01 },
      effect: { kind: 'vignette', intensity: 0.5 },
      nameplate: plate(t, '#e8c14a', 'bevel'),
    }),
  },
];

/** ⯒ SURPRISE ME — a fresh client-side deal from the free baseline (CARD-16; non-idempotent). */
export function surpriseDeal(gameTitle: string): CardComposition {
  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;
  const colors = ['#e8c14a', '#e85ad0', '#7ad0e8', '#f3ecd9', '#a8c980'];
  const shapes = ['star', 'diamond', 'triangle'] as const;
  const elements: CardComposition['elements'] = [];
  const n = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    elements.push({
      type: 'poly',
      shape: pick([...shapes]),
      x: 0.25 + Math.random() * 0.5,
      y: 0.15 + Math.random() * 0.5,
      w: 0.12 + Math.random() * 0.4,
      h: 0.12 + Math.random() * 0.4,
      rotation: Math.floor(Math.random() * 60) - 30,
      fill: pick(colors),
    });
  }
  // decision 0075 (P10): FRAMES/EFFECTS/FONTS now carry real premium entries — a "free baseline" deal
  // must never hand out one (CARD-16's guarantee is economic, not just visual: a premium pick here
  // would trip the CARD-13 reconcile gate on the very first save of an unowned card).
  const freeFrames = FRAMES.filter((f) => f.tier !== 'premium');
  const freeEffects = EFFECTS.filter((e) => e.kind !== 'none' && e.tier !== 'premium');
  const freeFonts = FONTS.filter((f) => f.tier !== 'premium');
  const frame = pick(freeFrames);
  const effect = pick(freeEffects);
  return {
    schemaVersion: COMPOSITION_SCHEMA_VERSION,
    base: { gradient: pick(BASE_GRADIENTS) },
    elements,
    ...(frame.kind ? { frame: { kind: frame.kind, color: frame.color, width: frame.width } } : {}),
    effect: { kind: effect.kind, intensity: 0.4 + Math.random() * 0.4 },
    nameplate: plate(gameTitle, pick(INKS).color, pick(['slab', 'ribbon', 'bevel'] as NameplateShape[]), pick(freeFonts).id),
  };
}
