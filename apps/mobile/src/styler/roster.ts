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
// below (PALETTES), so the Canvas base row and the Styler start-froms speak ONE colour voice. [0]
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

// ── CURATED PALETTE FAMILIES (W-6 taste pass, 2026-07-20) ──────────────────────────────────────
// The old start-froms read as hideous for three reasons: (1) kit-arcade opened with a RETIRED frame
// kind (`bracket-corners`, pulled by 0075) AND a PREMIUM effect (`scanline`, re-tagged by 0075) — so
// "Start with this" handed the user an unowned premium DEBT on the first save, breaking CARD-16's
// economic guarantee; (2) the element geometry was arbitrary (a huge dead-centre star, 0.008-tall
// sliver rects) with clashing hues sampled at random from the whole palette; (3) the gradients had no
// shared voice. The rebuild anchors every start-from (and every SURPRISE deal) to a small set of
// COHERENT palette families: a considered gradient + 2–3 HARMONIZING accents + a matched FREE frame /
// plate / font / effect. Every family references FREE cosmetics ONLY (verified against premium.ts —
// no premium frame/effect/finish/font/plate), so `collectPremiumRosterIds` is empty and the cost-stack
// is 0 for every start-from and every surprise. Card colours are literal (card CONTENT, like the
// existing gradients — CONVENTIONS: compositions may use literal colours; themed tokens are for chrome).
//
// `moods` are lowercased genre names (the CollectionItem.genres vocabulary — Horror/Platformer/RPG/…);
// `startSourcesFor(genres)` reorders the fan so the best-fit family LEADS. Nothing is ever hidden — an
// unmatched game just keeps the curated order (a strong family still leads; DEFAULT stays last).

/** A curated free-tier colour+cosmetic family. Frame/plate/font/effect are FREE roster refs (or null);
 *  `accents` + the gradient stops are the family's whole colour vocabulary (the coherence invariant). */
interface PaletteFamily {
  id: string;
  name: string;
  kindLabel: 'TEMPLATE' | 'KIT';
  gradient: [string, string];
  accents: string[]; // 2–3 harmonizing hues (the dominant first)
  ink: string; // title ink (a free colour field) — one of the accents
  frameId: string | null; // a FREE frame roster id, or null for CLEAN (no frame)
  fontId: string; // a FREE font roster id (clean-sans / bold-display / press-start)
  plateShape: NameplateShape; // a FREE plate shape (never `brass` — that's premium)
  effect?: { kind: EffectKind; intensity: number }; // a FREE effect (soft-glow/gradient-sheen/dust/vignette)
  finish?: FinishKind; // a FREE finish (matte) — omit for STANDARD
  moods: string[]; // lowercased genre names this family suits (genre-aware ordering)
  /** The hand-designed element layout for this family's curated start-from card. */
  face: CardComposition['elements'];
}

