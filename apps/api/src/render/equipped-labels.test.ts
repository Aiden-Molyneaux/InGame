import { describe, it, expect } from 'vitest';
import { deriveEquippedLabels } from './equipped-labels';
import { SAMPLE_COMPOSITION } from './composition';

// CARD-22 / OQ-146 (decision 0076 §0.2) — the publish-time equipped-readout label derivation. Pure,
// deterministic; the DENORMALIZED snapshot that makes the CARD-22 readout computable cross-user without
// ever reading the private composition. Tags: CARD-22, OQ-146.

describe('CARD-22: deriveEquippedLabels — per-slot display labels (incl. FREE slots)', () => {
  it('reads the sample composition (gradient base · free frame · scanline effect · slab plate)', () => {
    const labels = deriveEquippedLabels(SAMPLE_COMPOSITION);
    expect(labels.base).toBe('GRADIENT');
    expect(labels.frame).toBe('GOLD'); // frame { color:'#e8c14a', width } — kind defaults thin-line → GOLD (thin-line + gold)
    expect(labels.effect).toBe('SCANLINE');
    expect(labels.nameplate).toBe('SLAB'); // shape defaults slab
    expect(labels.font).toBe('CHAKRA'); // fontId defaults clean-sans → CHAKRA
  });

  it('resolves a SOLID base', () => {
    const labels = deriveEquippedLabels({ schemaVersion: 1, base: { fill: '#101010' }, elements: [] });
    expect(labels.base).toBe('SOLID');
  });

  it('resolves premium closed attributes by their roster names (frost effect · holographic finish · brass plate · slab font)', () => {
    const labels = deriveEquippedLabels({
      schemaVersion: 1,
      base: { gradient: ['#111', '#222'] },
      elements: [],
      frame: { kind: 'marquee', color: '#e8c14a', width: 0.02 },
      effect: { kind: 'frost', intensity: 0.6 },
      finish: { kind: 'holographic' },
      nameplate: { shape: 'brass', fontId: 'bitter', title: 'X', plate: '#141026', ink: '#fff', size: 0.05 },
    });
    expect(labels).toMatchObject({
      frame: 'MARQUEE',
      effect: 'FROST',
      finish: 'HOLOGRAPHIC',
      nameplate: 'BRASS',
      font: 'SLAB', // bitter → SLAB
    });
  });

  it('disambiguates effect NONE from finish STANDARD (both composition kind "none")', () => {
    const labels = deriveEquippedLabels({
      schemaVersion: 1,
      base: { gradient: ['#111', '#222'] },
      elements: [],
      effect: { kind: 'none', intensity: 0 },
      finish: { kind: 'none' },
    });
    expect(labels.effect).toBe('NONE');
    expect(labels.finish).toBe('STANDARD');
  });

  it('a no-frame composition reads as CLEAN; recolored free frames keep their roster name', () => {
    expect(deriveEquippedLabels({ schemaVersion: 1, base: { fill: '#000' }, elements: [] }).frame).toBe('CLEAN');
    expect(
      deriveEquippedLabels({
        schemaVersion: 1,
        base: { fill: '#000' },
        elements: [],
        frame: { kind: 'thin-line', color: '#e85ad0', width: 0.04 },
      }).frame,
    ).toBe('BUBBLEGUM');
  });

  it('omits slots the composition does not set (effect/finish absent → no key), and never throws on junk', () => {
    const labels = deriveEquippedLabels({ schemaVersion: 1, base: { gradient: ['#111', '#222'] }, elements: [] });
    expect('effect' in labels).toBe(false);
    expect('finish' in labels).toBe(false);
    expect(() => deriveEquippedLabels(null)).not.toThrow();
    expect(() => deriveEquippedLabels({ garbage: true })).not.toThrow();
    expect(deriveEquippedLabels(undefined)).toEqual({});
  });
});

// ── M6 W-5 (COSM-05 / decision 0080) — CARD-22 colour-independent resolution via the explicit
// composition `cosmeticId` (registry-validated; a recoloured ultimate design still reads as itself).
describe('CARD-22/COSM-05: ultimate labels resolve colour-independently via cosmeticId', () => {
  it('a valid frame cosmeticId labels the ULTIMATE SKU regardless of the chosen colour', () => {
    const labels = deriveEquippedLabels({
      schemaVersion: 1,
      base: { fill: '#000' },
      elements: [],
      frame: { kind: 'marquee', color: '#12e0a8', width: 0.02, cosmeticId: 'marquee-ultimate' },
    });
    expect(labels.frame).toBe('MARQUEE ULTIMATE');
  });

  it('a valid nameplate cosmeticId labels BRASS ULTIMATE; the ultimate font labels via its own fontId', () => {
    const labels = deriveEquippedLabels({
      schemaVersion: 1,
      base: { fill: '#000' },
      elements: [],
      nameplate: { shape: 'brass', cosmeticId: 'brass-ultimate', fontId: 'pacifico-ultimate', title: 'X', plate: '#8a2be2', ink: '#fff', size: 0.05 },
    });
    expect(labels.nameplate).toBe('BRASS ULTIMATE');
    expect(labels.font).toBe('SCRIPT ULTIMATE');
  });

  it('an INVALID cosmeticId falls back to the inference label (never trusted blind)', () => {
    const labels = deriveEquippedLabels({
      schemaVersion: 1,
      base: { fill: '#000' },
      elements: [],
      frame: { kind: 'marquee', color: '#12e0a8', width: 0.02, cosmeticId: 'brass-ultimate' },
      nameplate: { shape: 'brass', cosmeticId: 'no-such-sku', title: 'X', plate: '#000', ink: '#fff', size: 0.05 },
    });
    expect(labels.frame).toBe('MARQUEE'); // recoloured marquee, bad id → base-kind inference
    expect(labels.nameplate).toBe('BRASS');
  });
});
