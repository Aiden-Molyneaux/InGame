// COSM-03/ECON-01 cosmetic pricing config (M5 P4 — decision 0072/0073; the roster tiering, decision
// 0075, P10). SYS-04-tunable, config-not-schema, mirroring `config/economy.ts` (the floor/grant
// anchors) and `config/rate-limits.ts` (the override/clear test-escape-hatch pattern). Three concerns
// live here:
//
//  1. THE 7-TIER LADDER (decision 0072 ruling 2) — tier name → PX price. Fixed, product-ruled.
//  2. THE REAL ROSTER CATALOG (decision 0075, P10) — every real cosmetic item (free + premium) across
//     frames/effects/finishes/nameplates/fonts + device shells/screen themes, id-matched to the client
//     rosters (`apps/mobile/src/styler/roster.ts` + `theme/palettes.ts`) — one id space, no synthetic
//     namespacing (ids are the SAME bare strings the client roster uses: `'thin-gold'`, `'bitter'`,
//     `'deepsea'`, …), matching what `collectCosmeticRefs` below already extracts from a composition's
//     `fontId`/`iconId` fields. **29 premium items** — 26 at the 0075-amended launch price points
//     (3/6/8 PX) + the three W-5 ULTIMATE SKUs at 10 PX (COSM-05, decision 0080 — `colorCustomizable`
//     colour-freedom designs, minted ALONGSIDE their untouched base designs; tiers 1/2/4 stay
//     launch-empty for the pre-launch content pass). Free items are NOT
//     registered in the tier lookup (`REAL_ROSTER`, premium-only — see `lookupCosmeticTier`) but DO
//     appear in `COSMETIC_CATALOG` (the GET /cosmetics library needs the full free+premium listing).
//     **Two 0075 removals** — BRACKETS frame (`bracket-corners`) + SUBTLE GLOSS finish
//     (`subtle-gloss`) — are absent from `COSMETIC_CATALOG` entirely (never offered again); the
//     renderer (`render/buildCard.ts`) and the composition schema's `kind` unions keep them for
//     legacy-document rendering (the retired `pixel-border`/`grain` precedent) — only the roster
//     listing drops them.
//  3. THE TEST-FIXTURE REGISTRY — a separate, mutable map for integration-test fixture ids
//     (`registerCosmeticForTest`), cleared between test cases via `clearCosmeticRegistryForTest`. Kept
//     SEPARATE from the real roster (`REAL_ROSTER`, below) so clearing fixtures between tests can never
//     wipe the real seed — `lookupCosmeticTier` checks the real roster FIRST, the fixture registry
//     second. Fixture ids are always synthetic (`fix-*`, `p3-*`, …), never real roster ids.
//
// The DB-backed `cosmetic_items` GLOBAL table reserved on the F32 manifest (packages/shared) remains a
// FUTURE follow-up, not this pass's concern (per the file's prior banner) — this static config is the
// provisional mechanism both P4 and P10 were scoped to build against; swapping it for a DB-backed
// catalog is a same-shaped follow-up (the function signatures here are the seam).

export const COSMETIC_TIERS = [
  'accent',
  'trim',
  'standard',
  'deluxe',
  'big',
  'showpiece',
  'ultimate',
] as const;
export type CosmeticTier = (typeof COSMETIC_TIERS)[number];

/** The decision-0072 launch ladder (PX). Base rate 5 PX/$ — see product-spec ECON-01. */
export const TIER_PRICES: Record<CosmeticTier, number> = {
  accent: 1,
  trim: 2,
  standard: 3,
  deluxe: 4,
  big: 6,
  showpiece: 8,
  ultimate: 10,
};

/** The PX price for a tier; a registered-free item (`null`/`undefined` tier) costs 0. */
export function priceForTier(tier: CosmeticTier | null | undefined): number {
  return tier ? TIER_PRICES[tier] : 0;
}

// ── The real roster catalog (decision 0075 — P10) ───────────────────────────────────────────────────
// `null` tier = free (registered-and-owned-by-everyone, zero price); a `CosmeticTier` = premium at that
// tier's PX price. The 0075-amended launch prices land only on `standard` (3) · `big` (6) ·
// `showpiece` (8) — tiers 1/2/4/10 stay real-but-empty seed vocabulary (SYS-08) until the pre-launch
// content pass. Order mirrors the 0075 tiering block (frames → effects → finishes → nameplates → fonts
// → device shells → screen themes).
export type CosmeticType =
  | 'frame'
  | 'effect'
  | 'finish'
  | 'nameplate'
  | 'font'
  | 'device_shell'
  | 'screen_theme'
  | 'shell_sticker_pack';

