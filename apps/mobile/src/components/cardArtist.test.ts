import type { CollectionCard } from '@ingame/shared';
import { cardArtist } from './cardArtist';

// walk2 W-A1 — the CARD ARTIST attribution correctness rule: an ADOPTED card's artist is its
// DESIGNER, never the adopter. The old derivation (`isCustom ? 'YOU' : null`) claimed YOU for every
// custom card, adopted ones included — these fixtures encode each provenance case.

const base: CollectionCard = {
  id: 'c1',
  imageUrl: '/media/cards/c1/full.png',
  thumbUrl: '/media/cards/c1/thumb.png?v=2',
  isCustom: true,
  isPremium: false,
};

describe('W-A1: cardArtist — adopted cards attribute the designer, never the adopter', () => {
  it('the CARD-18 default face → null (StatsBack renders DEFAULT)', () => {
    expect(cardArtist({ ...base, isCustom: false })).toBeNull();
  });

  it("the caller's OWN design (composition rides, 0066 §2) → YOU", () => {
    expect(cardArtist({ ...base, composition: { schemaVersion: 1, elements: [] } })).toBe('YOU');
  });

  it("an ADOPTED card carrying the CARD-01 designer rider → the DESIGNER's name (never YOU)", () => {
    const adopted: CollectionCard = {
      ...base,
      designer: { userId: 'bbbbbbbb-2222-4222-8222-222222222222', username: 'rival_curator' },
    };
    expect(cardArtist(adopted)).toBe('RIVAL_CURATOR');
  });

  it('an ADOPTED card without the rider (the current /me/collection wire — W-C8 reported) → the honest COMMUNITY fallback, never a false YOU', () => {
    expect(cardArtist(base)).toBe('COMMUNITY');
  });
});
