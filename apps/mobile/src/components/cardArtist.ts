import type { CollectionCard } from '@ingame/shared';

// cardArtist (walk2 W-A1) — the ONE derivation of the CARD ARTIST attribution for a collection
// card rider, shared by every "CARD ARTIST" surface (FlipCard's stats back · the Game-page
// DualFaceHero) so they can't drift. Correctness rule: an ADOPTED card's artist is its DESIGNER,
// never the adopter — the old per-call-site `isCustom ? 'YOU' : null` claimed YOU for every custom
// card, adopted ones included.
//
// The discriminator is the OWNER-ONLY `composition` rider (0066 §2): the caller's OWN design always
// carries its composition on `/me/collection` (owner surfaces render live); an ADOPTED card is
// flattened-only (OQ-122/CARD-15 — no composition, only image urls). So:
//   • not custom            → null   (the CARD-18 default face — StatsBack renders 'DEFAULT')
//   • custom + composition  → 'YOU'  (your design)
//   • custom, no composition (adopted) → the designer's name — the payload carries the CARD-01
//     `designer` rider on /me/collection (contract 0.50; the server half landed in W-C8 / edd9710).
//     'COMMUNITY' now only surfaces as the honest fallback for a stale-cache payload that predates
//     C8 — never a false 'YOU'.
export function cardArtist(card: CollectionCard): string | null {
  if (!card.isCustom) return null;
  if (card.composition != null) return 'YOU';
  return card.designer?.username.toUpperCase() ?? 'COMMUNITY';
}
