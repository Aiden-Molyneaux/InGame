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

export const STATUS_LABEL: Record<CollectionStatus, string> = {
  backlog: 'BACKLOG',
  playing: 'PLAYING',
  beaten: 'BEATEN',
  completed: 'COMPLETED 100%',
  dropped: 'DROPPED',
  wishlist: 'WISHLIST',
};
