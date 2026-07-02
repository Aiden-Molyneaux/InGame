import { assertDisposableDb } from '../db/destructive-guard';
import { closeDb } from '../db/client';
import * as authRepo from '../repositories/auth-repo';
import * as authService from '../services/auth-service';
import * as catalogService from '../services/catalog-service';
import * as collectionService from '../services/collection-service';
import * as profileService from '../services/profile-service';
import { DuplicateSuspectedError, ValidationError } from '../errors/AppError';
import type { CollectionStatus } from '@ingame/shared';

// D6 (decision 0058) — the server-side IDEMPOTENT scratch-seed. The client seed file died with the
// M3 re-wire; this keeps the phone demo populated on a dev/scratch DB WITHOUT hand-adding games.
// It exercises the REAL service layer (register → create → add → status/hours → pins) — no raw SQL,
// every event emitted, every guard live. F03: assertDisposableDb() first; refuses non-scratch DBs.
//
// Run: `npm -w @ingame/api run db:seed-dev` (env: DATABASE_URL + DISPOSABLE_DB=1 + JWT_SIGNING_SECRET).

const DEMO_EMAIL = 'demo@ingame.app';
const DEMO_USERNAME = 'demo_curator';
const DEMO_PASSWORD = 'InGameDemo1!'; // dev-only scratch credential — never a real secret

interface SeedGame {
  name: string;
  genres: string[];
  studio?: string;
  publisher?: string;
  releaseDate?: string;
  status?: CollectionStatus;
  hours?: number;
  percentComplete?: number;
}

// The coherent-12 shelf (the owner's M2 device-pass ruling: a 12 OF 12 shelf, stats derive).
const SHELF: SeedGame[] = [
  { name: 'Elden Ring', genres: ['Soulslike', 'RPG'], studio: 'FromSoftware', publisher: 'Bandai Namco', releaseDate: '2022-02-25', status: 'playing', hours: 142, percentComplete: 55 },
  { name: 'Hades', genres: ['Roguelike', 'Action'], studio: 'Supergiant Games', publisher: 'Supergiant Games', releaseDate: '2020-09-17', status: 'beaten', hours: 96, percentComplete: 90 },
  { name: 'Hollow Knight', genres: ['Metroidvania'], studio: 'Team Cherry', releaseDate: '2017-02-24', status: 'completed', hours: 61, percentComplete: 100 },
  { name: 'Stardew Valley', genres: ['Simulation'], studio: 'ConcernedApe', releaseDate: '2016-02-26', status: 'playing', hours: 210, percentComplete: 70 },
  { name: 'Celeste', genres: ['Platformer'], studio: 'Extremely OK Games', releaseDate: '2018-01-25', status: 'beaten', hours: 12, percentComplete: 85 },
  { name: 'Destiny 2', genres: ['Shooter'], studio: 'Bungie', releaseDate: '2017-09-06', status: 'dropped', hours: 300, percentComplete: 40 },
  { name: 'The Witcher 3', genres: ['RPG', 'Adventure'], studio: 'CD Projekt Red', releaseDate: '2015-05-19', status: 'backlog', hours: 0 },
  { name: 'Portal 2', genres: ['Puzzle'], studio: 'Valve', releaseDate: '2011-04-19', status: 'completed', hours: 14, percentComplete: 100 },
  { name: 'Street Fighter 6', genres: ['Fighting'], studio: 'Capcom', releaseDate: '2023-06-02', status: 'playing', hours: 40, percentComplete: 30 },
  { name: 'Resident Evil 4', genres: ['Horror', 'Action'], studio: 'Capcom', releaseDate: '2023-03-24', status: 'beaten', hours: 25, percentComplete: 80 },
  { name: 'Forza Horizon 5', genres: ['Racing'], studio: 'Playground Games', releaseDate: '2021-11-09', status: 'backlog', hours: 0 },
  { name: 'Marathon', genres: ['Shooter'], studio: 'Bungie', releaseDate: '2026-09-23', status: 'wishlist', hours: 0 },
];

