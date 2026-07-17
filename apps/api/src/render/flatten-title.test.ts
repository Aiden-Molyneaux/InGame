import { describe, it, expect } from 'vitest';
import { withGameTitle } from './flatten';
import { SAMPLE_COMPOSITION } from './composition';

// CARD-11 (owner ruling 2026-07-15): a card's nameplate TITLE TEXT is ALWAYS the game title —
// system-derived, never user-authored. `withGameTitle` is the server-authoritative override the
// publish/flatten path (card-service.publishCard · getShareImage on-demand flatten · the reflatten
// tool) applies to the STORED composition before rendering, so the render input title can never be
// the drifted/stale stored value. These tests pin that override.

describe('withGameTitle — the server-authoritative nameplate-title override (CARD-11)', () => {
  it('forces the render title to the game title even when the stored title differs', () => {
    // SAMPLE_COMPOSITION stores a deliberately WRONG nameplate title ('AURORA') — the exact drift the
    // seed carried. The flatten must render the GAME title, ignoring the stored value.
    expect((SAMPLE_COMPOSITION.nameplate as { title: string }).title).toBe('AURORA');
    const out = withGameTitle(SAMPLE_COMPOSITION as unknown as Record<string, unknown>, 'Elden Ring');
    expect((out.nameplate as { title: string }).title).toBe('ELDEN RING');
  });

  it('uppercases the game title to match the render convention (plate()/basePlate store uppercased)', () => {
    const out = withGameTitle(
      { nameplate: { title: 'x', plate: '#000', ink: '#fff', size: 0.05 } },
      'Hollow Knight',
    );
    expect((out.nameplate as { title: string }).title).toBe('HOLLOW KNIGHT');
  });

  it('preserves every OTHER nameplate facet (font · ink · plate · shape · size) — only the text changes', () => {
    const stored = {
      nameplate: { shape: 'brass', fontId: 'bitter', title: 'WRONG', plate: '#141026', ink: '#e8c14a', size: 0.05 },
    };
    const out = withGameTitle(stored, 'Celeste');
    expect(out.nameplate).toEqual({
      shape: 'brass',
      fontId: 'bitter',
      title: 'CELESTE',
      plate: '#141026',
      ink: '#e8c14a',
      size: 0.05,
    });
  });

  it('does not mutate the input composition (returns a fresh object)', () => {
    const stored = { nameplate: { title: 'WRONG', plate: '#000', ink: '#fff', size: 0.05 }, foo: 1 };
    const out = withGameTitle(stored, 'Hades');
    expect((stored.nameplate as { title: string }).title).toBe('WRONG'); // untouched
    expect(out).not.toBe(stored);
    expect((out as { foo: number }).foo).toBe(1); // envelope carried through
  });

  it('returns a plateless legacy composition untouched (no nameplate to force)', () => {
    const stored = { base: { fill: '#000' }, elements: [] };
    expect(withGameTitle(stored, 'Stardew Valley')).toBe(stored);
  });
});