export const PALETTES: PaletteFamily[] = [
  {
    id: 'nebula',
    name: 'NEBULA',
    kindLabel: 'TEMPLATE',
    gradient: ['#241a4d', '#0e0b1e'],
    accents: ['#e8c14a', '#f3ecd9', '#7ad0e8'],
    ink: '#f3ecd9',
    frameId: null,
    fontId: 'bold-display',
    plateShape: 'bevel',
    moods: ['adventure', 'rpg', 'shooter', 'metroidvania', 'simulation'],
    // a gold crescent moon (disc + a base-fill disc offset to carve the crescent) + cream stars + a cyan spark
    face: [
      { type: 'ellipse', x: 0.68, y: 0.28, w: 0.34, h: 0.34, fill: '#e8c14a' },
      { type: 'ellipse', x: 0.6, y: 0.24, w: 0.34, h: 0.34, fill: '#241a4d' },
      { type: 'poly', shape: 'star', x: 0.26, y: 0.3, w: 0.1, h: 0.1, fill: '#f3ecd9' },
      { type: 'poly', shape: 'star', x: 0.4, y: 0.19, w: 0.06, h: 0.06, fill: '#f3ecd9' },
      { type: 'ellipse', x: 0.2, y: 0.48, w: 0.03, h: 0.03, fill: '#7ad0e8' },
    ],
  },
  {
    id: 'ember',
    name: 'EMBER',
    kindLabel: 'KIT',
    gradient: ['#2b1206', '#0b0503'],
    accents: ['#ff9f43', '#e8c14a', '#ff5a5a'],
    ink: '#f3ecd9',
    frameId: 'stub', // ticket-notch orange (free)
    fontId: 'bold-display',
    plateShape: 'slab',
    effect: { kind: 'vignette', intensity: 0.5 }, // moody edge-darken (free)
    finish: 'matte',
    moods: ['horror', 'soulslike', 'action', 'fighting', 'roguelike'],
    // a low ember glow + a red underglow + rising motes
    face: [
      { type: 'ellipse', x: 0.5, y: 0.72, w: 0.9, h: 0.5, fill: '#ff9f43', glow: true, opacity: 0.85 },
      { type: 'ellipse', x: 0.5, y: 0.8, w: 0.6, h: 0.3, fill: '#ff5a5a', glow: true, opacity: 0.5 },
      { type: 'ellipse', x: 0.34, y: 0.4, w: 0.04, h: 0.04, fill: '#e8c14a', glow: true },
      { type: 'ellipse', x: 0.62, y: 0.34, w: 0.03, h: 0.03, fill: '#ff9f43', glow: true },
      { type: 'ellipse', x: 0.5, y: 0.28, w: 0.025, h: 0.025, fill: '#e8c14a', glow: true },
    ],
  },
  {
    id: 'horizon',
    name: 'HORIZON',
    kindLabel: 'KIT',
    gradient: ['#2a1547', '#0a0713'],
    accents: ['#e85ad0', '#7ad0e8', '#e8c14a'],
    ink: '#7ad0e8',
    frameId: 'bubblegum', // thin-line pink (free)
    fontId: 'bold-display',
    plateShape: 'tab',
    effect: { kind: 'gradient-sheen', intensity: 0.5 }, // glassy sweep (free)
    moods: ['racing', 'platformer', 'arcade', 'rhythm'],
    // a pink/gold sun over receding cyan horizon bars
    face: [
      { type: 'ellipse', x: 0.5, y: 0.36, w: 0.44, h: 0.44, fill: '#e85ad0' },
      { type: 'ellipse', x: 0.5, y: 0.33, w: 0.28, h: 0.28, fill: '#e8c14a', opacity: 0.6 },
      { type: 'rect', x: 0.5, y: 0.6, w: 0.9, h: 0.024, fill: '#7ad0e8' },
      { type: 'rect', x: 0.5, y: 0.66, w: 0.7, h: 0.02, fill: '#7ad0e8', opacity: 0.8 },
      { type: 'rect', x: 0.5, y: 0.71, w: 0.5, h: 0.016, fill: '#7ad0e8', opacity: 0.6 },
    ],
  },
  {
    id: 'grove',
    name: 'GROVE',
    kindLabel: 'KIT',
    gradient: ['#0e2b26', '#08120f'],
    accents: ['#a8c980', '#a9e34b', '#f3ecd9'],
    ink: '#f3ecd9',
    frameId: 'lime', // thin-line lime (free)
    fontId: 'clean-sans',
    plateShape: 'arch',
    effect: { kind: 'dust', intensity: 0.4 }, // soft motes (free)
    finish: 'matte',
    moods: ['simulation', 'puzzle', 'adventure', 'metroidvania'],
    // a botanical medallion: moss ring (disc + base cut) around a lime core + a cream pip
    face: [
      { type: 'ellipse', x: 0.5, y: 0.36, w: 0.46, h: 0.46, fill: '#a8c980' },
      { type: 'ellipse', x: 0.5, y: 0.36, w: 0.34, h: 0.34, fill: '#0e2b26' },
      { type: 'ellipse', x: 0.5, y: 0.36, w: 0.2, h: 0.2, fill: '#a9e34b' },
      { type: 'poly', shape: 'diamond', x: 0.5, y: 0.36, w: 0.06, h: 0.06, fill: '#f3ecd9' },
    ],
  },
  {
    id: 'arcade',
    name: 'ARCADE',
    kindLabel: 'KIT',
    gradient: ['#2a0b2e', '#0a0514'],
    accents: ['#e85ad0', '#7ad0e8', '#e8c14a'],
    ink: '#7ad0e8',
    frameId: 'double-line', // silver cabinet bezel (free) — REPLACES the retired bracket-corners
    fontId: 'press-start', // PIXEL (free)
    plateShape: 'dogtag',
    effect: { kind: 'soft-glow', intensity: 0.5 }, // neon bloom (free) — REPLACES the premium scanline
    moods: ['fighting', 'arcade', 'platformer', 'action'],
    // a bold magenta triangle + a cyan bar + gold/cyan pixel blocks
    face: [
      { type: 'poly', shape: 'triangle', x: 0.5, y: 0.36, w: 0.44, h: 0.4, fill: '#e85ad0' },
      { type: 'rect', x: 0.5, y: 0.62, w: 0.56, h: 0.024, fill: '#7ad0e8' },
      { type: 'rect', x: 0.3, y: 0.3, w: 0.06, h: 0.06, fill: '#e8c14a' },
      { type: 'rect', x: 0.7, y: 0.44, w: 0.05, h: 0.05, fill: '#7ad0e8', opacity: 0.9 },
    ],
  },
  {
    id: 'monolith',
    name: 'MONOLITH',
    kindLabel: 'KIT',
    gradient: ['#1c1e26', '#0a0b0f'],
    accents: ['#f3ecd9', '#e8c14a'],
    ink: '#f3ecd9',
    frameId: 'thin-line', // fine light rule (free)
    fontId: 'clean-sans',
    plateShape: 'slab',
    effect: { kind: 'vignette', intensity: 0.35 }, // restrained edge-darken (free)
    finish: 'matte',
    moods: ['puzzle', 'strategy', 'simulation'],
    // a restrained gallery emblem: a thin cream outline ring (base fill + cream stroke) + a gold diamond
    face: [
      { type: 'ellipse', x: 0.5, y: 0.34, w: 0.4, h: 0.4, fill: '#0a0b0f', stroke: { color: '#f3ecd9', width: 0.005 } },
      { type: 'poly', shape: 'diamond', x: 0.5, y: 0.34, w: 0.1, h: 0.1, fill: '#e8c14a' },
    ],
  },
];