export interface CosmeticCatalogEntry {
  id: string;
  type: CosmeticType;
  name: string;
  tier: CosmeticTier | null; // null = free
  /** COSM-05 (M6 W-5, decision 0080) — the per-design colour-freedom flag: the owner picks this
   *  design's colour in the editor (frame.color / nameplate.plate / nameplate.ink), stored in the
   *  composition (CARD-12 precedent) and baked at flatten. Registry metadata like `tier`; present
   *  (`true`) only on the Ultimate designs — the flag and the `ultimate` tier travel together at
   *  launch, but the registry deliberately does not enforce the pairing (a future earned/ACH-04
   *  colour-customizable prestige item stays possible). */
  colorCustomizable?: true;
}

export const COSMETIC_CATALOG: CosmeticCatalogEntry[] = [
  // ── Frames (0075 — free 7 · premium 6@standard · premium 1@showpiece · W-5 +1@ultimate; BRACKETS removed) ──
  { id: 'clean', type: 'frame', name: 'CLEAN', tier: null },
  { id: 'thin-line', type: 'frame', name: 'LINE', tier: null },
  { id: 'double-line', type: 'frame', name: 'DOUBLE LINE', tier: null },
  { id: 'ticket-notch', type: 'frame', name: 'TICKET', tier: null },
  { id: 'stub', type: 'frame', name: 'STUB', tier: null },
  { id: 'lime', type: 'frame', name: 'LIME', tier: null },
  { id: 'bubblegum', type: 'frame', name: 'BUBBLEGUM', tier: null },
  { id: 'thin-gold', type: 'frame', name: 'GOLD', tier: 'standard' },
  { id: 'chrome', type: 'frame', name: 'CHROME', tier: 'standard' },
  { id: 'ember-glow', type: 'frame', name: 'EMBER GLOW', tier: 'standard' },
  { id: 'plasma', type: 'frame', name: 'PLASMA', tier: 'standard' },
  { id: 'ornate-gold', type: 'frame', name: 'ORNATE GOLD', tier: 'standard' },
  { id: 'holo-foil', type: 'frame', name: 'HOLO FOIL', tier: 'standard' },
  { id: 'marquee', type: 'frame', name: 'MARQUEE', tier: 'showpiece' },
  // W-5 (COSM-05 / decision 0080 ruling 2): the ultimate SKUs are minted as SEPARATE entries ALONGSIDE
  // their base designs — NO promotion, no grandfathering, no price movement. Same render machinery: the
  // ULTIMATE frame rides kind 'marquee' (identity via the explicit composition `cosmeticId`, below).
  { id: 'marquee-ultimate', type: 'frame', name: 'MARQUEE ULTIMATE', tier: 'ultimate', colorCustomizable: true },
  // ── Effects (0075 — free 5 · premium 2@standard · premium 2@showpiece; SCANLINE moved from free) ──
  { id: 'none', type: 'effect', name: 'NONE', tier: null },
  { id: 'soft-glow', type: 'effect', name: 'SOFT GLOW', tier: null },
  { id: 'gradient-sheen', type: 'effect', name: 'SHEEN', tier: null },
  { id: 'dust', type: 'effect', name: 'DUST', tier: null },
  { id: 'vignette', type: 'effect', name: 'VIGNETTE', tier: null },
  { id: 'halftone', type: 'effect', name: 'HALFTONE', tier: 'standard' },
  { id: 'scanline', type: 'effect', name: 'SCANLINE', tier: 'standard' },
  { id: 'frost', type: 'effect', name: 'FROST', tier: 'showpiece' },
  { id: 'embers', type: 'effect', name: 'EMBERS', tier: 'showpiece' },
  // ── Finishes (0075 — free 2 · premium 1@standard · premium 2@showpiece; SUBTLE GLOSS removed) ─────
  // `id:'none'` intentionally repeats the effect NONE's id (each client roster array — EFFECTS vs
  // FINISHES — is independently id-scoped, mirroring `apps/mobile/src/styler/roster.ts`); harmless
  // here too (both free, so neither ever enters `REAL_ROSTER`, and `COSMETIC_CATALOG` disambiguates
  // by `type`).
  { id: 'none', type: 'finish', name: 'STANDARD', tier: null },
  { id: 'matte', type: 'finish', name: 'MATTE', tier: null },
  { id: 'linen', type: 'finish', name: 'LINEN', tier: 'standard' },
  { id: 'holographic', type: 'finish', name: 'HOLOGRAPHIC', tier: 'showpiece' },
  { id: 'metallic', type: 'finish', name: 'METALLIC', tier: 'showpiece' },
  // ── Nameplates (0075 — free 7 · premium 1@standard · W-5 +1@ultimate) ─────────────────────────────
  { id: 'slab', type: 'nameplate', name: 'SLAB', tier: null },
  { id: 'ribbon', type: 'nameplate', name: 'RIBBON', tier: null },
  { id: 'bevel', type: 'nameplate', name: 'BEVEL', tier: null },
  { id: 'capsule', type: 'nameplate', name: 'CAPSULE', tier: null },
  { id: 'tab', type: 'nameplate', name: 'TAB', tier: null },
  { id: 'arch', type: 'nameplate', name: 'ARCH', tier: null },
  { id: 'dogtag', type: 'nameplate', name: 'DOGTAG', tier: null },
  { id: 'brass', type: 'nameplate', name: 'BRASS', tier: 'standard' },
  // W-5 (COSM-05/0080): the metal ramp in any hue — rides plate shape 'brass' (brass-ramp
  // parameterization, render/buildCard.ts); identity via the explicit `cosmeticId`.
  { id: 'brass-ultimate', type: 'nameplate', name: 'BRASS ULTIMATE', tier: 'ultimate', colorCustomizable: true },
  // ── Fonts (0075 amended — free 3 · premium 4@standard · W-5 +1@ultimate) ───────────────────────────
  { id: 'clean-sans', type: 'font', name: 'CHAKRA', tier: null },
  { id: 'bold-display', type: 'font', name: 'PAYTONE', tier: null },
  { id: 'press-start', type: 'font', name: 'PIXEL', tier: null },
  { id: 'bitter', type: 'font', name: 'SLAB', tier: 'standard' },
  { id: 'space-mono', type: 'font', name: 'MONO', tier: 'standard' },
  { id: 'pacifico', type: 'font', name: 'SCRIPT', tier: 'standard' },
  // W-5 (COSM-05/0080): free-pick ink while equipped (the CARD-11/OQ-137 unlock). A font's cosmetic id
  // IS the composition `fontId`, so this SKU carries its own id and reuses the pacifico face client-side.
  { id: 'pacifico-ultimate', type: 'font', name: 'SCRIPT ULTIMATE', tier: 'ultimate', colorCustomizable: true },
  { id: 'stencil', type: 'font', name: 'STENCIL', tier: 'standard' },
  // ── Device shells (0075 — free 2 · premium 2@big · premium 1@showpiece; GRAPE→free, SUNSET→premium) ─
  { id: 'teal', type: 'device_shell', name: 'TEAL', tier: null },
  { id: 'grape', type: 'device_shell', name: 'GRAPE', tier: null },
  { id: 'sunset', type: 'device_shell', name: 'SUNSET', tier: 'big' },
  { id: 'pink', type: 'device_shell', name: 'PINK', tier: 'big' },
  { id: 'carbon', type: 'device_shell', name: 'CARBON', tier: 'showpiece' },
  // ── Screen themes (0075 amended — free 2 · premium 4@big) ──────────────────────────────────────────
  { id: 'midnight', type: 'screen_theme', name: 'MIDNIGHT', tier: null },
  { id: 'paper', type: 'screen_theme', name: 'PAPER', tier: null },
  { id: 'deepsea', type: 'screen_theme', name: 'DEEP SEA', tier: 'big' },
  { id: 'berry', type: 'screen_theme', name: 'BERRY', tier: 'big' },
  { id: 'mint', type: 'screen_theme', name: 'MINT', tier: 'big' },
  { id: 'lilac', type: 'screen_theme', name: 'LILAC', tier: 'big' },
];

