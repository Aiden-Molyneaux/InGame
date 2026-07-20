import { COMPOSITION_SCHEMA_VERSION } from '@ingame/shared';
import type { CardComposition } from '../render/composition';
import { draftToPresetStyle, presetToComposition } from './presets';

// COSM-05 (M6 W-5, decision 0080) — presets carry the ULTIMATE design identity the COSM-05
// colour-independent way: the recipe snapshots the ultimate SKU id (cosmeticId-first derive, never
// the base SKU), and applying the recipe re-writes the composition `cosmeticId`. The CUSTOM hue rides
// the additive `frameColor`/`plateColor` fields (api-contract 0.77, closing the P2 seam gap) —
// written only off a VALIDATED ultimate layer, honoured only onto a colorCustomizable row, registry
// seed as the fallback for pre-colour-field presets. `title.ink` is already a colour field, so a
// free-picked ink rides verbatim. Non-ultimate recipes must stay byte-identical to the pre-W5 mapping.

const comp = (extra: Partial<CardComposition>): CardComposition => ({
  schemaVersion: COMPOSITION_SCHEMA_VERSION,
  base: { gradient: ['#241a4d', '#0e0b1e'] },
  elements: [],
  nameplate: { shape: 'slab', fontId: 'clean-sans', title: 'GAME', plate: '#141026', ink: '#f3ecd9', size: 0.05 },
  ...extra,
});

describe('COSM-05: draftToPresetStyle — the recipe snapshots ultimate identity cosmeticId-first', () => {
  it('a recoloured MARQUEE ULTIMATE snapshots as marquee-ultimate, never base marquee', () => {
    const style = draftToPresetStyle(
      comp({ frame: { kind: 'marquee', color: '#12e0b8', width: 0.045, cosmeticId: 'marquee-ultimate' } }),
    );
    expect(style.frameId).toBe('marquee-ultimate');
  });

  it('a recoloured BRASS ULTIMATE plate snapshots as brass-ultimate, never base brass', () => {
    const style = draftToPresetStyle(
      comp({
        nameplate: { shape: 'brass', fontId: 'clean-sans', title: 'X', plate: '#3a86ff', ink: '#fff', size: 0.05, cosmeticId: 'brass-ultimate' },
      }),
    );
    expect(style.nameplateId).toBe('brass-ultimate');
  });

  it('a free-picked ultimate ink rides the recipe verbatim (title.ink is a colour field)', () => {
    const style = draftToPresetStyle(
      comp({
        nameplate: { shape: 'slab', fontId: 'pacifico-ultimate', title: 'X', plate: '#141026', ink: '#12e0b8', size: 0.05 },
      }),
    );
    expect(style.title).toEqual({ fontId: 'pacifico-ultimate', ink: '#12e0b8' });
  });

  it('non-ultimate derives stay byte-identical — THIN GOLD by kind+color, brass by shape', () => {
    const style = draftToPresetStyle(
      comp({
        frame: { kind: 'thin-line', color: '#e8c14a', width: 0.045 },
        nameplate: { shape: 'brass', fontId: 'clean-sans', title: 'X', plate: '#141026', ink: '#fff', size: 0.05 },
      }),
    );
    expect(style.frameId).toBe('thin-gold');
    expect(style.nameplateId).toBe('brass');
  });

  it('the CUSTOM hue rides frameColor/plateColor — written ONLY off validated ultimate layers', () => {
    const style = draftToPresetStyle(
      comp({
        frame: { kind: 'marquee', color: '#12e0b8', width: 0.045, cosmeticId: 'marquee-ultimate' },
        nameplate: { shape: 'brass', fontId: 'clean-sans', title: 'X', plate: '#3a86ff', ink: '#f3ecd9', size: 0.05, cosmeticId: 'brass-ultimate' },
      }),
    );
    expect(style.frameColor).toBe('#12e0b8');
    expect(style.plateColor).toBe('#3a86ff');
  });

  it('non-ultimate layers write NO colour fields (a base-marquee recolour never smuggles a hue)', () => {
    const style = draftToPresetStyle(
      comp({
        frame: { kind: 'marquee', color: '#12e0b8', width: 0.045 }, // no cosmeticId — infers base
        nameplate: { shape: 'brass', fontId: 'clean-sans', title: 'X', plate: '#141026', ink: '#f3ecd9', size: 0.05 },
      }),
    );
    expect(style.frameColor).toBeUndefined();
    expect(style.plateColor).toBeUndefined();
  });
});

describe('COSM-05: presetToComposition — the snapshotted hue applies; seed is the legacy fallback', () => {
  it('frameColor/plateColor are honoured onto ultimate rows', () => {
    const next = presetToComposition(
      { frameId: 'marquee-ultimate', frameColor: '#12e0b8', nameplateId: 'brass-ultimate', plateColor: '#3a86ff' },
      comp({}),
    );
    expect(next.frame).toMatchObject({ cosmeticId: 'marquee-ultimate', color: '#12e0b8' });
    expect(next.nameplate).toMatchObject({ cosmeticId: 'brass-ultimate', plate: '#3a86ff' });
  });

  it('a colour field paired with a NON-ultimate id is ignored (registry colour stands)', () => {
    const next = presetToComposition({ frameId: 'thin-gold', frameColor: '#12e0b8' }, comp({}));
    expect(next.frame).toMatchObject({ kind: 'thin-line', color: '#e8c14a' });
    expect((next.frame as { cosmeticId?: string }).cosmeticId).toBeUndefined();
  });
});

describe('COSM-05: presetToComposition — applying an ultimate recipe restores identity + seed colour', () => {
  it('frameId marquee-ultimate writes the explicit cosmeticId + the registry default gold', () => {
    const next = presetToComposition({ frameId: 'marquee-ultimate' }, comp({}));
    expect(next.frame).toEqual({ kind: 'marquee', color: '#e8c14a', width: 0.045, cosmeticId: 'marquee-ultimate' });
  });

  it('nameplateId brass-ultimate writes the cosmeticId + seeds the registry brass gold', () => {
    const next = presetToComposition({ nameplateId: 'brass-ultimate' }, comp({}));
    expect(next.nameplate?.shape).toBe('brass');
    expect(next.nameplate?.cosmeticId).toBe('brass-ultimate');
    expect(next.nameplate?.plate).toBe('#c9971f');
  });

  it('a non-ultimate recipe writes NO cosmeticId (byte-identical to the pre-W5 mapping)', () => {
    const next = presetToComposition({ frameId: 'marquee', nameplateId: 'brass' }, comp({}));
    expect(next.frame).toEqual({ kind: 'marquee', color: '#e8c14a', width: 0.045 });
    expect(next.nameplate?.cosmeticId).toBeUndefined();
    expect(next.nameplate?.plate).toBe('#141026'); // brass tints in the renderer, plate untouched
  });

  it('a preset ink (free-picked hex) applies verbatim', () => {
    const next = presetToComposition({ title: { fontId: 'pacifico-ultimate', ink: '#12e0b8' } }, comp({}));
    expect(next.nameplate?.fontId).toBe('pacifico-ultimate');
    expect(next.nameplate?.ink).toBe('#12e0b8');
  });
});
