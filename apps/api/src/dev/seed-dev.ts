import { assertDisposableDb } from '../db/destructive-guard';
import { closeDb } from '../db/client';
import * as authRepo from '../repositories/auth-repo';
import * as storeRepo from '../repositories/store-repo';
import * as authService from '../services/auth-service';
import * as catalogService from '../services/catalog-service';
import * as collectionService from '../services/collection-service';
import * as profileService from '../services/profile-service';
import * as cardService from '../services/card-service';
import * as presetService from '../services/style-preset-service';
import * as cosmeticService from '../services/cosmetics/cosmetic-service';
import { DuplicateSuspectedError, ValidationError } from '../errors/AppError';
import { COMPOSITION_SCHEMA_VERSION, type CollectionStatus, type Composition } from '@ingame/shared';

// D6 (decision 0058) — the server-side IDEMPOTENT scratch-seed. The client seed file died with the
// M3 re-wire; this keeps the phone demo populated on a dev/scratch DB WITHOUT hand-adding games.
// It exercises the REAL service layer (register → create → add → status/hours → pins) — no raw SQL,
// every event emitted, every guard live. F03: assertDisposableDb() first; refuses non-scratch DBs.
//
// Run: `npm -w @ingame/api run db:seed-dev` (env: DATABASE_URL + DISPOSABLE_DB=1 + JWT_SIGNING_SECRET).

const DEMO_EMAIL = 'demo@ingame.app';
const DEMO_USERNAME = 'demo_curator';
const DEMO_PASSWORD = 'InGameDemo1!'; // dev-only scratch credential — never a real secret

const RIVAL_EMAIL = 'rival@ingame.app';
const RIVAL_USERNAME = 'rival_curator';
const RIVAL_PASSWORD = 'InGameDemo1!'; // dev-only scratch credential — never a real secret

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

  await ensureStoreProducts(); // M5 P10 (decision 0072) — the permanent pack ladder, GLOBAL content

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

  await ensureCardSubstrate(userId, gameIds.get('Elden Ring'));
  await ensureDemoPremiumEntitlements(userId); // M5 P10 (decision 0075) — so OwnedTags render

  await ensureRivalWorld(gameIds.get('Hollow Knight')); // M5 P10 — a second designer, a real published card

  const shelf = await collectionService.listCollection(userId);
  console.log(
    `seed-dev: shelf ready — ${shelf.collectionTotal} OF ${shelf.collectionTotal} (now playing: Elden Ring · favourite: Hades)`,
  );
}

// M4 (decision 0066) — one PRIVATE, EQUIPPED design + two style presets, so the Game-page switcher,
// the Styler resume path, and the BaseRail preset merge all demo real data. Idempotent by name.
const SEED_CARD_NAME = 'Elden Ring — Aurora';
const SEED_COMPOSITION: Composition = {
  schemaVersion: COMPOSITION_SCHEMA_VERSION,
  base: { gradient: ['#241a4d', '#0e0b1e'] },
  elements: [
    { type: 'poly', shape: 'star', x: 0.5, y: 0.34, w: 0.52, h: 0.52, fill: '#e8c14a' },
    { type: 'ellipse', x: 0.72, y: 0.2, w: 0.14, h: 0.14, fill: '#f3ecd9' },
    { type: 'rect', x: 0.5, y: 0.62, w: 0.64, h: 0.028, fill: '#e85ad0' },
    { type: 'rect', x: 0.5, y: 0.66, w: 0.44, h: 0.02, fill: '#c9a227' },
    { type: 'poly', shape: 'diamond', x: 0.24, y: 0.24, w: 0.1, h: 0.1, rotation: 20, fill: '#7ad0e8' },
    { type: 'text', x: 0.5, y: 0.55, text: 'TARNISHED', size: 0.075, fill: '#f3ecd9' },
  ],
  frame: { color: '#e8c14a', width: 0.012 },
  nameplate: { title: 'AURORA', plate: '#141026', ink: '#f3ecd9', size: 0.05 },
  // SOFT GLOW is free — the demo's default showcase card must save/publish without a premium debt now
  // that P7's derivation covers closed attributes (SCANLINE re-tagged premium by decision 0075).
  effect: { kind: 'soft-glow', intensity: 0.55 },
} as Composition;

