/**
 * DEV / LOAD-HARNESS (M6, UNCOMMITTED) — the CARD-VOLUME seed generator ("vol-seed").
 *
 * Creates users vol_50 / vol_200 / vol_1000 / vol_2000, each with N PUBLISHED custom cards, so the
 * measurement half (vol-measure) can profile how the app scales at 50 / 200 / 1000 / 2000 cards.
 *
 * HONESTY: every card goes through the REAL service layer publish (createDraft -> savePrivate ->
 * publishCard), so `flattenComposition` actually runs and writes full.png + thumb.png to storage —
 * the PNGs the image-path measurement HEAD/GETs are genuine server renders, not fakes. The seed run
 * IS the first flatten stress test: it reports cards/sec (flatten throughput) as its first datapoint.
 *
 * SETUP-vs-MEASURED split: the GAMES are scaffolding (a collection needs one entry per game), so they
 * are inserted straight through the repo (catalogRepo.insertGame) — deliberately bypassing
 * catalog-service's O(catalog-size) dedup trigram scan, which is itself a scaling finding but not what
 * this harness measures. The cards — the thing under test — go through the full guarded service path.
 *
 * DISPOSABLE-ONLY: assertDisposableDb() fires first (F03). Point DATABASE_URL at a `local_`/`test_`/
 * `staging_`-named or DISPOSABLE_DB=1 database ONLY. NEVER local_ingame (the owner's real dev data).
 *
 * Run (from apps/api):
 *   tsx --env-file=<scratch>/vol.env scripts/vol-seed.ts [--tiers 50,200,1000,2000] [--manifest <path>]
 *
 * Interleaved per game (addEntry -> publish -> equip) and ascending by tier, so a mid-run stop leaves
 * every seeded entry consistent (carded) and the smaller tiers complete — graceful degradation if
 * 2000 real flattens prove too slow on a shared box.
 */
import { writeFileSync } from 'node:fs';
import { normalizeTitle, COMPOSITION_SCHEMA_VERSION, type Composition } from '@ingame/shared';
import { assertDisposableDb } from '../src/db/destructive-guard';
import { getDb, closeDb } from '../src/db/client';
import * as catalogRepo from '../src/repositories/catalog-repo';
import * as authService from '../src/services/auth-service';
import * as collectionService from '../src/services/collection-service';
import * as cardService from '../src/services/card-service';

const PASSWORD = 'InGameDemo1!'; // dev-only scratch credential (known-good against the register policy)
const GAME_PREFIX = 'VolLoad Game';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const TIERS = (arg('tiers') ?? '50,200,1000,2000')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n) && n > 0)
  .sort((a, b) => a - b);
const MANIFEST_PATH = arg('manifest') ?? 'vol-users.json';

const hex = (n: number): string => `#${(n & 0xffffff).toString(16).padStart(6, '0')}`;

/** A globally-unique free composition — the `V<counter>` text + index-varied colours guarantee a unique
 *  compositionHash (publish is globally hash-deduped) and modestly-varied bytes (task: not byte-identical).
 *  All components are free (soft-glow, no premium fontId/iconId) so CARD-13 premium-reconcile is a no-op. */
function compositionFor(counter: number, gameName: string): Composition {
  const a = (counter * 2654435761) >>> 0;
  return {
    schemaVersion: COMPOSITION_SCHEMA_VERSION,
    base: { gradient: [hex(a), hex(a * 7 + 0x101010)] },
    elements: [
      { type: 'poly', shape: 'star', x: 0.5, y: 0.34, w: 0.5, h: 0.5, fill: hex(a * 3 + 0x22ccaa) },
      { type: 'rect', x: 0.5, y: 0.62, w: 0.6, h: 0.03, fill: hex(a * 5 + 0x3355ff) },
      { type: 'ellipse', x: 0.7, y: 0.2, w: 0.14, h: 0.14, fill: hex(a * 11 + 0x88ddee) },
      { type: 'text', x: 0.5, y: 0.5, text: `V${counter}`, size: 0.06, fill: '#f3ecd9' },
    ],
    frame: { color: hex(a * 13 + 0xe8c14a), width: 0.012 },
    nameplate: { title: gameName.toUpperCase(), plate: '#141026', ink: '#f3ecd9', size: 0.05 },
    effect: { kind: 'soft-glow', intensity: 0.5 },
  } as Composition;
}

interface SeededUser {
  tier: number;
  email: string;
  username: string;
  userId: string;
  seeded: number;
}

async function ensureUser(tier: number): Promise<{ userId: string; email: string; username: string }> {
  const email = `vol_${tier}@volload.test`;
  const username = `vol_${tier}`;
  try {
    const s = await authService.register({ email, username, password: PASSWORD, acceptedTerms: true });
    return { userId: s.user.id, email, username };
  } catch {
    const s = await authService.login({ email, password: PASSWORD });
    return { userId: s.user.id, email, username };
  }
}

/** Ensure a shared pool of `count` distinct live games exists (repo-direct — fast scaffolding). Idempotent
 *  by normalized name: reads the existing VolLoad games first and only inserts the shortfall. */