/** REAL_ROSTER — the premium-only id→tier map, seeded once at module load from `COSMETIC_CATALOG`.
 *  Always consulted before the mutable test-fixture registry (below) — clearing fixtures between test
 *  cases never wipes the real seed. Free catalog ids are intentionally NOT in this map (they read as
 *  UNREGISTERED/`undefined` via `lookupCosmeticTier`, per the file banner's free/premium contract). */
const REAL_ROSTER = new Map<string, CosmeticTier>(
  COSMETIC_CATALOG.filter((e): e is CosmeticCatalogEntry & { tier: CosmeticTier } => e.tier !== null).map(
    (e) => [e.id, e.tier],
  ),
);

// ── The test-fixture registry (mutable, cleared between test cases) ────────────────────────────────
const REGISTRY = new Map<string, CosmeticTier | null>();

/**
 * Look up a cosmetic's tier. Returns `undefined` when the id is NOT REGISTERED AT ALL (the
 * `NotFoundError` case every acquire path 404s on) — distinct from a registered-but-FREE item, which
 * returns `null` (a known, always-owned, zero-price item; COSM-03 gates only premium items, so a free
 * id never needs an entitlement row). Checks the real roster first, then the test-fixture registry.
 */
export function lookupCosmeticTier(cosmeticId: string): CosmeticTier | null | undefined {
  if (REAL_ROSTER.has(cosmeticId)) return REAL_ROSTER.get(cosmeticId)!;
  return REGISTRY.has(cosmeticId) ? REGISTRY.get(cosmeticId)! : undefined;
}