async function ensureDemoSession(): Promise<{ userId: string; token: string }> {
  const existing = await authRepo.findByEmail(DEMO_EMAIL);
  if (existing) {
    const session = await authService.login({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    return { userId: session.user.id, token: session.accessToken };
  }
  // Idempotency keys on the EMAIL; a scratch DB may already hold the preferred username under a
  // different account (the M2 manual sessions) — fall back to suffixed handles.
  for (const username of [DEMO_USERNAME, `${DEMO_USERNAME}_m3`, `${DEMO_USERNAME}_m3b`]) {
    try {
      const session = await authService.register({
        email: DEMO_EMAIL,
        username,
        password: DEMO_PASSWORD,
        acceptedTerms: true,
      });
      return { userId: session.user.id, token: session.accessToken };
    } catch (e) {
      if (e instanceof ValidationError && e.reason === 'username_taken') continue;
      throw e;
    }
  }
  throw new Error('seed-dev: could not register the demo user (all fallback usernames taken)');
}

async function ensureGame(userId: string, seed: SeedGame): Promise<string> {
  const genres = await catalogService.listGenres();
  const genreIds = seed.genres.map((name) => {
    const hit = genres.items.find((g) => g.name === name);
    if (!hit) throw new Error(`seed genre "${name}" is not in the controlled list (OQ-125)`);
    return hit.id;
  });
  try {
    const created = await catalogService.createGame(userId, {
      name: seed.name,
      genreIds,
      ...(seed.studio ? { studio: seed.studio } : {}),
      ...(seed.publisher ? { publisher: seed.publisher } : {}),
      ...(seed.releaseDate ? { releaseDate: seed.releaseDate } : {}),
    });
    return created.id;
  } catch (e) {
    if (e instanceof DuplicateSuspectedError) {
      const exact = e.suggestions.find((s) => s.exact) ?? e.suggestions[0];
      if (exact) return exact.id; // already seeded — idempotent re-run
    }
    throw e;
  }
}

async function ensureEntry(userId: string, gameId: string, seed: SeedGame): Promise<void> {
  let entryId: string;
  try {
    const item = await collectionService.addEntry(userId, { gameId });
    entryId = item.entryId;
  } catch (e) {
    if (e instanceof ValidationError && e.reason === 'already_in_collection') {
      const shelf = await collectionService.listCollection(userId);
      const existing = shelf.items.find((i) => i.gameId === gameId);
      if (!existing) throw e;
      entryId = existing.entryId;
    } else {
      throw e;
    }
  }
  await collectionService.updateEntry(userId, entryId, {
    ...(seed.status ? { status: seed.status } : {}),
    ...(seed.hours !== undefined ? { hours: seed.hours } : {}),
    ...(seed.percentComplete !== undefined ? { percentComplete: seed.percentComplete } : {}),
  });
}

async function main(): Promise<void> {
  assertDisposableDb(); // F03 — scratch DBs only, fail closed

  const { userId } = await ensureDemoSession();
  console.log(`seed-dev: demo user ready — ${DEMO_EMAIL} / ${DEMO_PASSWORD} (${userId})`);

  const gameIds = new Map<string, string>();
  for (const seed of SHELF) {
    const id = await ensureGame(userId, seed);
    gameIds.set(seed.name, id);
    await ensureEntry(userId, id, seed);
  }

  await collectionService.setNowPlaying(userId, { gameId: gameIds.get('Elden Ring') ?? null });
  await profileService.updateProfile(userId, { favouriteGameId: gameIds.get('Hades') ?? null });

  const shelf = await collectionService.listCollection(userId);
  console.log(
    `seed-dev: shelf ready — ${shelf.collectionTotal} OF ${shelf.collectionTotal} (now playing: Elden Ring · favourite: Hades)`,
  );
}

main()
  .then(() => closeDb())
  .catch(async (e) => {
    console.error('seed-dev FAILED:', e);
    await closeDb();
    process.exitCode = 1;
  });
