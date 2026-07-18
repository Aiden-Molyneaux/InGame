import { readFileSync } from 'fs';
import { join } from 'path';
import { theme } from './theme';
import { SCREEN_HEADER_PAD, RETURN_SEAM_PAD, HEADER_SEAM_GAP } from './components/ScreenHead';

// walk2 W-B1/W-B2 — the app-wide header + return-seam geometry, pinned. The reference is the
// Collection/Profile header band; every routed screen spreads the shared constants so the two audited
// gaps — (header ↔ ‹ RETURN link) and (link ↔ content) — are one number app-wide. Two halves here:
// (1) the VALUES match the reference; (2) a consumption tripwire — the reference screens plus one
// representative conformed screen per audit consume the constants (a drifting screen that re-hardcodes
// its paddings goes RED without snapshotting every screen).

const app = (p: string) => readFileSync(join(__dirname, '..', 'app', p), 'utf8');

describe('W-B1/W-B2: the shared screen geometry', () => {
  it('matches the Collection/Profile reference values (lg/lg/md header · lg/md seam)', () => {
    expect(SCREEN_HEADER_PAD).toEqual({
      paddingHorizontal: theme.space.lg,
      paddingTop: theme.space.lg,
      paddingBottom: theme.space.md,
    });
    expect(RETURN_SEAM_PAD).toEqual({
      paddingHorizontal: theme.space.lg,
      paddingBottom: theme.space.md,
    });
    // gap-1 expressed as a row gap for the fused under-title seams == the header's paddingBottom
    expect(HEADER_SEAM_GAP).toBe(SCREEN_HEADER_PAD.paddingBottom);
  });

  it('the reference screens consume SCREEN_HEADER_PAD (Collection · Profile)', () => {
    expect(app('(tabs)/collection.tsx')).toContain('...SCREEN_HEADER_PAD');
    expect(app('(tabs)/profile.tsx')).toContain('...SCREEN_HEADER_PAD');
  });

  it('W-B1 representative conformed screens consume the header constant (Friends — a named offender — · Terms via LegalScreen)', () => {
    expect(app('(tabs)/friends.tsx')).toContain('...SCREEN_HEADER_PAD');
    const legal = readFileSync(join(__dirname, 'components', 'LegalScreen.tsx'), 'utf8');
    expect(legal).toContain('...SCREEN_HEADER_PAD');
  });

  it('W-B2 representative conformed screens consume the seam geometry (Add-Game — the named offender — · the game page)', () => {
    // add-game's S2-b under-title seam fuses gap-1 as the shared HEADER_SEAM_GAP
    expect(app('add-game.tsx')).toContain('HEADER_SEAM_GAP');
    expect(app('game/[id].tsx')).toContain('...RETURN_SEAM_PAD');
  });
});
