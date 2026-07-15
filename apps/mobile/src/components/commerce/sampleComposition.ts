import type { CosmeticType } from '@ingame/shared';
import { COMPOSITION_SCHEMA_VERSION, type CardComposition } from '../../render/composition';
import { FRAMES, EFFECTS, FINISHES, NAMEPLATES, DEFAULT_INTENSITY } from '../../styler/roster';

// sampleCompositionWith (M5 F-10 live-inspect, decision 0076) — build the NEUTRAL sample card the store
// item-sheet previews a card cosmetic ON, at full effect, so the shopper sees exactly what they're
// buying (owner device-walk F-10: "when inspected, they don't render at full effect or animation").
// It reuses the editors' composition grammar (the same closed attributes the Styler + the skia render
// module consume) applied to a generic sample — never invented game art (OQ-138 / CosmeticSwatch's
// rule). The base wears NO frame/effect/finish of its own so the ONE previewed cosmetic reads cleanly;
// CardFace(animate) then renders it live (frost shimmers, marquee runs, holographic sweeps — reduce-
// motion falls back to the static keyframe inside the render layer, the house behavior).

// The neutral base — the editors' template vocabulary (star/orb/diamond over a nebula gradient) with a
// generic nameplate, and deliberately no frame/effect/finish/premium font.
const NEUTRAL_BASE: CardComposition = {
  schemaVersion: COMPOSITION_SCHEMA_VERSION,
  base: { gradient: ['#241a4d', '#0e0b1e'] },
  elements: [
    { type: 'poly', shape: 'star', x: 0.5, y: 0.34, w: 0.5, h: 0.5, fill: '#e8c14a' },
    { type: 'ellipse', x: 0.72, y: 0.2, w: 0.13, h: 0.13, fill: '#f3ecd9' },
    { type: 'poly', shape: 'diamond', x: 0.24, y: 0.24, w: 0.1, h: 0.1, rotation: 20, fill: '#7ad0e8' },
    { type: 'rect', x: 0.5, y: 0.6, w: 0.6, h: 0.02, fill: '#e85ad0' },
  ],
  nameplate: { shape: 'slab', fontId: 'clean-sans', title: 'SAMPLE', plate: '#141026', ink: '#f3ecd9', size: 0.05 },
};

/**
 * The neutral sample with the ONE closed attribute for `type`/`id` applied (mirrors CosmeticSwatch's
 * roster dispatch, so the live card and the static swatch agree). Card cosmetics only — device_shell /
 * screen_theme have their own live previews (MiniDevice / the re-themed stage), not a card.
 */
export function sampleCompositionWith(type: CosmeticType, id: string): CardComposition {
  const comp: CardComposition = {
    ...NEUTRAL_BASE,
    elements: [...NEUTRAL_BASE.elements],
    nameplate: { ...NEUTRAL_BASE.nameplate! },
  };
  switch (type) {
    case 'frame': {
      const f = FRAMES.find((x) => x.id === id);
      if (f && f.kind) comp.frame = { kind: f.kind, color: f.color, width: f.width };
      break;
    }
    case 'effect': {
      const e = EFFECTS.find((x) => x.id === id);
      if (e && e.kind !== 'none') comp.effect = { kind: e.kind, intensity: DEFAULT_INTENSITY };
      break;
    }
    case 'finish': {
      const fin = FINISHES.find((x) => x.id === id);
      if (fin && fin.kind !== 'none') comp.finish = { kind: fin.kind };
      break;
    }
    case 'nameplate': {
      const n = NAMEPLATES.find((x) => x.id === id);
      if (n) comp.nameplate = { ...comp.nameplate!, shape: n.shape };
      break;
    }
    case 'font': {
      comp.nameplate = { ...comp.nameplate!, fontId: id };
      break;
    }
    // device_shell / screen_theme never reach here (the store routes them to their own live previews).
    default:
      break;
  }
  return comp;
}

/** The card cosmetic types that get a live CardFace preview (vs the device/theme live previews). */
export function isCardCosmetic(type: CosmeticType): boolean {
  return type === 'frame' || type === 'effect' || type === 'finish' || type === 'nameplate' || type === 'font';
}