/** Test-only: register a fixture cosmetic (never a real roster id — see the file banner). */
export function registerCosmeticForTest(cosmeticId: string, tier: CosmeticTier | null): void {
  REGISTRY.set(cosmeticId, tier);
}

/** Test-only: clear all fixture registrations between test cases. Never touches the real roster. */
export function clearCosmeticRegistryForTest(): void {
  REGISTRY.clear();
}

// ── GET /cosmetics — the COSM-01 library listing (decision 0075 — P10) ─────────────────────────────
/** The full catalog (free + premium), optionally filtered by type — the GET /cosmetics data source.
 *  Ownership is caller-scoped and NOT computed here (the service layer joins `user_entitlements`). */
export function listCatalog(type?: CosmeticType): CosmeticCatalogEntry[] {
  return type ? COSMETIC_CATALOG.filter((e) => e.type === type) : COSMETIC_CATALOG;
}

/** COSM-01 type → the human display noun for a ledger `detail` (e.g. `device_shell` → "DEVICE SHELL"). */
export const COSMETIC_TYPE_LABELS: Record<CosmeticType, string> = {
  frame: 'FRAME',
  effect: 'EFFECT',
  finish: 'FINISH',
  nameplate: 'NAMEPLATE',
  font: 'FONT',
  device_shell: 'DEVICE SHELL',
  screen_theme: 'SCREEN THEME',
  shell_sticker_pack: 'STICKER PACK',
};

// The premium-id → catalog-entry index (F-4 ledger honesty). An `acquire` ledger row keys off the bare
// cosmetic id (`refType='cosmetic'`); only PREMIUM items are ever charged/acquired, and premium ids are
// unique across the catalog (REAL_ROSTER), so a bare id resolves to exactly one entry here. Free ids
// (never acquired) are intentionally absent — a lookup miss degrades to the generic label.
const PREMIUM_BY_ID = new Map<string, CosmeticCatalogEntry>(
  COSMETIC_CATALOG.filter((e) => e.tier !== null).map((e) => [e.id, e]),
);

/** The display `{ name, type }` for an acquired (premium) cosmetic id, or `undefined` if unknown. */
export function lookupCosmeticDisplay(cosmeticId: string): { name: string; type: string } | undefined {
  const entry = PREMIUM_BY_ID.get(cosmeticId);
  return entry ? { name: entry.name, type: COSMETIC_TYPE_LABELS[entry.type] } : undefined;
}

/** The full premium catalog entry (RAW `type` + `name`) for a cosmetic id — the M5 F-9 E2 `components`
 *  metadata source (the client needs the raw COSM-01 type to draw the CosmeticSwatch). `undefined` for a
 *  non-premium / unknown id. */
export function lookupCosmeticEntry(cosmeticId: string): CosmeticCatalogEntry | undefined {
  return PREMIUM_BY_ID.get(cosmeticId);
}

// ── The featured storefront (M5 F-6 — the board P1 "NEW THIS WEEK" grid) ───────────────────────────────
// A SYS-04-tunable seed: six premium ids, one per showy category, emphasizing the showpieces so the
// storefront leads with the best. Order = display order in the 3-up grid. These are the SAME roster ids
// the client rosters use (no synthetic namespacing); each is premium (a tier), so GET /store computes
// `owned` from the caller's entitlements exactly as GET /cosmetics does. Tunable — swap ids to re-curate
// the featured shelf; the pre-launch content pass owns ECON-08 seasonal drops (a separate surface).
export const FEATURED_COSMETICS: readonly string[] = [
  'marquee', // FRAME · showpiece — the animated marquee band
  'frost', // EFFECT · showpiece — the frost sweep
  'holographic', // FINISH · showpiece — the rainbow foil
  'brass', // NAMEPLATE · standard — the brass plate
  'carbon', // DEVICE SHELL · showpiece — the carbon body
  'berry', // SCREEN THEME · big — the berry palette
];

/** The featured catalog entries in display order (M5 F-6). Any id absent from the catalog is skipped —
 *  the seed degrades gracefully rather than surfacing a phantom item. */
export function listFeaturedCatalog(): CosmeticCatalogEntry[] {
  return FEATURED_COSMETICS.map((id) => PREMIUM_BY_ID.get(id)).filter(
    (e): e is CosmeticCatalogEntry => e != null,
  );
}