const PALETTE_BY_ID = new Map(PALETTES.map((p) => [p.id, p]));

/** Resolve a FREE frame roster id to its render attrs (null = CLEAN / no frame). Pure roster lookup —
 *  keeps the exact kind+color+width of the basic row so `collectPremiumRosterIds` reads it as FREE. */
function frameAttrs(frameId: string | null): { kind: FrameKind; color: string; width: number } | null {
  if (!frameId) return null;
  const f = FRAMES.find((x) => x.id === frameId);
  return f && f.kind ? { kind: f.kind, color: f.color, width: f.width } : null;
}

/** Assemble a full composition from a family + an element layout (shared by the curated start-froms
 *  and SURPRISE — the single place the free-tier chrome is stamped on, so both stay coherent + free). */
function composeFromFamily(fam: PaletteFamily, elements: CardComposition['elements'], gameTitle: string): CardComposition {
  const frame = frameAttrs(fam.frameId);
  return {
    schemaVersion: COMPOSITION_SCHEMA_VERSION,
    base: { gradient: fam.gradient },
    elements,
    ...(frame ? { frame } : {}),
    ...(fam.effect ? { effect: fam.effect } : {}),
    ...(fam.finish ? { finish: { kind: fam.finish } } : {}),
    nameplate: plate(gameTitle, fam.ink, fam.plateShape, fam.fontId),
  };
}

export interface StartSource {
  id: string;
  name: string;
  kindLabel: 'DEFAULT' | 'TEMPLATE' | 'KIT' | 'PRESET';
  compose: (gameTitle: string) => CardComposition;
}

const CURATED_SOURCES: StartSource[] = PALETTES.map((fam) => ({
  id: fam.id,
  name: fam.name,
  kindLabel: fam.kindLabel,
  compose: (t) => composeFromFamily(fam, fam.face, t),
}));

const DEFAULT_SOURCE: StartSource = { id: 'default', name: 'DEFAULT', kindLabel: 'DEFAULT', compose: defaultBase };

/** Templates = single faces; kits arrive wearing a frame + effect bundle (COSM-02). Curated families
 *  first, the plain DEFAULT last (the blank-slate escape hatch). */
export const START_SOURCES: StartSource[] = [...CURATED_SOURCES, DEFAULT_SOURCE];

/**
 * Genre-aware ordering (W-6): score each curated family by how many of its `moods` the game's genres
 * match, then lead with the best fit. Nothing is hidden — a zero-match game keeps the curated order,
 * and DEFAULT always stays last. Cheap: `genres` already rides the styler route's shelf entry
 * (CollectionItem.genres), so no new fetch. Stable (curated order breaks ties / zero scores).
 */
export function startSourcesFor(genres: ReadonlyArray<{ name: string }> = []): StartSource[] {
  const wants = new Set(genres.map((g) => g.name.toLowerCase()));
  const scored = CURATED_SOURCES.map((s, i) => {
    const moods = PALETTE_BY_ID.get(s.id)?.moods ?? [];
    const score = moods.reduce((n, m) => n + (wants.has(m) ? 1 : 0), 0);
    return { s, i, score };
  });
  scored.sort((a, b) => b.score - a.score || a.i - b.i);
  return [...scored.map((x) => x.s), DEFAULT_SOURCE];
}

// ── SURPRISE ME — coherent randomisation (W-6) ─────────────────────────────────────────────────
// The old deal was pure-uniform noise: independent random fills per shape (clashing), a random frame
// colour unrelated to them, random ink — ugly. It now deals a random CURATED FAMILY, then generates a
// coherent element layout from that family's accents via one of a few layout archetypes. The chrome
// (frame/plate/font/effect) is the family's — always FREE — so a deal FEELS lucky, not random, and can
// never open a premium debt. Premium-in-surprise rule: NEVER. Families reference free cosmetics only;
// the cost-stack of every deal is 0 (asserted in the tests), matching the start-from guarantee.
// The combo logic is PURE with an injectable rng (`() => number` in [0,1)) so it's unit-testable.

