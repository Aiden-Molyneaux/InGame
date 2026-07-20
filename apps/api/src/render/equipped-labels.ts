import {
  frameLabelFor,
  lookupCatalogName,
  lookupCosmeticEntry,
  resolveExplicitCosmeticId,
} from '../config/cosmetics';

// CARD-22 / OQ-146 (decision 0076 §0.2, M6 P2) — derive the equipped-readout DISPLAY LABELS from a card
// composition. This is the PUBLISH-TIME snapshot the server denormalizes into `card_designs.equipped_labels`
// (beside `premium_component_ids`), so the CARD-22 readout is computable CROSS-USER (gallery · adopted
// switcher · friend collection · compare) WITHOUT ever reading the private composition downstream (the
// OQ-122 exclusion holds — the composition is read ONCE, at publish, by the OWNER's own publish path).
//
// Pure + deterministic + total (never throws on junk — a malformed field degrades to an omitted slot).
// The closed-attribute shape is render/composition.ts's CardComposition; for EFFECT/FINISH/NAMEPLATE/FONT
// the composition kind/shape/fontId IS the roster id one-for-one (config/cosmetics.ts banner), so a
// (type, id) catalog lookup resolves the name. FRAMES resolve via frameLabelFor (kind+color). BASE has no
// roster id — its label is its FILL TYPE ("GRADIENT" | "SOLID").

const asObject = (v: unknown): Record<string, unknown> | undefined =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : undefined;

/**
 * The CARD-22 per-slot display labels for a composition. Every slot is optional — a slot the card does
 * not set is simply absent from the map. Free slots are included (base/frame/nameplate/font always
 * resolve for a real Styler document; effect/finish appear only when the composition sets them).
 */
export function deriveEquippedLabels(composition: unknown): Record<string, string> {
  const c = asObject(composition);
  if (!c) return {};
  const labels: Record<string, string> = {};

  // BASE — the fill TYPE (no roster id). gradient → "GRADIENT", fill → "SOLID".
  const base = asObject(c.base);
  if (base) {
    if (Array.isArray(base.gradient)) labels.base = 'GRADIENT';
    else if (typeof base.fill === 'string') labels.base = 'SOLID';
  }

  // FRAME — a validated explicit `cosmeticId` wins (COSM-05: ultimate labels resolve
  // colour-independently); else kind+color inference (never the id); no frame object → CLEAN.
  const frame = asObject(c.frame);
  const explicitFrame = frame ? resolveExplicitCosmeticId('frame', frame) : undefined;
  labels.frame = (explicitFrame && lookupCosmeticEntry(explicitFrame)?.name) || frameLabelFor(frame);

  // EFFECT — kind IS the roster id (effect NONE vs finish STANDARD disambiguated by type). Absent → omit.
  const effect = asObject(c.effect);
  if (effect && typeof effect.kind === 'string') {
    const name = lookupCatalogName('effect', effect.kind);
    if (name) labels.effect = name;
  }

  // FINISH — kind IS the roster id. Absent → omit.
  const finish = asObject(c.finish);
  if (finish && typeof finish.kind === 'string') {
    const name = lookupCatalogName('finish', finish.kind);
    if (name) labels.finish = name;
  }

  // NAMEPLATE — the plate SHAPE (id one-for-one; defaults slab) + the title FONT (fontId; defaults
  // clean-sans → CHAKRA). Two distinct readout slots (nameplate = the plate, font = the title face).
  const nameplate = asObject(c.nameplate);
  if (nameplate) {
    // A validated explicit plate `cosmeticId` wins (COSM-05 — a recoloured BRASS ULTIMATE never
    // mislabels as BRASS); else the shape IS the id.
    const shape = typeof nameplate.shape === 'string' ? nameplate.shape : 'slab';
    const explicitPlate = resolveExplicitCosmeticId('nameplate', nameplate);
    const plateName =
      (explicitPlate && lookupCosmeticEntry(explicitPlate)?.name) || lookupCatalogName('nameplate', shape);
    if (plateName) labels.nameplate = plateName;
    const fontId = typeof nameplate.fontId === 'string' ? nameplate.fontId : 'clean-sans';
    const fontName = lookupCatalogName('font', fontId);
    if (fontName) labels.font = fontName;
  }

  return labels;
}