// ── CARD-06 derivation support (M5 P7 — the CLOSED-ATTRIBUTE extension) ──────────────────────────────
// A composition's CLOSED attributes are `kind`/`shape`-keyed (render/composition.ts). For EFFECT,
// FINISH and NAMEPLATE the kind/shape string IS the roster id one-for-one (`'frost'`, `'linen'`,
// `'brass'` — the client roster.ts EFFECTS/FINISHES/NAMEPLATES arrays use the same bare strings), so
// the kind can be pushed straight into the ref list: a free kind is simply UNREGISTERED (→ `undefined`,
// harmless) and a premium kind resolves to its tier. FRAMES are the one exception — the composition
// `frame.kind` is NOT the id (multiple roster ids share a kind, disambiguated by `color`: e.g. the free
// `thin-line` and the premium `thin-gold` both render kind `'thin-line'`), so a frame is resolved via a
// small kind+color index mirroring roster.ts's premium FRAMES (kind+color, never kind alone). A frame
// with NO explicit `kind` is a legacy/pre-roster document (the AURORA sample, the CARD-18 default) and
// stays free. The `style_presets` `.style` shape carries the ids DIRECTLY (`frameId`/`effect.id`/
// `finishId`/`nameplateId`/`title.fontId`) — those are read verbatim. `fontId` (text elements + the
// nameplate) and `iconId` (icon elements) carry real ids in both shapes. One id space throughout — a
// derived id is also a valid acquire target (no synthetic namespacing).

// Premium FRAMES, keyed by (composition kind, color) — mirrors apps/mobile/src/styler/roster.ts FRAMES
// premium rows. The one closed attribute whose composition `kind` is not the roster id.
const PREMIUM_FRAMES: ReadonlyArray<{ id: string; kind: string; color: string }> = [
  { id: 'thin-gold', kind: 'thin-line', color: '#e8c14a' },
  { id: 'chrome', kind: 'double-line', color: '#d8d5ec' },
  { id: 'ornate-gold', kind: 'ornate', color: '#e8c14a' },
  { id: 'ember-glow', kind: 'glow', color: '#ff5a5a' },
  { id: 'plasma', kind: 'glow', color: '#5ad0ff' },
  { id: 'holo-foil', kind: 'foil', color: '#e85ad0' },
  { id: 'marquee', kind: 'marquee', color: '#e8c14a' },
];
// Kinds that ALSO have a free roster variant — for these, only an EXACT color match reads premium (a
// plain `thin-line`/`double-line` in any other tone is the free frame). The all-premium kinds
// (`ornate`/`glow`/`foil`/`marquee`) read premium regardless of a recolor, resolving to their first id.
const FREE_VARIANT_FRAME_KINDS = new Set(['thin-line', 'double-line', 'ticket-notch']);

/** Resolve a composition `frame` closed attribute to its premium roster id, or `undefined` if free. */
function resolveFrameCosmeticId(frame: Record<string, unknown>): string | undefined {
  if (typeof frame.kind !== 'string') return undefined; // kindless = legacy/pre-roster document → free
  const kind = frame.kind;
  const color = typeof frame.color === 'string' ? frame.color.toLowerCase() : '';
  const ofKind = PREMIUM_FRAMES.filter((f) => f.kind === kind);
  if (ofKind.length === 0) return undefined; // no premium frame of this kind → free
  const exact = ofKind.find((f) => f.color.toLowerCase() === color);
  if (exact) return exact.id;
  return FREE_VARIANT_FRAME_KINDS.has(kind) ? undefined : ofKind[0]!.id;
}

// ── COSM-05 (M6 W-5, decision 0080) — the explicit composition `cosmeticId` + the colour-force
// backstop ─────────────────────────────────────────────────────────────────────────────────────────
// A frame/nameplate closed attribute MAY carry an optional additive `cosmeticId` (schemaVersion 1,
// the `.passthrough()` envelope — the F21 rule), written by the Styler when an ULTIMATE design is
// applied. It is trusted ONLY after registry validation — the id must exist, be premium, sit on the
// right layer, and its render kind/shape must match the attribute — else colour-inference stands
// (`resolveFrameCosmeticId` / the shape ref). This makes premium identity COLOUR-INDEPENDENT: a
// freely-recoloured ultimate design can never silently read as FREE (frames) or as its base SKU.

/** The render kind each explicit-id-capable FRAME cosmetic draws — PREMIUM_FRAMES + the ultimate
 *  SKU(s), which share their base design's kind (0080: same render machinery, separate identity). */
const FRAME_KIND_BY_ID = new Map<string, string>([
  ...PREMIUM_FRAMES.map((f): [string, string] => [f.id, f.kind]),
  ['marquee-ultimate', 'marquee'],
]);

/** The plate shape each explicit-id-capable NAMEPLATE cosmetic draws. */
const NAMEPLATE_SHAPE_BY_ID = new Map<string, string>([
  ['brass', 'brass'],
  ['brass-ultimate', 'brass'],
]);