function rng01(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}
const clamp01 = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The layout archetypes — each returns coherent geometry drawn ONLY from `a` (accents) + `g` (gradient
 *  stops, for base-fill cut-outs). Pure given the rng. */
type Archetype = (a: string[], g: [string, string], rng: () => number) => CardComposition['elements'];

const ARCHETYPES: Archetype[] = [
  // EMBLEM — a centred medallion: accent disc, base cut-out ring, inner accent core
  (a, g, rng) => {
    const cy = rng01(rng, 0.3, 0.4);
    const r = rng01(rng, 0.4, 0.5);
    return [
      { type: 'ellipse', x: 0.5, y: cy, w: r, h: r, fill: a[0]! },
      { type: 'ellipse', x: 0.5, y: cy, w: r * 0.68, h: r * 0.68, fill: g[0] },
      { type: 'ellipse', x: 0.5, y: cy, w: r * 0.36, h: r * 0.36, fill: a[1 % a.length]! },
    ];
  },
  // CONSTELLATION — a hero star + scattered small stars/dots
  (a, g, rng) => {
    const els: CardComposition['elements'] = [
      { type: 'poly', shape: 'star', x: rng01(rng, 0.42, 0.6), y: rng01(rng, 0.28, 0.38), w: rng01(rng, 0.24, 0.34), h: rng01(rng, 0.24, 0.34), fill: a[0]! },
    ];
    const n = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const dot = rng() < 0.5;
      els.push(
        dot
          ? { type: 'ellipse', x: rng01(rng, 0.16, 0.84), y: rng01(rng, 0.14, 0.56), w: rng01(rng, 0.02, 0.05), h: rng01(rng, 0.02, 0.05), fill: a[1 % a.length]! }
          : { type: 'poly', shape: 'star', x: rng01(rng, 0.16, 0.84), y: rng01(rng, 0.14, 0.56), w: rng01(rng, 0.05, 0.09), h: rng01(rng, 0.05, 0.09), fill: a[1 % a.length]! },
      );
    }
    return els;
  },
  // BANNER — 2–3 stacked bars of decreasing width (alternating accents) + a poly emblem above
  (a, g, rng) => {
    const els: CardComposition['elements'] = [
      { type: 'poly', shape: rng() < 0.5 ? 'triangle' : 'diamond', x: 0.5, y: rng01(rng, 0.28, 0.36), w: rng01(rng, 0.28, 0.4), h: rng01(rng, 0.28, 0.4), fill: a[0]! },
    ];
    const bars = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < bars; i++) {
      els.push({ type: 'rect', x: 0.5, y: 0.58 + i * 0.06, w: clamp01(0.86 - i * 0.18, 0.3, 0.9), h: rng01(rng, 0.016, 0.026), fill: a[(i + 1) % a.length]!, opacity: clamp01(1 - i * 0.2, 0.5, 1) });
    }
    return els;
  },
  // SCATTER — the old shape-scatter, but palette-locked so it reads coherent (small rotations, accents only)
  (a, g, rng) => {
    const shapes = ['star', 'diamond', 'triangle'] as const;
    const els: CardComposition['elements'] = [];
    const n = 3 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) {
      els.push({
        type: 'poly',
        shape: shapes[Math.floor(rng() * shapes.length)]!,
        x: rng01(rng, 0.24, 0.76),
        y: rng01(rng, 0.18, 0.56),
        w: rng01(rng, 0.12, 0.34),
        h: rng01(rng, 0.12, 0.34),
        rotation: Math.floor(rng01(rng, -24, 24)),
        fill: a[i % a.length]!,
        ...(i > 0 ? { opacity: rng01(rng, 0.7, 1) } : {}),
      });
    }
    return els;
  },
];

/**
 * SURPRISE ME — deal a coherent, free-tier start card (CARD-16; non-idempotent by default). Pure given
 * `rng` (defaults to Math.random for the app) — inject a seeded source to unit-test the invariants.
 */
export function surpriseDeal(gameTitle: string, rng: () => number = Math.random): CardComposition {
  const fam = PALETTES[Math.floor(rng() * PALETTES.length)]!;
  const archetype = ARCHETYPES[Math.floor(rng() * ARCHETYPES.length)]!;
  const elements = archetype(fam.accents, fam.gradient, rng);
  // keep the family's chrome (free) but jitter the effect intensity so two same-family deals differ
  const effect = fam.effect ? { kind: fam.effect.kind, intensity: clamp01(fam.effect.intensity + rng01(rng, -0.1, 0.1), 0.2, 0.9) } : undefined;
  const withEffect: PaletteFamily = { ...fam, effect };
  return composeFromFamily(withEffect, elements, gameTitle);
}
