import type { StylePresetStyle } from '@ingame/shared';
import type { CardComposition } from '../render/composition';
import { EFFECTS, FINISHES, FRAMES, NAMEPLATES } from './roster';
import { explicitFrameRosterId, explicitPlateRosterId } from './premium';

// CARD-24b preset recipe ⇄ composition mapping (extracted from app/styler/[gameId].tsx for W-5 so the
// COSM-05 ultimate-design identity rules are unit-testable beside premium.ts). The preset `style`
// carries ROSTER IDS (+ title font/ink) — never the whole composition — so an ultimate design rides a
// preset by ID: `frameId`/`nameplateId` = the ultimate SKU id (derived cosmeticId-first, the COSM-05
// colour-independent rule). The owner's CUSTOM hue rides the additive `frameColor`/`plateColor`
// fields (api-contract 0.77 — added closing the P2 seam gap): derive writes them only off a VALIDATED
// ultimate layer; apply honours them only onto a colorCustomizable roster row (a hand-crafted colour
// on a non-ultimate id is ignored here and force-corrected at flatten anyway). `title.ink` carries a
// free-picked ink verbatim as before (already a colour field).

/** Apply a CARD-24b preset recipe onto a base composition (the BaseRail preset entries). */
export function presetToComposition(style: StylePresetStyle, base: CardComposition): CardComposition {
  const next: CardComposition = { ...base };
  const frame = style.frameId ? FRAMES.find((f) => f.id === style.frameId) : undefined;
  if (frame?.kind) {
    next.frame = frame.colorCustomizable
      ? // COSM-05: an ultimate frame re-applies with its explicit identity + the SNAPSHOTTED custom
        // hue (falling back to the registry default when the preset predates the colour fields)
        { kind: frame.kind, color: style.frameColor ?? frame.color, width: frame.width, cosmeticId: frame.id }
      : { kind: frame.kind, color: frame.color, width: frame.width };
  }
  const effect = style.effect ? EFFECTS.find((e) => e.id === style.effect!.id) : undefined;
  if (effect && effect.kind !== 'none') next.effect = { kind: effect.kind, intensity: style.effect!.intensity };
  const finish = style.finishId ? FINISHES.find((f) => f.id === style.finishId) : undefined;
  if (finish && finish.kind !== 'none') next.finish = { kind: finish.kind };
  const plateDef = style.nameplateId ? NAMEPLATES.find((p) => p.id === style.nameplateId) : undefined;
  if (next.nameplate && plateDef?.shape) {
    next.nameplate =
      plateDef.colorCustomizable && plateDef.plateSeed
        ? // COSM-05: an ultimate plate re-applies with its identity + the snapshotted hue (registry
          // seed when the preset predates the colour fields)
          { ...next.nameplate, shape: plateDef.shape, cosmeticId: plateDef.id, plate: style.plateColor ?? plateDef.plateSeed }
        : { ...next.nameplate, shape: plateDef.shape };
  }
  if (next.nameplate && style.title) {
    next.nameplate = { ...next.nameplate, fontId: style.title.fontId, ink: style.title.ink };
  }
  return next;
}

/** Derive the CARD-24b recipe from the draft's closed attributes (the SAVE-AS-PRESET write). */
export function draftToPresetStyle(d: CardComposition): StylePresetStyle {
  const style: StylePresetStyle = {};
  if (d.frame?.kind) {
    // COSM-05: a validated explicit `cosmeticId` wins — a recoloured MARQUEE ULTIMATE must snapshot
    // as ITSELF, never fall back to base MARQUEE. Else kind+color so a preset derived from THIN GOLD
    // doesn't resolve to THIN LINE (decision 0068).
    const explicitId = explicitFrameRosterId(d.frame);
    const f =
      (explicitId ? FRAMES.find((x) => x.id === explicitId) : undefined) ??
      // case-insensitive, mirroring premium.ts/the server (Murr W-5 MED — one compare rule everywhere)
      FRAMES.find(
        (x) => x.kind === d.frame!.kind && x.color.toLowerCase() === (typeof d.frame!.color === 'string' ? d.frame!.color.toLowerCase() : ''),
      ) ??
      FRAMES.find((x) => x.kind === d.frame!.kind);
    if (f) style.frameId = f.id;
    // COSM-05 colour carry — only off a VALIDATED ultimate layer (explicit id + flagged row).
    if (explicitId && f?.colorCustomizable && typeof d.frame.color === 'string') {
      style.frameColor = d.frame.color;
    }
  }
  if (d.effect && d.effect.kind !== 'none') {
    const e = EFFECTS.find((x) => x.kind === d.effect!.kind);
    if (e) style.effect = { id: e.id, intensity: d.effect.intensity };
  }
  if (d.finish && d.finish.kind !== 'none') {
    const f = FINISHES.find((x) => x.kind === d.finish!.kind);
    if (f) style.finishId = f.id;
  }
  if (d.nameplate) {
    // COSM-05: cosmeticId-first for the same reason (BRASS ULTIMATE never snapshots as BRASS)
    const explicitPlate = explicitPlateRosterId(d.nameplate);
    const p =
      (explicitPlate ? NAMEPLATES.find((x) => x.id === explicitPlate) : undefined) ??
      NAMEPLATES.find((x) => x.shape === (d.nameplate!.shape ?? 'slab'));
    if (p) style.nameplateId = p.id;
    // COSM-05 colour carry — same validated-ultimate gate as the frame.
    if (explicitPlate && p?.colorCustomizable && typeof d.nameplate.plate === 'string') {
      style.plateColor = d.nameplate.plate;
    }
    style.title = { fontId: d.nameplate.fontId ?? 'clean-sans', ink: d.nameplate.ink };
  }
  return style;
}