// FAIL-LOUD completeness floor (Murr W-5 audit): every colorCustomizable frame/nameplate SKU MUST have
// its render-kind/shape mapping, or resolveExplicitCosmeticId silently rejects the id and the design
// degrades to its base identity (wrong price, wrong label) with no test tripping. A miss here is a
// registry-authoring bug — refuse to boot rather than mis-sell a 10-PX SKU.
for (const entry of PREMIUM_BY_ID.values()) {
  if (entry.colorCustomizable !== true) continue;
  if (entry.type === 'frame' && !FRAME_KIND_BY_ID.has(entry.id))
    throw new Error(`cosmetics registry: colorCustomizable frame '${entry.id}' missing from FRAME_KIND_BY_ID`);
  if (entry.type === 'nameplate' && !NAMEPLATE_SHAPE_BY_ID.has(entry.id))
    throw new Error(`cosmetics registry: colorCustomizable nameplate '${entry.id}' missing from NAMEPLATE_SHAPE_BY_ID`);
}

/** COSM-05 — is this cosmetic id a colour-customizable (Ultimate) design? Unknown/free ids → false. */
export function isColorCustomizable(cosmeticId: string): boolean {
  return PREMIUM_BY_ID.get(cosmeticId)?.colorCustomizable === true;
}

/**
 * COSM-05 — validate + resolve a closed attribute's explicit `cosmeticId`. Returns the id when it is
 * a registered PREMIUM cosmetic of the right type whose render kind/shape matches the attribute;
 * `undefined` otherwise (the caller falls back to colour-inference — never trusted blind).
 */
export function resolveExplicitCosmeticId(
  layer: 'frame' | 'nameplate',
  attrs: Record<string, unknown>,
): string | undefined {
  const id = attrs.cosmeticId;
  if (typeof id !== 'string' || id.length === 0) return undefined;
  const entry = PREMIUM_BY_ID.get(id);
  if (!entry || entry.type !== layer) return undefined;
  if (layer === 'frame') {
    return typeof attrs.kind === 'string' && FRAME_KIND_BY_ID.get(id) === attrs.kind ? id : undefined;
  }
  return typeof attrs.shape === 'string' && NAMEPLATE_SHAPE_BY_ID.get(id) === attrs.shape ? id : undefined;
}

// The REGISTRY colour per premium design — what the flatten backstop forces a recoloured NON-flagged
// premium layer back to. Frames come from PREMIUM_FRAMES; BRASS is the hard-coded ramp's base stop
// (render/buildCard.ts BRASS_RAMP[1] — the draft's "the current gold = the ramp of #c9971f").
const FRAME_REGISTRY_COLOR_BY_ID = new Map<string, string>(PREMIUM_FRAMES.map((f) => [f.id, f.color]));
const NAMEPLATE_REGISTRY_COLOR_BY_ID = new Map<string, string>([['brass', '#c9971f']]);

// The CARD-11 curated title-ink set — MIRRORS apps/mobile/src/styler/roster.ts INKS (colors only;
// candidate for a packages/shared lift alongside BRASS_RAMP, see the W-5 debt note). The flatten
// backstop holds non-ultimate compositions to this set: free-pick ink is EXACTLY what the 10-PX
// colorCustomizable font sells (COSM-05), so an off-list ink under a non-flagged font is a smuggle.
const CURATED_INK_COLORS = new Set(
  ['#f3ecd9', '#14121f', '#e8c14a', '#e85ad0', '#7ad0e8', '#a8c980'].map((c) => c.toLowerCase()),
);
/** The forced fallback for a smuggled off-list ink — CREAM, the roster's default/first ink. */
const DEFAULT_INK_COLOR = '#f3ecd9';

/**
 * COSM-05 (the CARD-11 title-force precedent) — the server-flatten COLOUR-FORCE BACKSTOP: overwrite
 * the layer colour of any premium design that is NOT `colorCustomizable` with its registry value, so a
 * hand-crafted composition can never ship a recoloured non-ultimate premium design. Free designs are
 * untouched (free kinds tolerate arbitrary colours — they simply read as the free variant); flagged
 * (Ultimate) designs are untouched (colour freedom is the entitlement working). INK (COSM-05, Murr
 * W-5 fix): unless the equipped FONT design (`fontId` — the roster id one-for-one) is
 * colorCustomizable, the title ink is held to the CARD-11 curated set — off-list ink forces to
 * CREAM, because free-pick ink IS the SCRIPT-ULTIMATE entitlement and must not ship un-bought.
 * Pure + non-mutating; returns the SAME reference when nothing needed forcing.
 */
