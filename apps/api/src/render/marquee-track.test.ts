import { describe, it, expect } from 'vitest';
import {
  MARQUEE_REGISTRY_COLOR,
  MARQUEE_LEGACY_TRACK,
  marqueeTrackColor,
  buildCardElements,
} from './buildCard';
import { COMPOSITION_SCHEMA_VERSION } from '@ingame/shared';
import type { CardComposition } from './composition';

// M6 walk-4 P1-b — MARQUEE ULTIMATE ignored the picker colour in the RENDER: the frame's static dim
// gilded track was HARD-CODED `#6b5c28`, so recolouring changed only the picker (the owner's bug). The
// fix parameterizes the track from `frame.color` — the SAME trick as the brass ramp: the base/ultimate
// marquee both carry the REGISTRY colour `#e8c14a`, which maps to the legacy `#6b5c28` EXACTLY (pixel-
// identity), so the legacy base marquee renders byte-identical before/after. Any OTHER (recoloured
// ultimate) colour derives a proportionally-dimmed track. Structural assertions via the same stub-ctx
// pattern as brass-ramp.test.ts. Tags: COSM-05, CARD-15.
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

function marqueeComp(color: string): CardComposition {
  return {
    schemaVersion: COMPOSITION_SCHEMA_VERSION,
    base: { fill: '#0e0b1e' },
    elements: [],
    frame: { kind: 'marquee', color, width: 0.024 },
  } as unknown as CardComposition;
}

/** The marquee track band's `color` out of the built tree (the `frame`-keyed stroke Path). */
function marqueeBandColor(c: CardComposition): string {
  const tree = buildCardElements(c, 672, 939, stubCtx) as any;
  const frameNode = (tree.props.children as any[]).filter(Boolean).find((k) => k?.key === 'frame');
  expect(frameNode, 'marquee frame band node').toBeTruthy();
  return frameNode.props.color as string;
}

describe('COSM-05/CARD-15: the marquee track — parameterized, legacy pixel-identical (P1-b)', () => {
  it('the registry constants are the styler-roster default and its legacy dim track', () => {
    expect(MARQUEE_REGISTRY_COLOR).toBe('#e8c14a');
    expect(MARQUEE_LEGACY_TRACK).toBe('#6b5c28');
  });

  it('marqueeTrackColor of the registry gold returns the EXACT legacy track (pixel-identity, case-insensitive)', () => {
    expect(marqueeTrackColor('#e8c14a')).toBe('#6b5c28');
    expect(marqueeTrackColor('#E8C14A')).toBe('#6b5c28');
    expect(marqueeTrackColor('e8c14a')).toBe('#6b5c28'); // no-hash tolerated
  });

  it('a base/registry-gold MARQUEE frame renders the identical legacy #6b5c28 track (byte-identical before/after)', () => {
    // This is the pixel-identity proof: the pre-fix render hard-coded #6b5c28, and the base + ultimate
    // marquee both carry the registry gold #e8c14a — so the legacy marquee is unchanged.
    expect(marqueeBandColor(marqueeComp('#e8c14a'))).toBe('#6b5c28');
  });

  it('a RECOLOURED marquee (MARQUEE ULTIMATE) derives a dimmed track from the chosen colour — the render changes', () => {
    const track = marqueeBandColor(marqueeComp('#5ad0ff')); // a cyan pick
    expect(track).not.toBe('#6b5c28'); // no longer the legacy gold track
    expect(track).toMatch(/^#[0-9a-f]{6}$/);
    // the dim track is a per-channel scale of the pick — strictly darker than the source
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(track.slice(i, i + 2), 16));
    expect(r).toBeLessThan(0x5a);
    expect(g).toBeLessThan(0xd0);
    expect(b).toBeLessThan(0xff);
  });

  it('marqueeTrackColor is pure/deterministic and degrades an unparseable colour to the legacy track', () => {
    expect(marqueeTrackColor('#5ad0ff')).toBe(marqueeTrackColor('#5ad0ff'));
    expect(marqueeTrackColor('not-a-color')).toBe('#6b5c28');
    expect(marqueeTrackColor('')).toBe('#6b5c28');
  });

  it('a MISSING frame.color (hand-crafted document; the backstop skips colour-customizable designs) degrades to the legacy track — never a crash', () => {
    expect(marqueeTrackColor(undefined)).toBe('#6b5c28');
    expect(marqueeTrackColor(null)).toBe('#6b5c28');
    expect(marqueeTrackColor(7)).toBe('#6b5c28');
    // the full render path survives the same document — pre-guard this was a publish/share 500
    expect(marqueeBandColor(marqueeComp(undefined as unknown as string))).toBe('#6b5c28');
  });
});
