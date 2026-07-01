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
  // ── placeholder fill to a coherent 48 (fix #6 / C4 — the real /me/collection lands at M3) ──
  { entryId: 'g16', title: 'Cuphead', hours: 24, status: 'beaten' },
  { entryId: 'g17', title: "Death's Door", hours: 18, status: 'completed', foil: true },
  { entryId: 'g18', title: 'Ori and the Blind Forest', hours: 15, status: 'completed' },
  { entryId: 'g19', title: 'Hyper Light Drifter', hours: 21, status: 'beaten' },
  { entryId: 'g20', title: 'Dead Cells', hours: 66, status: 'playing' },
  { entryId: 'g21', title: 'Bastion', hours: 11, status: 'completed' },
  { entryId: 'g22', title: 'Transistor', hours: 14, status: 'beaten' },
  { entryId: 'g23', title: 'The Witcher 3', hours: 156, status: 'completed', foil: true },
  { entryId: 'g24', title: 'Portal 2', hours: 13, status: 'completed' },
  { entryId: 'g25', title: 'Return of the Obra Dinn', hours: 10, status: 'beaten' },
  { entryId: 'g26', title: 'Gris', hours: 5, status: 'completed' },
  { entryId: 'g27', title: 'Spiritfarer', hours: 34, status: 'playing' },
  { entryId: 'g28', title: 'Undertale', hours: 23, status: 'completed' },
  { entryId: 'g29', title: 'Katana ZERO', hours: 8, status: 'beaten' },
  { entryId: 'g30', title: 'Metroid Dread', hours: 17, status: 'completed' },
  { entryId: 'g31', title: 'Journey', hours: 4, status: 'completed' },
  { entryId: 'g32', title: 'Firewatch', hours: 6, status: 'beaten' },
  { entryId: 'g33', title: 'Baba Is You', hours: 29, status: 'playing' },
  { entryId: 'g34', title: 'Hotline Miami', hours: 12, status: 'beaten' },
  { entryId: 'g35', title: 'NieR: Automata', hours: 58, status: 'completed', foil: true },
  { entryId: 'g36', title: 'Cult of the Lamb', hours: 26, status: 'playing' },
  { entryId: 'g37', title: 'Vampire Survivors', hours: 41, status: 'playing' },
  { entryId: 'g38', title: 'Loop Hero', hours: 15, status: 'beaten' },
  { entryId: 'g39', title: 'Terraria', hours: 132, status: 'playing' },
  { entryId: 'g40', title: 'Factorio', hours: 204, status: 'playing' },
  { entryId: 'g41', title: 'Subnautica', hours: 47, status: 'completed' },
  { entryId: 'g42', title: 'RimWorld', hours: 178, status: 'playing' },
  { entryId: 'g43', title: 'Void Stranger', hours: 13, status: 'backlog' },
  { entryId: 'g44', title: 'Chained Echoes', hours: 38, status: 'beaten' },
  { entryId: 'g45', title: 'Blasphemous', hours: 31, status: 'beaten' },
  { entryId: 'g46', title: 'Dredge', hours: 16, status: 'completed' },
  { entryId: 'g47', title: 'Tears of the Kingdom', hours: 121, status: 'playing', foil: true },
  { entryId: 'g48', title: 'Animal Well', hours: 14, status: 'completed' },
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

// The whole shelf total (the count keycap's "48 OF 48"). Kept in lockstep with the seed so the M2
// count is internally coherent (fix #6 / C4); the real total comes from /me/collection at M3.
export const COLLECTION_TOTAL = SEED_COLLECTION.length;
