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

// The whole shelf total (the count keycap's "12 OF 12"). Kept in lockstep with the seed so the M2
// count is internally coherent (C4); sized to 12 per the owner's on-device pass (2026-07-01) — the
// real total comes from /me/collection at M3.
export const COLLECTION_TOTAL = SEED_COLLECTION.length;