async function ensureCardSubstrate(userId: string, eldenRingId: string | undefined): Promise<void> {
  if (!eldenRingId) return;
  const mine = await cardService.listMyCards(userId);
  let design = mine.items.find((c) => c.name === SEED_CARD_NAME && c.gameId === eldenRingId);
  if (!design) {
    const created = await cardService.createDraft(userId, {
      gameId: eldenRingId,
      composition: SEED_COMPOSITION,
      name: SEED_CARD_NAME,
    });
    design = await cardService.savePrivate(userId, created.card.id);
  } else {
    // REPAIR (M5 P7): a dev DB seeded before the 0075 re-tag carries SCANLINE (premium now) on this
    // card — derivation covers closed attributes since P7, so its next save-private would 409
    // PREMIUM_UNRECONCILED. Re-point at the free composition (idempotent — a no-op once clean).
    const effectKind = (design.composition as { effect?: { kind?: string } } | null)?.effect?.kind;
    if (design.status !== 'published' && effectKind === 'scanline') {
      design = await cardService.updateCard(userId, design.id, { composition: SEED_COMPOSITION });
      console.log('seed-dev: repaired the demo card — SCANLINE (premium since 0075) → SOFT GLOW');
    }
    if (design.status === 'draft') {
      design = await cardService.savePrivate(userId, design.id);
    }
  }
  const shelf = await collectionService.listCollection(userId);
  const entry = shelf.items.find((i) => i.gameId === eldenRingId);
  if (entry && entry.card.id !== design.id) {
    await collectionService.updateEntry(userId, entry.entryId, { activeCardDesignId: design.id });
  }

  const presets = await presetService.listPresets(userId);
  const wanted: Array<{ name: string; style: Parameters<typeof presetService.createPreset>[1]['style'] }> = [
    { name: 'Midnight Gilt', style: { frameId: 'gilt', effect: { id: 'scanline', intensity: 0.55 }, title: { fontId: 'chakra', ink: '#f3ecd9' } } },
    { name: 'Quiet Slate', style: { frameId: 'slate', nameplateId: 'ribbon' } },
  ];
  for (const w of wanted) {
    if (!presets.some((p) => p.name === w.name)) {
      await presetService.createPreset(userId, { name: w.name, style: w.style });
    }
  }
  console.log(`seed-dev: card substrate ready — "${SEED_CARD_NAME}" (private, equipped) + ${wanted.length} presets`);
}

// ── M5 P10 (decision 0072/0075) — the economy demo world ───────────────────────────────────────────

/** The decision-0072 5-SKU pack ladder (ECON-10) — a GLOBAL catalog table, not user-owned content, so
 *  a direct idempotent insert (mirroring the `iap-slice.test.ts` fixture) is the right shape here,
 *  same as the controlled genre list — no service/route exists to author `store_products` (there is
 *  no consumer-facing "create a pack" action). Re-running the seed is a no-op (`onConflictDoNothing`). */
const STORE_PRODUCTS_SEED: Array<{ productId: string; pixels: number; oneTime: boolean }> = [
  { productId: 'px_pack_starter', pixels: 12, oneTime: true },
  { productId: 'px_pack_010', pixels: 10, oneTime: false },
  { productId: 'px_pack_030', pixels: 30, oneTime: false },
  { productId: 'px_pack_065', pixels: 65, oneTime: false },
  { productId: 'px_pack_140', pixels: 140, oneTime: false },
];

async function ensureStoreProducts(): Promise<void> {
  await storeRepo.seedProducts(STORE_PRODUCTS_SEED);
  console.log(`seed-dev: store products ready — ${STORE_PRODUCTS_SEED.length} packs (idempotent)`);
}

/** A few premium entitlements on the demo user (decision 0075) — the Device/Styler OwnedTags need SOME
 *  owned premium items to render meaningfully; `acquireCosmetic` is itself idempotent (a re-run is a
 *  no-op once owned), so this is safe to call on every seed pass. Costs 3+6=9 of the 10-PX starting
 *  grant — comfortably affordable, still leaves the daily-bonus/ladder flows something to grant into. */