async function ensureGamePool(count: number, createdBy: string): Promise<string[]> {
  const db = getDb();
  const genres = await catalogRepo.listGenres();
  if (genres.length === 0) throw new Error('vol-seed: no genres in the catalog — did db:migrate run?');
  const genreId = genres[0]!.id;

  const existing = await catalogRepo.listLiveGamesSlim();
  const byName = new Map(existing.map((g) => [g.name, g.id]));
  const ids: string[] = [];
  let inserted = 0;
  for (let i = 0; i < count; i++) {
    const name = `${GAME_PREFIX} ${String(i).padStart(4, '0')}`;
    let id = byName.get(name);
    if (!id) {
      const game = await catalogRepo.insertGame(
        {
          name,
          normalizedName: normalizeTitle(name),
          studio: 'VolLoad Studio',
          publisher: 'VolLoad',
          releaseDate: '2024-01-01',
          createdBy,
        },
        db,
      );
      await catalogRepo.insertGameGenres(game.id, [genreId], db);
      id = game.id;
      inserted++;
    }
    ids.push(id);
  }
  console.log(`vol-seed: game pool ready — ${count} games (${inserted} newly inserted)`);
  return ids;
}

async function main(): Promise<void> {
  assertDisposableDb(); // F03 — disposable DBs only, fail closed
  const maxTier = Math.max(...TIERS);
  console.log(`vol-seed: tiers=[${TIERS.join(', ')}] · target flattens=${TIERS.reduce((a, b) => a + b, 0)}`);

  // Users first (the first user creates the shared game pool as its contributor).
  const users: SeededUser[] = [];
  for (const tier of TIERS) {
    const u = await ensureUser(tier);
    users.push({ ...u, tier, seeded: 0 });
    console.log(`vol-seed: user ready — ${u.email} (${u.userId})`);
  }
  const gameIds = await ensureGamePool(maxTier, users[0]!.userId);

  // Publish loop — the flatten stress test. Interleave add -> publish -> equip per game.
  let globalCounter = 0;
  const t0 = Date.now();
  let flattens = 0;
  for (const user of users) {
    // Idempotent resume: skip games already carded in this user's collection.
    const existingShelf = await collectionService.listCollection(user.userId);
    const cardedGameIds = new Set(
      existingShelf.items.filter((i) => i.card?.isCustom).map((i) => i.gameId),
    );
    const batchStart = Date.now();
    let batchFlattens = 0;
    for (let i = 0; i < user.tier; i++) {
      const gameId = gameIds[i]!;
      globalCounter++;
      if (cardedGameIds.has(gameId)) {
        user.seeded++;
        continue;
      }
      // addEntry (idempotent — already_in_collection is tolerated)
      let entryId: string;
      try {
        entryId = (await collectionService.addEntry(user.userId, { gameId })).entryId;
      } catch {
        const shelf = await collectionService.listCollection(user.userId);
        entryId = shelf.items.find((it) => it.gameId === gameId)!.entryId;
      }
      // createDraft -> savePrivate -> publishCard (REAL flatten) -> equip
      const gameName = `${GAME_PREFIX} ${String(i).padStart(4, '0')}`;
      const draft = await cardService.createDraft(user.userId, {
        gameId,
        composition: compositionFor(globalCounter, gameName),
        name: `${gameName} — vol${user.tier}`,
      });
      await cardService.savePrivate(user.userId, draft.card.id);
      const published = await cardService.publishCard(user.userId, draft.card.id);
      await collectionService.updateEntry(user.userId, entryId, { activeCardDesignId: published.id });
      flattens++;
      batchFlattens++;
      user.seeded++;
      if (batchFlattens % 25 === 0) {
        const rate = (batchFlattens / ((Date.now() - batchStart) / 1000)).toFixed(2);
        console.log(`vol-seed:   ${user.email}  ${batchFlattens}/${user.tier}  (${rate} cards/sec)`);
      }
    }
    const secs = (Date.now() - batchStart) / 1000;
    const rate = batchFlattens > 0 ? (batchFlattens / secs).toFixed(2) : 'n/a';
    console.log(
      `vol-seed: ${user.email} DONE — ${user.seeded}/${user.tier} carded · ${batchFlattens} new flattens in ${secs.toFixed(1)}s (${rate} cards/sec)`,
    );
  }
  const totalSecs = (Date.now() - t0) / 1000;
  const overall = flattens > 0 ? (flattens / totalSecs).toFixed(2) : 'n/a';
  console.log(
    `\nvol-seed: FLATTEN THROUGHPUT — ${flattens} real flattens in ${totalSecs.toFixed(1)}s = ${overall} cards/sec`,
  );
  if (flattens > 0) {
    const per2000 = ((2000 * totalSecs) / flattens).toFixed(0);
    console.log(`vol-seed: at this rate, 2000 flattens ≈ ${per2000}s`);
  }

  writeFileSync(
    MANIFEST_PATH,
    JSON.stringify(
      { password: PASSWORD, seededAt: new Date().toISOString(), users: users.map(({ tier, email, username, userId, seeded }) => ({ tier, email, username, userId, seeded })) },
      null,
      2,
    ),
  );
  console.log(`vol-seed: manifest -> ${MANIFEST_PATH}`);
}

main()
  .then(() => closeDb())
  .catch(async (e) => {
    console.error('vol-seed FAILED:', e);
    await closeDb();
    process.exitCode = 1;
  });