export function forceRegistryColors(composition: Record<string, unknown>): Record<string, unknown> {
  let out = composition;

  const frame = composition.frame;
  if (frame && typeof frame === 'object') {
    const attrs = frame as Record<string, unknown>;
    const id = resolveExplicitCosmeticId('frame', attrs) ?? resolveFrameCosmeticId(attrs);
    if (id && !isColorCustomizable(id)) {
      const registry = FRAME_REGISTRY_COLOR_BY_ID.get(id);
      const current = typeof attrs.color === 'string' ? attrs.color.toLowerCase() : '';
      if (registry && current !== registry.toLowerCase()) {
        out = { ...out, frame: { ...attrs, color: registry } };
      }
    }
  }

  const nameplate = composition.nameplate;
  if (nameplate && typeof nameplate === 'object') {
    const attrs = nameplate as Record<string, unknown>;
    let forced: Record<string, unknown> | null = null;

    const shape = typeof attrs.shape === 'string' ? attrs.shape : 'slab';
    const id = resolveExplicitCosmeticId('nameplate', attrs) ?? shape;
    if (!isColorCustomizable(id)) {
      const registry = NAMEPLATE_REGISTRY_COLOR_BY_ID.get(id);
      const current = typeof attrs.plate === 'string' ? attrs.plate.toLowerCase() : '';
      if (registry && current !== registry.toLowerCase()) {
        forced = { ...attrs, plate: registry };
      }
    }

    // The INK half of the backstop — gated on the FONT design's flag, not the plate's (they are
    // separate cosmetics sharing the layer; fontId is explicit identity, no inference needed).
    const fontId = typeof attrs.fontId === 'string' ? attrs.fontId : 'clean-sans';
    const ink = typeof attrs.ink === 'string' ? attrs.ink.toLowerCase() : undefined;
    if (ink !== undefined && !isColorCustomizable(fontId) && !CURATED_INK_COLORS.has(ink)) {
      forced = { ...(forced ?? attrs), ink: DEFAULT_INK_COLOR };
    }

    if (forced) out = { ...out, nameplate: forced };
  }

  return out;
}

interface ComposedRefShape {
  // composition shape
  elements?: Array<Record<string, unknown>>;
  frame?: Record<string, unknown>;
  effect?: Record<string, unknown>;
  finish?: Record<string, unknown>;
  nameplate?: Record<string, unknown>;
  // style_presets `.style` shape (ids carried directly)
  frameId?: unknown;
  finishId?: unknown;
  nameplateId?: unknown;
  title?: Record<string, unknown>;
}

/** The cosmeticIds a composition (or a style_presets `.style`) references — id-bearing + closed. */
export function collectCosmeticRefs(composition: unknown): string[] {
  const c = (composition ?? {}) as ComposedRefShape;
  const refs: string[] = [];
  // — vector elements (id-bearing since M4) —
  for (const el of c.elements ?? []) {
    if (!el || typeof el !== 'object') continue;
    if (el.type === 'icon' && typeof el.iconId === 'string') refs.push(el.iconId);
    if (el.type === 'text' && typeof el.fontId === 'string') refs.push(el.fontId);
  }
  // — composition CLOSED attributes (kind/shape = id, except frame = kind+color) —
  // COSM-05: a validated explicit `cosmeticId` WINS over colour-inference (colour-independent
  // identity for the ultimate designs); an invalid/mismatched one falls back to inference.
  if (c.frame && typeof c.frame === 'object') {
    const id = resolveExplicitCosmeticId('frame', c.frame) ?? resolveFrameCosmeticId(c.frame);
    if (id) refs.push(id);
  }
  if (c.effect && typeof c.effect === 'object') {
    const e = c.effect as Record<string, unknown>;
    if (typeof e.kind === 'string') refs.push(e.kind); // composition effect
    if (typeof e.id === 'string') refs.push(e.id); // style_presets effect
  }
  if (c.finish && typeof c.finish === 'object') {
    const f = c.finish as Record<string, unknown>;
    if (typeof f.kind === 'string') refs.push(f.kind);
  }
  if (c.nameplate && typeof c.nameplate === 'object') {
    // COSM-05: a validated explicit plate `cosmeticId` REPLACES the shape ref (one design, one id —
    // an ultimate plate must never also read as its base SKU); else the shape IS the id (banner rule).
    const plateId = resolveExplicitCosmeticId('nameplate', c.nameplate);
    if (plateId) refs.push(plateId);
    else if (typeof c.nameplate.shape === 'string') refs.push(c.nameplate.shape); // composition plate shape
    if (typeof c.nameplate.fontId === 'string') refs.push(c.nameplate.fontId);
  }
  // — style_presets `.style` ids (carried directly) —
  if (typeof c.frameId === 'string') refs.push(c.frameId);
  if (typeof c.finishId === 'string') refs.push(c.finishId);
  if (typeof c.nameplateId === 'string') refs.push(c.nameplateId);
  if (c.title && typeof c.title === 'object' && typeof c.title.fontId === 'string') {
    refs.push(c.title.fontId);
  }
  return refs;
}

