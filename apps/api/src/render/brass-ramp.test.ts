import { describe, it, expect } from 'vitest';
import { BRASS_RAMP, brassPlateRamp, buildCardElements } from './buildCard';
import { COMPOSITION_SCHEMA_VERSION } from '@ingame/shared';
import type { CardComposition } from './composition';

// M6 W-5 (COSM-05 / decision 0080) — the ONE real render change of the ultimate-cosmetics draft:
// the brass plate's hard-coded gold gradient is parameterized from `nameplate.plate` — but ONLY for a
// document that carries the new explicit `cosmeticId` colour signal (the ultimate write-path). Every
// pre-W5 document (the old renderer IGNORED plateColor for brass, so legacy plates carry the untouched
// '#141026' styler default) must render the IDENTICAL legacy gold ramp. Structural assertions with the
// thumb-plate stub-ctx pattern. Tags: COSM-05, CARD-15.
/* eslint-disable @typescript-eslint/no-explicit-any */
const stubCtx = {
  Group: 'Group',
  Fill: 'Fill',
  Rect: 'Rect',
  Oval: 'Oval',
  Path: 'Path',
  Text: 'Text',
  LinearGradient: 'LinearGradient',
  Skia: {
    Path: {
      Make: () => ({ moveTo() {}, lineTo() {}, close() {} }),
      MakeFromSVGString: (d: string) => ({ svg: d }),
    },
    Font: () => ({}),
  },
  typeface: undefined,
} as any;

const LEGACY_STOPS = ['#f6d879', '#c9971f', '#8a6410'];

function brassComp(nameplate: Record<string, unknown>): CardComposition {
  return {
    schemaVersion: COMPOSITION_SCHEMA_VERSION,
    base: { fill: '#0e0b1e' },
    elements: [],
    nameplate: { shape: 'brass', title: 'X', plate: '#141026', ink: '#f3ecd9', size: 0.05, ...nameplate },
  } as unknown as CardComposition;
}

/** The brass plate Rect's LinearGradient colors out of the built tree. */
function plateGradientColors(c: CardComposition): string[] {
  const tree = buildCardElements(c, 672, 939, stubCtx) as any;
  const plateGroup = (tree.props.children as any[]).filter(Boolean).find((k) => k?.key === 'plate');
  expect(plateGroup, 'plate group').toBeTruthy();
  const plateRect = (plateGroup.props.children as any[]).filter(Boolean).find((k) => k?.key === 'plate');
  expect(plateRect, 'plate rect').toBeTruthy();
  const gradient = plateRect.props.children;
  return gradient.props.colors as string[];
}

describe('COSM-05/CARD-15: the brass ramp — parameterized, legacy pixel-identical', () => {
  it('BRASS_RAMP is the legacy hard-coded gold, and brassPlateRamp of the registry gold returns it EXACTLY', () => {
    expect([...BRASS_RAMP]).toEqual(LEGACY_STOPS);
    expect(brassPlateRamp('#c9971f')).toEqual(LEGACY_STOPS);
    expect(brassPlateRamp('#C9971F')).toEqual(LEGACY_STOPS); // case-insensitive — same colour, same ramp
  });

  it('a LEGACY brass document (no cosmeticId; the ignored default plate) renders the identical gold ramp', () => {
    expect(plateGradientColors(brassComp({}))).toEqual(LEGACY_STOPS);
    // the old renderer ignored plateColor entirely — ANY legacy plate value keeps the gold
    expect(plateGradientColors(brassComp({ plate: '#8a2be2' }))).toEqual(LEGACY_STOPS);
  });

  it('an ULTIMATE brass document (cosmeticId present) derives the ramp from the chosen plate colour', () => {
    const colors = plateGradientColors(brassComp({ cosmeticId: 'brass-ultimate', plate: '#8a2be2' }));
    expect(colors).toEqual(brassPlateRamp('#8a2be2'));
    expect(colors).not.toEqual(LEGACY_STOPS);
    expect(colors[1]).toBe('#8a2be2'); // base stop = the chosen colour
  });

  it('an ultimate brass at the registry default gold renders pixel-identical to legacy brass', () => {
    expect(plateGradientColors(brassComp({ cosmeticId: 'brass-ultimate', plate: '#c9971f' }))).toEqual(LEGACY_STOPS);
  });

  it('brassPlateRamp is a pure lighten/base/darken derivation for any custom colour', () => {
    const [light, base, dark] = brassPlateRamp('#8a2be2');
    expect(base).toBe('#8a2be2');
    expect(light).toMatch(/^#[0-9a-f]{6}$/);
    expect(dark).toMatch(/^#[0-9a-f]{6}$/);
    // deterministic
    expect(brassPlateRamp('#8a2be2')).toEqual(brassPlateRamp('#8a2be2'));
  });
});
