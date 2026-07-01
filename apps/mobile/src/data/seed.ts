// Scratch/seed data for the M2 tangible-win render (local/scratch-seeded — the real /me/collection +
// catalog endpoints are M3). The styled Collection shelf + the Profile Top-3 / Now-Playing / stats
// read from here; the identity half (username, avatar, role, bio, memberSince) comes from the REAL
// GET /me once signed in.

export interface SeedGame {
  entryId: string;
  title: string;
  hours: number;
  status: 'playing' | 'beaten' | 'completed' | 'backlog';
  nowPlaying?: boolean;
  foil?: boolean;
}

export const SEED_COLLECTION: SeedGame[] = [
  { entryId: 'g01', title: 'Hollow Knight', hours: 84, status: 'completed', foil: true },
  { entryId: 'g02', title: 'Hades', hours: 61, status: 'beaten', nowPlaying: true },
  { entryId: 'g03', title: 'Celeste', hours: 27, status: 'completed' },
  { entryId: 'g04', title: 'Stardew Valley', hours: 143, status: 'playing' },
  { entryId: 'g05', title: 'Elden Ring', hours: 112, status: 'beaten', foil: true },
  { entryId: 'g06', title: 'Outer Wilds', hours: 22, status: 'completed' },
  { entryId: 'g07', title: 'Disco Elysium', hours: 40, status: 'beaten' },
  { entryId: 'g08', title: 'Tunic', hours: 19, status: 'backlog' },
  { entryId: 'g09', title: 'Slay the Spire', hours: 98, status: 'playing' },
  { entryId: 'g10', title: 'Signalis', hours: 12, status: 'backlog' },
  { entryId: 'g11', title: 'Inscryption', hours: 16, status: 'completed' },
  { entryId: 'g12', title: 'Pizza Tower', hours: 9, status: 'backlog', foil: true },
  { entryId: 'g13', title: 'Balatro', hours: 71, status: 'playing' },
  { entryId: 'g14', title: 'Cocoon', hours: 6, status: 'completed' },
  { entryId: 'g15', title: 'Sea of Stars', hours: 33, status: 'beaten' },
];

export const SEED_TOP3 = [SEED_COLLECTION[4], SEED_COLLECTION[0], SEED_COLLECTION[1]] as SeedGame[];

export const SEED_NOW_PLAYING =
  SEED_COLLECTION.find((g) => g.nowPlaying) ?? SEED_COLLECTION[1]!;

export const SEED_STATS = {
  games: SEED_COLLECTION.length,
  hours: SEED_COLLECTION.reduce((n, g) => n + g.hours, 0),
  completionPct: 62,
  cardsDesigned: 7,
  adoptions: 23,
  friends: 14,
};

export const COLLECTION_TOTAL = 48; // the whole shelf (the count keycap's "15 OF 48")
