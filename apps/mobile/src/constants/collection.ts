import type { CollectionStatus } from '@ingame/shared';

// The COL-02 status set — ONE home for the chip order + display names, shared by the Collection
// drawer (collection.tsx) and the Add-game status beat (add-game.tsx) so the two chip rows can never
// silently drift (they were hand-synced before; murr debt, 2026-07-04). Board chip order is
// playing-first (collection-states.html:601–608); `completed` renders as "Completed 100%".
export const COLLECTION_STATUSES: CollectionStatus[] = [
  'playing',
  'backlog',
  'beaten',
  'completed',
  'dropped',
  'wishlist',
];

// The status set offered in the OWNED-entry editors (the Game-page EDIT-STATS status field). WISHLIST
// is EXCLUDED — it is the pre-ownership / unowned state (WTP-02); an owned entry must never be settable
// to it (OQ-070 resolved 2026-06-18 · decision 0025; the converged Game-page board M2 omits it, drawing
// 5 chips). Distinct from COLLECTION_STATUSES, which is the full storage enum (0058 §4).
export const OWNED_STATUSES: CollectionStatus[] = COLLECTION_STATUSES.filter((s) => s !== 'wishlist');

export const STATUS_LABEL: Record<CollectionStatus, string> = {
  backlog: 'BACKLOG',
  playing: 'PLAYING',
  beaten: 'BEATEN',
  completed: 'COMPLETED 100%',
  dropped: 'DROPPED',
  wishlist: 'WISHLIST',
};