/** CARD-06 — true iff the composition references any REGISTERED PREMIUM cosmetic id. */
export function isPremiumComposition(composition: unknown): boolean {
  return collectCosmeticRefs(composition).some((id) => {
    const tier = lookupCosmeticTier(id);
    return tier !== undefined && tier !== null;
  });
}

// ── CARD-22 equipped-readout label support (M6 P2 — OQ-146 / decision 0076 §0.2) ─────────────────────
// The DISPLAY LABEL for each equipped slot (free + premium), resolved from the FULL catalog. For
// EFFECT / FINISH / NAMEPLATE / FONT the composition kind/shape/fontId IS the catalog id one-for-one
// (the file banner's contract), so a `(type, id)` lookup resolves the roster name directly — the
// effect/finish `none` collision is disambiguated by `type` (effect NONE vs finish STANDARD). FRAMES
// are the one exception (kind+color, never the id) — resolved via the full FRAME_ROSTER below.

/** The full-catalog name index by `${type}:${id}` — the CARD-22 label source (free + premium). */
const CATALOG_NAME_BY_TYPE_ID = new Map<string, string>(
  COSMETIC_CATALOG.map((e) => [`${e.type}:${e.id}`, e.name]),
);

/** The roster display name for a `(type, id)` cosmetic — free OR premium — or `undefined` if unknown. */
export function lookupCatalogName(type: CosmeticType, id: string): string | undefined {
  return CATALOG_NAME_BY_TYPE_ID.get(`${type}:${id}`);
}

// The FULL frame roster (kind+color → id) mirroring apps/mobile/src/styler/roster.ts FRAMES — the one
// closed attribute whose composition (kind, color) is NOT the roster id (PREMIUM_FRAMES above is the
// premium-only subset for `collectCosmeticRefs`; this is the complete free+premium set the CARD-22
// label needs). Kept in step with roster.ts. `clean` (kind null / no frame) is intentionally omitted —
// a composition with no `frame` reads as CLEAN below.
const FRAME_ROSTER: ReadonlyArray<{ id: string; kind: string; color: string }> = [
  { id: 'thin-line', kind: 'thin-line', color: '#c9c5e6' },
  { id: 'double-line', kind: 'double-line', color: '#9b97c0' },
  { id: 'ticket-notch', kind: 'ticket-notch', color: '#f3ecd9' },
  { id: 'thin-gold', kind: 'thin-line', color: '#e8c14a' },
  { id: 'lime', kind: 'thin-line', color: '#a9e34b' },
  { id: 'bubblegum', kind: 'thin-line', color: '#e85ad0' },
  { id: 'chrome', kind: 'double-line', color: '#d8d5ec' },
  { id: 'stub', kind: 'ticket-notch', color: '#ff9f43' },
  { id: 'ornate-gold', kind: 'ornate', color: '#e8c14a' },
  { id: 'ember-glow', kind: 'glow', color: '#ff5a5a' },
  { id: 'plasma', kind: 'glow', color: '#5ad0ff' },
  { id: 'holo-foil', kind: 'foil', color: '#e85ad0' },
  { id: 'marquee', kind: 'marquee', color: '#e8c14a' },
];

/**
 * The CARD-22 display label for a composition `frame` closed attribute (free or premium). NO `frame`
 * object → "CLEAN" (the default face / no border). A frame that IS present but carries no explicit
 * `kind` defaults to `thin-line` (the renderer's documented default — a kindless legacy/spike frame
 * still draws a thin border in its `color`). An exact (kind, color) match → that roster name; a
 * recolored variant → the first roster frame of that kind (its base name); an unknown kind → the
 * upper-cased kind (degrade, never a crash).
 */
export function frameLabelFor(frame: Record<string, unknown> | undefined): string {
  if (!frame || typeof frame !== 'object') return 'CLEAN';
  const kind = typeof frame.kind === 'string' ? frame.kind : 'thin-line';
  const color = typeof frame.color === 'string' ? frame.color.toLowerCase() : '';
  const ofKind = FRAME_ROSTER.filter((f) => f.kind === kind);
  const exact = ofKind.find((f) => f.color.toLowerCase() === color);
  const id = (exact ?? ofKind[0])?.id;
  if (!id) return kind.toUpperCase().replace(/-/g, ' ');
  return lookupCatalogName('frame', id) ?? kind.toUpperCase().replace(/-/g, ' ');
}