const DEMO_PREMIUM_ENTITLEMENTS = ['chrome', 'deepsea']; // CHROME frame (3 PX) + DEEP SEA theme (6 PX)

async function ensureDemoPremiumEntitlements(userId: string): Promise<void> {
  for (const cosmeticId of DEMO_PREMIUM_ENTITLEMENTS) {
    await cosmeticService.acquireCosmetic(userId, cosmeticId);
  }
  console.log(`seed-dev: demo premium entitlements ready — ${DEMO_PREMIUM_ENTITLEMENTS.join(', ')}`);
}

/** A second designer ('rival@ingame.app') with a PUBLISHED card carrying a premium component — so the
 *  gallery/adopt paths (P8) and the owner's device-walks have real cross-user content, not just the
 *  demo user's own private card. Goes through the REAL service path (acquire → createDraft →
 *  savePrivate → publishCard) so the flatten runs and CARD-13 reconcile is genuinely satisfied — never
 *  a raw insert. Idempotent by (name, gameId); publishCard itself is idempotent on an already-published
 *  card. */
const RIVAL_CARD_NAME = 'Hollow Knight — Rival Cut';
const RIVAL_PREMIUM_FONT = 'bitter'; // SLAB, 3 PX — the composition's one cosmeticId-bearing premium ref
const RIVAL_COMPOSITION: Composition = {
  schemaVersion: COMPOSITION_SCHEMA_VERSION,
  base: { gradient: ['#3a1430', '#150713'] },
  elements: [
    { type: 'poly', shape: 'triangle', x: 0.5, y: 0.36, w: 0.42, h: 0.38, fill: '#e85ad0' },
    { type: 'rect', x: 0.5, y: 0.62, w: 0.56, h: 0.02, fill: '#7ad0e8' },
    { type: 'text', x: 0.5, y: 0.5, text: 'RIVAL', size: 0.08, fill: '#f3ecd9', fontId: RIVAL_PREMIUM_FONT },
  ],
  frame: { color: '#e8c14a', width: 0.012 },
  nameplate: { title: 'RIVAL CUT', plate: '#141026', ink: '#f3ecd9', size: 0.05 },
  effect: { kind: 'vignette', intensity: 0.5 },
} as Composition;

async function ensureRivalSession(): Promise<{ userId: string }> {
  const existing = await authRepo.findByEmail(RIVAL_EMAIL);
  if (existing) return { userId: existing.id };
  const session = await authService.register({
    email: RIVAL_EMAIL,
    username: RIVAL_USERNAME,
    password: RIVAL_PASSWORD,
    acceptedTerms: true,
  });
  return { userId: session.user.id };
}

async function ensureRivalWorld(gameId: string | undefined): Promise<void> {
  if (!gameId) return;
  const { userId: rivalId } = await ensureRivalSession();

  // Own the premium component BEFORE draft/save/publish — CARD-13 reconciles at every transition.
  await cosmeticService.acquireCosmetic(rivalId, RIVAL_PREMIUM_FONT);

  const mine = await cardService.listMyCards(rivalId);
  let design = mine.items.find((c) => c.name === RIVAL_CARD_NAME && c.gameId === gameId);
  if (!design) {
    const created = await cardService.createDraft(rivalId, {
      gameId,
      composition: RIVAL_COMPOSITION,
      name: RIVAL_CARD_NAME,
    });
    design = created.card;
  }
  if (design.status === 'draft') {
    design = await cardService.savePrivate(rivalId, design.id);
  }
  if (design.status === 'private') {
    design = await cardService.publishCard(rivalId, design.id);
  }
  console.log(
    `seed-dev: rival world ready — ${RIVAL_EMAIL} / ${RIVAL_PASSWORD} · "${RIVAL_CARD_NAME}" ${design.status}` +
      (design.imageUrl ? ` (imageUrl set)` : ' (imageUrl MISSING — publish did not flatten)'),
  );
}

main()
  .then(() => closeDb())
  .catch(async (e) => {
    console.error('seed-dev FAILED:', e);
    await closeDb();
    process.exitCode = 1;
  });
