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

// The COSM-02 FREE-BASELINE roster (decision 0063 — the owner-blessed seed the Styler consumes;
// decision 0066/styler-manifest: client constants at M4, cosmetic entities + the `/card-bases`
// routes ride the curated/premium roster later). Ids are stable strings (the CARD-24b preset
// recipes reference them). Premium kinds (frost/fire/galaxy · holo/foil · ornate/gold · fancy
// fonts) are M5 (COSM-03) and deliberately absent. NO spec-ID strings in the display names (OQ-110).

export interface RosterItem<T extends string = string> {
  id: T;
  name: string; // display copy (F-06-sized by the consumer)
}

// ── Frames (0063 §4 — structural kinds; neutral free tones) ─────────────────────────────────────
export interface FrameDef extends RosterItem {
  kind: FrameKind | null; // null = none/clean
  color: string;
  width: number; // normalized 0..1 of card width
}
export const FRAMES: FrameDef[] = [
  { id: 'clean', name: 'CLEAN', kind: null, color: '', width: 0 },
  { id: 'thin-line', name: 'THIN LINE', kind: 'thin-line', color: '#c9c5e6', width: 0.012 },
  { id: 'double-line', name: 'DOUBLE LINE', kind: 'double-line', color: '#9b97c0', width: 0.011 },
  { id: 'ticket-notch', name: 'TICKET', kind: 'ticket-notch', color: '#f3ecd9', width: 0.012 },
  { id: 'bracket-corners', name: 'BRACKETS', kind: 'bracket-corners', color: '#f3ecd9', width: 0.014 },
  { id: 'pixel-border', name: 'PIXEL', kind: 'pixel-border', color: '#7ad0e8', width: 0.011 },
];

// ── Effects (0063 §2 — ONE at a time + intensity, CARD-12) ─────────────────────────────────────
export interface EffectDef extends RosterItem {
  kind: EffectKind;
}
export const EFFECTS: EffectDef[] = [
  { id: 'none', name: 'NONE', kind: 'none' },
  { id: 'soft-glow', name: 'SOFT GLOW', kind: 'soft-glow' },
  { id: 'scanline', name: 'SCANLINE', kind: 'scanline' },
  { id: 'gradient-sheen', name: 'SHEEN', kind: 'gradient-sheen' },
  { id: 'dust', name: 'DUST', kind: 'dust' },
  { id: 'vignette', name: 'VIGNETTE', kind: 'vignette' },
];
export const DEFAULT_INTENSITY = 0.6;

// ── Finishes (0063 §3 — binary materials, stack OVER the effect) ───────────────────────────────
export interface FinishDef extends RosterItem {
  kind: FinishKind;
}
export const FINISHES: FinishDef[] = [
  { id: 'none', name: 'STANDARD', kind: 'none' },
  { id: 'matte', name: 'MATTE', kind: 'matte' },
  { id: 'subtle-gloss', name: 'SUBTLE GLOSS', kind: 'subtle-gloss' },
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
];

// ── Title styling (CARD-11 — font + ink). Two fonts are REAL at M4 (already bundled); the 0063
// pixel/serif/script trio rides the pre-launch roster design pass (new font deps, rule-08). ──────
export const FONTS: RosterItem[] = [
  { id: 'clean-sans', name: 'CHAKRA' },
  { id: 'bold-display', name: 'PAYTONE' },
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
const BASE_GRADIENTS: Array<[string, string]> = [
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
      frame: { kind: 'pixel-border', color: '#7ad0e8', width: 0.011 },
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
  const frame = pick(FRAMES);
  const effect = pick(EFFECTS.filter((e) => e.kind !== 'none'));
  return {
    schemaVersion: COMPOSITION_SCHEMA_VERSION,
    base: { gradient: pick(BASE_GRADIENTS) },
    elements,
    ...(frame.kind ? { frame: { kind: frame.kind, color: frame.color, width: frame.width } } : {}),
    effect: { kind: effect.kind, intensity: 0.4 + Math.random() * 0.4 },
    nameplate: plate(gameTitle, pick(INKS).color, pick(['slab', 'ribbon', 'bevel'] as NameplateShape[]), pick(FONTS).id),
  };
}
