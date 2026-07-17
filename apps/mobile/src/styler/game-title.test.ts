import { withGameTitle } from './roster';
import { COMPOSITION_SCHEMA_VERSION } from '@ingame/shared';
import type { CardComposition, NameplateShape } from '../render/composition';

// CARD-11 (owner ruling 2026-07-15): a card's nameplate TITLE TEXT is ALWAYS the game title —
// system-derived, never user-authored (only font + ink + the plate cosmetic are customizable). The
// Styler's write-path forces this on the live draft so a RESUMED card carrying a legacy/drifted stored
// title normalizes for WYSIWYG. These tests pin the pure helper the styler effect + mutations lean on.

const base = (nameplate?: CardComposition['nameplate']): CardComposition => ({
  schemaVersion: COMPOSITION_SCHEMA_VERSION,
  base: { gradient: ['#241a4d', '#0e0b1e'] },
  elements: [],
  ...(nameplate ? { nameplate } : {}),
});

const np = (title: string, extra: Partial<NonNullable<CardComposition['nameplate']>> = {}) => ({
  shape: 'slab' as NameplateShape,
  fontId: 'clean-sans',
  title,
  plate: '#141026',
  ink: '#f3ecd9',
  size: 0.05,
  ...extra,
});

describe('withGameTitle — the Styler nameplate-title write-path (CARD-11)', () => {
  it('normalizes a resumed card with a drifted stored title to the game title (uppercased)', () => {
    const resumed = base(np('AURORA')); // a legacy/wrong stored title
    const out = withGameTitle(resumed, 'Elden Ring');
    expect(out.nameplate!.title).toBe('ELDEN RING');
  });

  it('a nameplate edit (font + ink changed) still carries the game title, never authored text', () => {
    // Simulate the styler's TITLE-tab mutation: font + ink change, then the write-path forces the title.
    const edited = base(np('WHATEVER', { fontId: 'bold-display', ink: '#e8c14a' }));
    const out = withGameTitle(edited, 'Hollow Knight');
    expect(out.nameplate).toEqual(
      expect.objectContaining({ title: 'HOLLOW KNIGHT', fontId: 'bold-display', ink: '#e8c14a' }),
    );
  });

  it('is idempotent — an already-correct title returns the SAME reference (no needless re-render)', () => {
    const correct = base(np('CELESTE'));
    expect(withGameTitle(correct, 'Celeste')).toBe(correct);
  });

  it('leaves a plateless legacy composition untouched', () => {
    const plateless = base();
    expect(withGameTitle(plateless, 'Hades')).toBe(plateless);
  });
});
