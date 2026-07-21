import {
  COMPOSITION_SCHEMA_VERSION,
} from '@ingame/shared';
import type {
  CardComposition,
  CardElement,
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
  /** COSM-05 (M6 W-5, decision 0080) — registry-mirror metadata for the ULTIMATE colour-freedom
   *  designs (apps/api/src/config/cosmetics.ts is the authority; the server library flag gates the
   *  picker UI). The client mirror drives the PURE paths that can't wait on the network: writing the
   *  explicit composition `cosmeticId` on apply, seeding the registry default colour, and the preset
   *  recipe mapping. Present (`true`) only on the ultimate SKUs. */
  colorCustomizable?: true;
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
  // ── W-5 ULTIMATE SKU (COSM-05 / decision 0080 ruling 2): minted ALONGSIDE the untouched base
  // design — same render kind, separate identity (the composition `cosmeticId` carries it; colour
  // inference alone must keep resolving base-first, so this row sits AFTER `marquee`). `color` is
  // the registry default the first apply seeds (the design is never colourless). ──────────────────
  { id: 'marquee-ultimate', name: 'MARQUEE ULTIMATE', kind: 'marquee', color: '#e8c14a', width: BAND, tier: 'premium', colorCustomizable: true },
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
  /** COSM-05 — the registry default plate colour a colorCustomizable plate SEEDS on first apply
   *  (BRASS ULTIMATE seeds the legacy brass gold — `BRASS_RAMP[1]`, render/buildCard.ts — so the
   *  fresh apply renders pixel-identical to base BRASS until the owner recolours). */
  plateSeed?: string;
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
  // ── W-5 ULTIMATE SKU (COSM-05/0080): the metal ramp in any hue — same `brass` shape, separate
  // identity via the composition `cosmeticId` (AFTER `brass` so shape inference stays base-first). ──
  { id: 'brass-ultimate', name: 'BRASS ULTIMATE', shape: 'brass', tier: 'premium', colorCustomizable: true, plateSeed: '#c9971f' },
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
  // ── W-5 ULTIMATE SKU (COSM-05/0080): free-pick ink while equipped (the CARD-11/OQ-137 unlock).
  // A font's cosmetic id IS the composition `fontId`, so identity needs no `cosmeticId` — the SKU
  // carries its own id and reuses the pacifico face (render/CardComposition + previewPrimitives). ──
  { id: 'pacifico-ultimate', name: 'SCRIPT ULTIMATE', tier: 'premium', colorCustomizable: true },
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
// 2026-07-20 (W-6 taste pass): the five arbitrary darks became the six CURATED palette-family bases
// below, so the Canvas base row and the Styler start-froms speak ONE colour voice. [0]
// stays the indigo NEBULA base (defaultBase's incumbent, unchanged).
export const BASE_GRADIENTS: Array<[string, string]> = [
  ['#241a4d', '#0e0b1e'], // NEBULA — cosmic indigo
  ['#2b1206', '#0b0503'], // EMBER — warm coal
  ['#2a1547', '#0a0713'], // HORIZON — synthwave dusk
  ['#0e2b26', '#08120f'], // GROVE — deep forest
  ['#2a0b2e', '#0a0514'], // ARCADE — neon violet-black
  ['#1c1e26', '#0a0b0f'], // MONOLITH — cool graphite
];

/** The styler's constant default plate colour (plate()/basePlate) — also what a plate RESTORES to
 *  when an ultimate (colour-customized) plate is swapped for a normal one (COSM-05: the picked
 *  colour belongs to the ultimate design, never to the document at large). */
export const PLATE_DEFAULT_COLOR = '#141026';

function plate(title: string, ink = '#f3ecd9', shape: NameplateShape = 'slab', fontId = 'clean-sans') {
  return { shape, fontId, title: title.toUpperCase(), plate: PLATE_DEFAULT_COLOR, ink, size: 0.05 };
}

/**
 * CARD-11 (owner ruling 2026-07-15): a card's nameplate TITLE TEXT is ALWAYS the game title —
 * system-derived, never user-authored (only font + ink + the plate cosmetic are customizable). This
 * forces the live draft's nameplate title to the game title (uppercased, matching plate()) so a
 * RESUMED card carrying a legacy/drifted stored title normalizes for WYSIWYG; the server flatten is
 * the authoritative backstop. No nameplate (legacy plateless doc) → returned untouched. Pure +
 * idempotent (same title in → same reference out).
 */
export function withGameTitle(comp: CardComposition, gameTitle: string): CardComposition {
  if (!comp.nameplate) return comp;
  const want = gameTitle.toUpperCase();
  if (comp.nameplate.title === want) return comp;
  return { ...comp, nameplate: { ...comp.nameplate, title: want } };
}

/** The CARD-18 default face as a composition — the BaseRail's incumbent forefront (kept plain: the
 *  "blank slate" escape hatch that sits LAST in the start fan; also the neutral base a preset recipe
 *  applies onto in the styler route). */
export function defaultBase(gameTitle: string): CardComposition {
  return {
    schemaVersion: COMPOSITION_SCHEMA_VERSION,
    base: { gradient: BASE_GRADIENTS[0]! },
    elements: [],
    nameplate: plate(gameTitle),
  };
}

// ── STRUCTURAL START-FROMS (W-6 structural rebuild, 2026-07-21 — attempt three) ────────────────
// The mood-palette fans were vetoed twice: they offered the user a PALETTE, which is ambiguous — the
// base row already owns colour. The approved concept is STRUCTURE-FIRST: every start-from is a
// structural skeleton a user would actually reach for as a headstart — the composition of the
// background layers, a commonly-built text scaffold, or an emblem blank. Three families, fanned in
// this order (DEFAULT last, the blank-slate escape hatch):
//   BACKDROPS — full-bleed layered structure over the base (a faked "sliced background"):
//     DIAGONAL SPLIT · INSET PANEL · BANDED THIRDS
//   TITLE LAYOUTS — text pre-positioned where a user wants it (the decorative text is SEPARATE from
//     the system nameplate and sits in the face above the plate band):
//     ARC BANNER · CORNER TAG + MONOGRAM · CAPTION BLOCK
//   EMBLEM STARTS — a composed centrepiece blank: CENTERED EMBLEM · BADGE CLUSTER
// Colours are NOT the offer: every element colour derives from the composition's CURRENT base at
// compose time (gradient stops — or a solid base's fill used twice — lightened/darkened via
// tonesFromBase) plus the neutral cream line, so the panels track the user's base instead of a fixed
// indigo. A template reads as structure, and the user recolours via the base row + per-element fills
// afterwards. No frame / effect / finish / premium
// font is stamped on (chrome stays the user's), which also makes every start-from + every deal
// trivially FREE (zero cost-stack — the CARD-16 guarantee, asserted in startsources.test.ts).
// Every template is ≤ 6 elements (no grouping exists — hand-editing must stay sane) and every
// element carries a CARD-08 `name` so the layers rack reads as a labelled scaffold.

const CREAM = '#f3ecd9'; // the neutral line/text accent (matches the INKS cream)

/** Mix `hex` toward `target` by t (channel lerp). Total: a malformed colour returns unchanged. */
function mixHex(hex: string, target: string, t: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex) || !/^#[0-9a-f]{6}$/i.test(target)) return hex;
  const ch = (s: string, i: number) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map((i) => Math.round(ch(hex, i) + (ch(target, i) - ch(hex, i)) * t));
  return '#' + out.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** The base-derived structural tones — the WHOLE colour vocabulary of the templates + deals. */
export interface StructureTones {
  raise: string; // a panel one step above the base (lightened top stop)
  raiseHi: string; // the brighter band / watermark tone (lightened further)
  shade: string; // a recessed panel (darkened bottom stop)
  line: string; // the neutral cream hairline / text colour
}
export function structureTones(gradient: [string, string]): StructureTones {
  return {
    raise: mixHex(gradient[0], '#ffffff', 0.16),
    raiseHi: mixHex(gradient[0], '#ffffff', 0.32),
    shade: mixHex(gradient[1], '#000000', 0.35),
    line: CREAM,
  };
}

/** The default base (NEBULA indigo, the incumbent forefront) — the floor a fan preview / deal
 *  composes onto when no draft base is supplied yet (a fresh pick, before the user chooses a base). */
export const DEFAULT_BASE: CardComposition['base'] = { gradient: BASE_GRADIENTS[0]! };

/** The two gradient stops a base derives its structural tones from: a gradient base uses its stops;
 *  a SOLID base uses its single fill for BOTH stops (so `raise` lightens it, `shade` darkens it). */
function baseStops(base: CardComposition['base']): [string, string] {
  return 'gradient' in base ? base.gradient : [base.fill, base.fill];
}

/** Structural tones derived from a composition's CURRENT base — the approved design (colours are
 *  BASE-DERIVED, never a fixed indigo). Absent base → the default (a fresh pick before a base pick). */
export function tonesFromBase(base: CardComposition['base'] = DEFAULT_BASE): StructureTones {
  return structureTones(baseStops(base));
}

// Geometry facts the layouts are tuned to (render/buildCard.ts): elements draw in W × (H − plateH)
// space (plate band 0.11·H at the bottom), card ratio W:H = 161:225 — so 1 unit of element-space y
// is Y2X units of x, and a "circle" needs h ≈ 0.8·w. Text x is the CENTER; y is the BASELINE.
const Y2X = 1.244; // (0.89 · 225/161) — converts an H'-normalized length to a W-normalized one
const CIRC = 0.8; // h = CIRC·w renders visually circular
const CHAR_W = 0.58; // the renderer's approx glyph-width factor (buildCard CHAR_W)
/** The text size that fits `len` characters inside `span` (of card width), capped at `max`. */
function fitSize(len: number, max: number, span: number): number {
  return Math.min(max, span / Y2X / (CHAR_W * Math.max(1, len)));
}

/** A normalized exclusion rect in element space — the deal's collision vocabulary. */
export interface StructureZone { x0: number; y0: number; x1: number; y1: number }

export interface BackdropDef {
  id: string;
  name: string;
  build: (t: StructureTones) => CardElement[];
}
export interface TitleLayoutDef {
  id: string;
  name: string;
  /** The zones this layout's text occupies — a dealt emblem must never intersect one. */
  textZones: StructureZone[];
  /** Where a dealt emblem sits under THIS layout (centre + max width). Jitter is ±0.02 and w ≥
   *  0.85·maxW — the slot is sized so slot ± jitter ± maxW/2 stays clear of every textZone by
   *  construction (each emblem builds inside [±w/2] of its place). */
  emblemSlot: { x: number; y: number; maxW: number };
  build: (t: StructureTones, gameTitle: string) => CardElement[];
}
export interface EmblemDef {
  id: string;
  name: string;
  /** Builds within the box [x ± w/2, y ± w/2] (the deal's zone rule leans on this envelope). */
  build: (t: StructureTones, place: { x: number; y: number; w: number }, glyphs: { main: string; topper: string }) => CardElement[];
}

// ── Backdrops — the "sliced background" structures ─────────────────────────────────────────────
export const BACKDROPS: BackdropDef[] = [
  {
    // ONE oversized rotated rect whose only on-face edge is the diagonal — the cream stroke traces
    // it (the other three edges sit off-canvas), so it reads as a clean two-zone split.
    id: 'diagonal-split',
    name: 'DIAGONAL SPLIT',
    build: (t) => [
      { type: 'rect', x: 0.18, y: 0.5, w: 1.1, h: 2.2, rotation: 14, fill: t.raise, stroke: { color: t.line, width: 0.005 }, name: 'SPLIT PANEL' },
    ],
  },
  {
    // Frame-in-frame: a recessed panel wearing a cream double rule; the content area is implied.
    id: 'inset-panel',
    name: 'INSET PANEL',
    build: (t) => [
      { type: 'rect', x: 0.5, y: 0.5, w: 0.84, h: 0.86, fill: t.shade, stroke: { color: t.line, width: 0.006 }, name: 'PANEL' },
      { type: 'rect', x: 0.5, y: 0.5, w: 0.76, h: 0.79, fill: t.shade, stroke: { color: t.line, width: 0.0025 }, opacity: 0.9, name: 'INNER RULE' },
    ],
  },
  {
    // Horizontal thirds: a raised top band, a cream hairline at the break, a recessed caption bed.
    id: 'banded-thirds',
    name: 'BANDED THIRDS',
    build: (t) => [
      { type: 'rect', x: 0.5, y: 0.17, w: 1.1, h: 0.34, fill: t.raise, name: 'TOP BAND' },
      { type: 'rect', x: 0.5, y: 0.345, w: 1.1, h: 0.008, fill: t.line, opacity: 0.9, name: 'BAND RULE' },
      { type: 'rect', x: 0.5, y: 0.87, w: 1.1, h: 0.26, fill: t.shade, name: 'CAPTION BED' },
    ],
  },
];

// ── Title layouts — text pre-positioned well ───────────────────────────────────────────────────
/** The first A–Z0–9 of the title (the monogram glyph); 'A' when the title has none. */
function monogramChar(gameTitle: string): string {
  return gameTitle.toUpperCase().match(/[A-Z0-9]/)?.[0] ?? 'A';
}
export const TITLE_LAYOUTS: TitleLayoutDef[] = [
  {
    // The game title arced across the upper third (size auto-fits the length), cream, glowing,
    // with a short rule under the apex.
    id: 'arc-banner',
    name: 'ARC BANNER',
    textZones: [{ x0: 0, y0: 0.02, x1: 1, y1: 0.36 }],
    emblemSlot: { x: 0.5, y: 0.645, maxW: 0.44 },
    build: (t, gameTitle) => {
      const text = gameTitle.toUpperCase().slice(0, 26);
      return [
        { type: 'text', x: 0.5, y: 0.2, text, size: fitSize(text.length, 0.075, 0.85), fill: t.line, arc: 40, glow: true, name: 'ARC TITLE' },
        { type: 'rect', x: 0.5, y: 0.3, w: 0.34, h: 0.008, fill: t.line, opacity: 0.75, name: 'BANNER RULE' },
      ];
    },
  },
  {
    // A small corner tag + one oversized letter as a luminous watermark design element.
    id: 'monogram-tag',
    name: 'TAG + MONOGRAM',
    textZones: [
      { x0: 0.44, y0: 0.22, x1: 0.9, y1: 0.72 }, // the monogram body
      { x0: 0.02, y0: 0.04, x1: 0.62, y1: 0.18 }, // the corner tag
    ],
    emblemSlot: { x: 0.24, y: 0.56, maxW: 0.32 },
    build: (t, gameTitle) => {
      const tag = gameTitle.toUpperCase().slice(0, 14);
      const tagSize = 0.04;
      // text x is the CENTER — anchor the tag's left edge at 0.08 of card width
      const tagX = 0.08 + (tag.length * tagSize * CHAR_W * Y2X) / 2;
      return [
        { type: 'text', x: 0.66, y: 0.66, text: monogramChar(gameTitle), size: 0.5, fill: t.raiseHi, opacity: 0.55, blend: 'screen', name: 'MONOGRAM' },
        { type: 'text', x: tagX, y: 0.12, text: tag, size: tagSize, fill: t.line, name: 'CORNER TAG' },
      ];
    },
  },
  {
    // Bottom-third aligned pair: the title line over a rule over a small tagline (sits just above
    // the plate band — the plate stays the system label, this is the display text).
    id: 'caption-block',
    name: 'CAPTION BLOCK',
    textZones: [{ x0: 0, y0: 0.66, x1: 1, y1: 0.93 }],
    emblemSlot: { x: 0.5, y: 0.36, maxW: 0.5 },
    build: (t, gameTitle) => {
      const text = gameTitle.toUpperCase().slice(0, 28);
      return [
        { type: 'text', x: 0.5, y: 0.76, text, size: fitSize(text.length, 0.062, 0.84), fill: t.line, name: 'CAPTION TITLE' },
        { type: 'rect', x: 0.5, y: 0.795, w: 0.4, h: 0.006, fill: t.line, opacity: 0.8, name: 'CAPTION RULE' },
        { type: 'text', x: 0.5, y: 0.875, text: 'PRESS START', size: 0.032, fill: t.line, opacity: 0.7, name: 'TAGLINE' },
      ];
    },
  },
];

// ── Emblem starts — a composed centrepiece blank ───────────────────────────────────────────────
export const EMBLEMS: EmblemDef[] = [
  {
    // A ringed glyph: recessed disc with a cream rule + a glowing cream icon.
    id: 'centered-emblem',
    name: 'CENTERED EMBLEM',
    build: (t, p, glyphs) => [
      { type: 'ellipse', x: p.x, y: p.y, w: p.w, h: p.w * CIRC, fill: t.shade, stroke: { color: t.line, width: 0.006 }, name: 'EMBLEM RING' },
      { type: 'icon', iconId: glyphs.main, x: p.x, y: p.y, w: p.w * 0.5, h: p.w * 0.5 * CIRC, fill: t.line, glow: true, name: 'EMBLEM GLYPH' },
    ],
  },
  {
    // Crown-over-shield with a star pip — icons composed as one badge, not scattered.
    id: 'badge-cluster',
    name: 'BADGE CLUSTER',
    build: (t, p, glyphs) => [
      { type: 'icon', iconId: 'shield', x: p.x, y: p.y + 0.1 * p.w, w: p.w * 0.6, h: p.w * 0.48, fill: t.shade, stroke: { color: t.line, width: 0.005 }, name: 'BADGE SHIELD' },
      { type: 'icon', iconId: glyphs.topper, x: p.x, y: p.y - 0.26 * p.w, w: p.w * 0.4, h: p.w * 0.24, fill: t.line, glow: true, name: 'BADGE TOPPER' },
      { type: 'icon', iconId: 'star', x: p.x, y: p.y + 0.1 * p.w, w: p.w * 0.16, h: p.w * 0.13, fill: t.line, opacity: 0.9, name: 'BADGE PIP' },
    ],
  },
];

// The gaming-native glyph pools a deal draws from (all ESSENTIAL_ICONS ids — free, CARD-17).
const DEAL_GLYPHS = ['invader', 'crown', 'sword', 'shield', 'dpad', 'joystick', 'trophy', 'flame'] as const;
const DEAL_TOPPERS = ['crown', 'bolt', 'flame'] as const;
// The fan's fixed template glyphs (deterministic previews; the deal varies them).
const TEMPLATE_GLYPHS = { main: 'invader', topper: 'crown' } as const;

/** A structural start composition: elements over the CURRENT base (the default when none is supplied),
 *  default plate, NO chrome — structure is the offer, colour + chrome stay the user's (and the
 *  cost-stack is trivially 0). Element tones are built from THIS base's stops by the caller, so the
 *  card renders base-derived panels — not a fixed indigo — the moment the base changes. */
function composeStructure(
  elements: CardElement[],
  gameTitle: string,
  base: CardComposition['base'] = DEFAULT_BASE,
): CardComposition {
  return {
    schemaVersion: COMPOSITION_SCHEMA_VERSION,
    base,
    elements,
    nameplate: plate(gameTitle),
  };
}

export interface StartSource {
  id: string;
  name: string;
  kindLabel: 'DEFAULT' | 'BACKDROP' | 'TITLE' | 'EMBLEM';
  /** Compose the start onto the current base (its tones derive from `base`'s stops); absent base →
   *  the default. Pass the DRAFT's current base so the fan preview re-derives when the base changes. */
  compose: (gameTitle: string, base?: CardComposition['base']) => CardComposition;
}

const DEFAULT_SOURCE: StartSource = { id: 'default', name: 'DEFAULT', kindLabel: 'DEFAULT', compose: defaultBase };

/** The structural fan: backdrops → title layouts → emblem starts → DEFAULT last (CARD-16 — never a
 *  blank canvas; DEFAULT is the intentional plain floor). Structure is genre-neutral, so the fan is
 *  ONE fixed, considered order — the old genre-mood reordering (startSourcesFor) is retired. */
export const START_SOURCES: StartSource[] = [
  ...BACKDROPS.map((b): StartSource => ({
    id: b.id,
    name: b.name,
    kindLabel: 'BACKDROP',
    compose: (gameTitle, base) => composeStructure(b.build(tonesFromBase(base)), gameTitle, base),
  })),
  ...TITLE_LAYOUTS.map((l): StartSource => ({
    id: l.id,
    name: l.name,
    kindLabel: 'TITLE',
    compose: (gameTitle, base) => composeStructure(l.build(tonesFromBase(base), gameTitle), gameTitle, base),
  })),
  ...EMBLEMS.map((e): StartSource => ({
    id: e.id,
    name: e.name,
    kindLabel: 'EMBLEM',
    compose: (gameTitle, base) =>
      composeStructure(
        e.build(tonesFromBase(base), { x: 0.5, y: 0.42, w: 0.52 }, TEMPLATE_GLYPHS),
        gameTitle,
        base,
      ),
  })),
  DEFAULT_SOURCE,
];

// ── DEAL A CARD (the SURPRISE ME rebuild — one composed hand, not thrown polygons) ─────────────
// A deal composes ONE backdrop + ONE title layout + ONE emblem (or deliberately none, ~28%) into a
// coherent card: shared base-derived tones, sane z-order (backdrop under emblem under text), and the
// zone rule — the emblem lands in the title layout's `emblemSlot`, an envelope sized so it can NEVER
// intersect that layout's `textZones` (asserted over 200 seeds in startsources.test.ts). Pure given
// `rng`; the plan/compose split keeps the invariants unit-testable.

export interface DealPlan {
  backdropId: string;
  layoutId: string;
  emblemId: string | null; // null = a deliberately emblem-free deal
  place: { x: number; y: number; w: number } | null;
  glyphs: { main: string; topper: string } | null;
}

/** Draw a deal plan. rng call order is FIXED (backdrop → layout → emblem roll → picks → placement)
 *  so a given seed always yields the same plan. */
export function dealPlan(rng: () => number): DealPlan {
  const backdrop = BACKDROPS[Math.floor(rng() * BACKDROPS.length)]!;
  const layout = TITLE_LAYOUTS[Math.floor(rng() * TITLE_LAYOUTS.length)]!;
  if (rng() < 0.28) {
    return { backdropId: backdrop.id, layoutId: layout.id, emblemId: null, place: null, glyphs: null };
  }
  const emblem = EMBLEMS[Math.floor(rng() * EMBLEMS.length)]!;
  const glyphs = {
    main: DEAL_GLYPHS[Math.floor(rng() * DEAL_GLYPHS.length)]!,
    topper: DEAL_TOPPERS[Math.floor(rng() * DEAL_TOPPERS.length)]!,
  };
  const slot = layout.emblemSlot;
  const place = {
    x: slot.x + (rng() - 0.5) * 0.04, // jitter ±0.02 — the slot envelope accounts for it
    y: slot.y + (rng() - 0.5) * 0.04,
    w: slot.maxW * (0.85 + rng() * 0.15),
  };
  return { backdropId: backdrop.id, layoutId: layout.id, emblemId: emblem.id, place, glyphs };
}

/** Realize a plan as a composition, tones derived from the CURRENT base. Z-order: backdrop under
 *  emblem under title text. Absent base → the default (a deal from a fresh pick). */
export function composeDeal(
  dealtPlan: DealPlan,
  gameTitle: string,
  base: CardComposition['base'] = DEFAULT_BASE,
): CardComposition {
  const t = tonesFromBase(base);
  const backdrop = BACKDROPS.find((b) => b.id === dealtPlan.backdropId) ?? BACKDROPS[0]!;
  const layout = TITLE_LAYOUTS.find((l) => l.id === dealtPlan.layoutId) ?? TITLE_LAYOUTS[0]!;
  const emblem = dealtPlan.emblemId ? EMBLEMS.find((e) => e.id === dealtPlan.emblemId) : undefined;
  const emblemEls =
    emblem && dealtPlan.place && dealtPlan.glyphs ? emblem.build(t, dealtPlan.place, dealtPlan.glyphs) : [];
  return composeStructure([...backdrop.build(t), ...emblemEls, ...layout.build(t, gameTitle)], gameTitle, base);
}

/**
 * DEAL A CARD (UI copy; the export keeps its historical name — render/composition.test.ts guards it
 * too). Deals a coherent, FREE structural start (CARD-16; non-idempotent by default). Pure given
 * `rng` (defaults Math.random for the app) — inject a seeded source to test the invariants.
 */
export function surpriseDeal(
  gameTitle: string,
  rng: () => number = Math.random,
  base: CardComposition['base'] = DEFAULT_BASE,
): CardComposition {
  return composeDeal(dealPlan(rng), gameTitle, base);
}
