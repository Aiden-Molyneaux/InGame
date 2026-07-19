import type {
  CatalogItem,
  CreateGameRequest,
  DedupSuggestion,
  FriendsWhoOwnResponse,
  FriendWhoOwns,
  GameDetail,
  GameEditableField,
  GameEditRequest,
  GameEditResponse,
  GameEditView,
  GameEditValue,
  GenreView,
} from '@ingame/shared';
import {
  GAME_EDIT_VALUE_SCHEMAS,
  isEditableGameField,
  normalizeTitle,
  rankDedupCandidates,
  type DedupHit,
} from '@ingame/shared';
import { mutation } from '../db/mutation';
import type { Executor } from '../db/client';
import { isUniqueViolation } from '../db/pg-errors';
import * as catalogRepo from '../repositories/catalog-repo';
import * as gameEditRepo from '../repositories/game-edit-repo';
import * as collectionRepo from '../repositories/collection-repo';
import * as profileRepo from '../repositories/profile-repo';
import * as friendReadRepo from '../repositories/friend-read-repo';
import * as relationshipRepo from '../repositories/relationship-repo';
import {
  AccountTooNewError,
  DuplicateSuspectedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../errors/AppError';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
import { screenText } from '../moderation/screen';
import type { GameEditRow, GameRow, UserRow } from '../db/schema';
import type { LiveGameSlim } from '../repositories/catalog-repo';

// Catalog service (CAT-01..05/09 + the CAT-13/14 wiki edits, M6 W-6). Reads are global-catalog reads
// assembled into the 0.47 search-result item shape; the writes are the CAT-03 dedup-guarded create
// and the CAT-13 apply/revert edit pair (each an @mutation, applied live in its own tx).
// The matcher runs in-service over a slim projection of live rows (D5 hand-rolled trigram — fine at
// v2 community scale; the pg_trgm-indexed upgrade is the known path if the catalog outgrows it).

const SEARCH_LIMIT = 20; // capped, no paging (0.47 — search-as-you-type, like the rails)
const POPULAR_LIMIT = 12; // CAT-09/decision 0019 — capped ~12, no paging
const UPCOMING_LIMIT = 12; // CAT-08 (M6 P7) — capped ~12, no paging, mirrors the popular-rail posture
const FRIENDS_ACTIVE_LIMIT = 12; // CAT-12 (M6 P7, decision 0036) — capped ~12, no paging
const NEW_RELEASES_LIMIT = 12; // CAT-11 (M6 W-C7, OQ-150) — capped ~12, no paging, mirrors popular/upcoming
// Search RECALL is deliberately looser than the create WARN (D5's 0.5): finding "Elden Ring" from
// "eldn rig" is the point of CAT-01+CAT-03 riding search; a candidate list over-including is
// harmless, a create over-refusing is not. A G-K-listed lever like the warn threshold.
const SEARCH_CANDIDATE_THRESHOLD = 0.3;

export async function listGenres(): Promise<{ items: GenreView[] }> {
  const rows = await catalogRepo.listGenres();
  return { items: rows.map((g) => ({ id: g.id, name: g.name })) };
}

function toSuggestion(hit: DedupHit<LiveGameSlim>): DedupSuggestion {
  return {
    id: hit.id,
    name: hit.name,
    studio: hit.studio,
    releaseDate: hit.releaseDate,
    similarity: hit.similarity,
    exact: hit.exact,
  };
}

/** Assemble GameRows into the 0.47 item shape (genres · CAT-09 counts · own-it ✓ · CAT-05 credit). */
async function assembleItems(
  actorId: string,
  rows: GameRow[],
  exec?: Executor,
): Promise<CatalogItem[]> {
  const ids = rows.map((g) => g.id);
  // Sequential on purpose: `exec` may be an open TRANSACTION (one pg client — parallel queries on
  // it are deprecated); four cheap indexed reads.
  const genreRows = await catalogRepo.genresForGames(ids, exec);
  const collections = await collectionRepo.collectionsCountByGame(ids, exec);
  const friendsHave = await collectionRepo.friendsHaveCountByGame(actorId, ids, exec);
  const owned = await collectionRepo.ownedGameIdSet(actorId, ids, exec);

  const genresByGame = new Map<string, GenreView[]>();
  for (const g of genreRows) {
    const list = genresByGame.get(g.gameId) ?? [];
    list.push({ id: g.id, name: g.name });
    genresByGame.set(g.gameId, list);
  }

  // CAT-05 contributor credit — usernames via the scoped by-id read (the F06 philosophy: the row
  // fetch rides the scoped helper; what is EXPOSED is this allowlisted { userId, username } only).
  const contributorIds = [...new Set(rows.map((g) => g.createdBy))];
  const contributors = new Map<string, string>();
  for (const id of contributorIds) {
    const row = exec
      ? await profileRepo.getOwnProfile(id, exec)
      : await profileRepo.getOwnProfile(id);
    contributors.set(id, row?.username ?? 'unknown');
  }

  return rows.map((g) => ({
    id: g.id,
    name: g.name,
    studio: g.studio,
    publisher: g.publisher,
    releaseDate: g.releaseDate,
    genres: genresByGame.get(g.id) ?? [],
    collectionsCount: collections.get(g.id) ?? 0,
    friendsHaveCount: friendsHave.get(g.id) ?? 0,
    inCollection: owned.has(g.id),
    contributor: { userId: g.createdBy, username: contributors.get(g.createdBy) ?? 'unknown' },
  }));
}

function escapeLike(fragment: string): string {
  return fragment.replace(/[\\%_]/g, '\\$&');
}

/** CAT-01 — substring matches ∪ CAT-03 near-candidates (a typo still finds the game), capped. */
export async function search(actorId: string, q: string): Promise<{ items: CatalogItem[] }> {
  const normalized = normalizeTitle(q);
  if (normalized.length === 0) return { items: [] };

  const [substringRows, pool] = await Promise.all([
    catalogRepo.searchLiveByNormalized(escapeLike(normalized), SEARCH_LIMIT),
    catalogRepo.listLiveGamesSlim(),
  ]);
  const candidates = rankDedupCandidates(q, pool, { threshold: SEARCH_CANDIDATE_THRESHOLD });

  const orderedIds: string[] = [];
  for (const row of substringRows) orderedIds.push(row.id);
  for (const hit of candidates) if (!orderedIds.includes(hit.id)) orderedIds.push(hit.id);
  const ids = orderedIds.slice(0, SEARCH_LIMIT);

  const rows = await catalogRepo.gamesByIds(ids);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = ids.map((id) => byId.get(id)).filter((r): r is GameRow => Boolean(r));
  return { items: await assembleItems(actorId, ordered) };
}

/** CAT-09 — the POPULAR FIRST ADDS rail: most-collected first, capped ~12 (decision 0019). */
export async function popular(actorId: string): Promise<{ items: CatalogItem[] }> {
  const pool = await catalogRepo.listLiveGamesSlim();
  const counts = await collectionRepo.collectionsCountByGame(pool.map((g) => g.id));
  const topIds = pool
    .map((g) => ({ id: g.id, name: g.name, n: counts.get(g.id) ?? 0 }))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
    .slice(0, POPULAR_LIMIT)
    .map((g) => g.id);
  const rows = await catalogRepo.gamesByIds(topIds);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = topIds.map((id) => byId.get(id)).filter((r): r is GameRow => Boolean(r));
  return { items: await assembleItems(actorId, ordered) };
}

/**
 * CAT-08 — GET /catalog/upcoming (M6 P7): LIVE-catalog entries with a FUTURE releaseDate, soonest
 * first, capped ~12, no paging — mirrors `popular()`'s shape/limit posture (the actual sibling in
 * code; the api-contract-drawn `/catalog/new-releases` sibling this endpoint was briefed against is
 * NOT YET BUILT anywhere in the API — flagged to the orchestrator as a planning/reality drift, not
 * this packet's to fix). The notify-me fields (DISC-01/NOTIF-01) are OMITTED at M6 by design (0076
 * §0.8: "notify-me toggles defer to M7, inert without push") — this serves the plain search-result
 * shape only.
 */
export async function upcoming(actorId: string): Promise<{ items: CatalogItem[] }> {
  const today = new Date().toISOString().slice(0, 10); // stable UTC yyyy-mm-dd boundary
  const rows = await catalogRepo.upcomingLive(today, UPCOMING_LIMIT);
  return { items: await assembleItems(actorId, rows) };
}

/**
 * CAT-11 — GET /catalog/new-releases (M6 W-C7, OQ-150; decision 0062 slotted the rail): recently-RELEASED
 * catalog entries (`releaseDate` at-or-before today — a game releasing TODAY has released), most-recent
 * first, capped ~12, no paging — the exact complement of `upcoming()` (future dates) in the same
 * search-result shape (incl. the CAT-09 collectionsCount/friendsHaveCount). Backs the onboarding/Add-Game
 * NEW RELEASES add-rail (AUTH-06), a sibling of `/catalog/popular`.
 */
export async function newReleases(actorId: string): Promise<{ items: CatalogItem[] }> {
  const today = new Date().toISOString().slice(0, 10); // stable UTC yyyy-mm-dd boundary (mirrors upcoming)
  const rows = await catalogRepo.newReleasesLive(today, NEW_RELEASES_LIMIT);
  return { items: await assembleItems(actorId, rows) };
}

/**
 * CAT-12 — GET /catalog/friends-active (M6 P7, decision 0036/0076 §0.8): the "FRIENDS ARE PLAYING"
 * Add-Game rail — catalog entries the actor's accepted friends own that the actor does NOT, ranked by
 * `friendsHaveCount` desc (ties broken by name, the `popular()` tie-break), capped ~12. Blocked friends
 * are severed by construction (`friendsActiveGameCounts` rides `friendScoped`, and a block severs the
 * friendship both directions — SOC-09 needs no special-casing here). `assembleItems` re-derives the
 * final `friendsHaveCount` per item from the SAME friend cohort (collectionRepo.friendsHaveCountByGame)
 * so the served count always matches the rest of the search-result shape.
 */
export async function friendsActive(actorId: string): Promise<{ items: CatalogItem[] }> {
  const counts = await friendReadRepo.friendsActiveGameCounts(actorId);
  if (counts.size === 0) return { items: [] };
  const candidateIds = [...counts.keys()];
  const [owned, rows] = await Promise.all([
    collectionRepo.ownedGameIdSet(actorId, candidateIds),
    catalogRepo.gamesByIds(candidateIds),
  ]);
  const ordered = rows
    .filter((g) => !owned.has(g.id))
    .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || a.name.localeCompare(b.name))
    .slice(0, FRIENDS_ACTIVE_LIMIT);
  return { items: await assembleItems(actorId, ordered) };
}

/**
 * CAT-09c — GET /catalog/games/:id/friends-who-own: the VIEWER's accepted friends who own the game +
 * their hours (PROF-03-gated). Rooted at the actor's friend set (friendReadRepo.friendsWhoOwnGame uses
 * the SYS-01-FRIEND-READ friendScoped gate), so a blocked friend is absent by construction (a block
 * severs the friendship — SOC-09). An unknown game → 404 (it isn't in the catalog). `count` is the named
 * list length (at M6 every visible friend who owns it is named — the count-only fallback is the PROF-03
 * seam for a future per-facet hours-privacy setting). SEAM: the contract draws this on GET /catalog/
 * games/:id (the aggregate game-detail endpoint, not yet built) — served here as a focused route.
 */
export async function friendsWhoOwn(actorId: string, gameId: string): Promise<FriendsWhoOwnResponse> {
  if (!UUID_RE.test(gameId)) throw new NotFoundError('Game not found.');
  const [game] = await catalogRepo.gamesByIds([gameId]);
  if (!game) throw new NotFoundError('Game not found.');
  const friendsWhoOwn = await friendsWhoOwnList(actorId, gameId);
  return { friendsWhoOwn, count: friendsWhoOwn.length };
}

/**
 * The CAT-09c named list body — shared by the focused `friendsWhoOwn` route AND the `gameDetail` aggregate
 * so the PROF-03 gating + SOC-09 block filter live in ONE place. The caller has ALREADY verified the game
 * exists (the 404 is the caller's; this helper never re-reads it). Rooted at the actor's accepted-friend
 * set (friendReadRepo.friendsWhoOwnGame rides the SYS-01-FRIEND-READ friendScoped gate).
 */
async function friendsWhoOwnList(actorId: string, gameId: string): Promise<FriendWhoOwns[]> {
  const rows = await friendReadRepo.friendsWhoOwnGame(actorId, gameId);
  // SOC-09 defense-in-depth — a block hides the person even if a stray accepted-friendship row survived
  // (in prod a block severs the bond, so friendScoped already excludes them; this is the belt-and-braces
  // the SOC-09 sweep asks for — blocked-either-direction is filtered regardless of the friendship state).
  const blocked = await relationshipRepo.listBlockedIds(actorId, rows.map((r) => r.userId));
  const visible = blocked.size === 0 ? rows : rows.filter((r) => !blocked.has(r.userId));
  return visible.map((r) => ({
    userId: r.userId,
    username: r.username,
    avatarUrl: r.avatarUrl,
    hours: r.hours, // PROF-03: exposed to a friend at M6 (the per-facet hide toggle is a future seam)
  }));
}

/**
 * CAT-05/09/09c — GET /catalog/games/:id, the game-detail AGGREGATE (M6 W-C5; the P2/P7-flagged hole).
 * The canonical facts + genres + CAT-05 contributor + CAT-09 counts + the own-it flag (the assembleItems
 * search-result shape) PLUS the CAT-09c named `friendsWhoOwn` list (folded in from the same friendScoped
 * read as the focused route — PROF-03-gated, blocked severed). The ABOUT-tab + CATALOG/OWN/FRIEND
 * Game-page data source (W-D1). The community CARD GALLERY is deliberately NOT here — it is its own route
 * (GET /games/:id/cards); this aggregate is the canonical facts + counts + friends only. Unknown id → 404.
 */
export async function gameDetail(actorId: string, gameId: string): Promise<GameDetail> {
  if (!UUID_RE.test(gameId)) throw new NotFoundError('Game not found.');
  const [game] = await catalogRepo.gamesByIds([gameId]);
  if (!game) throw new NotFoundError('Game not found.');
  const [item] = await assembleItems(actorId, [game]);
  const friendsWhoOwn = await friendsWhoOwnList(actorId, gameId);
  // CAT-14 (M6 W-6) — the `lastEdit` attribution: the latest `game_edits` row's editor + moment
  // (a reversal row is itself an edit, so it naturally wins). ABSENT when never edited — derived,
  // no games-table change. Username via the scoped by-id read, exposed as the { userId, username }
  // allowlist only (the CAT-05 credit's F06 posture).
  const last = await gameEditRepo.latestEditForGame(gameId);
  if (!last) return { ...item!, friendsWhoOwn };
  const editorRow = await profileRepo.getOwnProfile(last.editorId);
  return {
    ...item!,
    friendsWhoOwn,
    lastEdit: {
      editor: { userId: last.editorId, username: editorRow?.username ?? 'unknown' },
      editedAt: last.editedAt.toISOString(),
    },
  };
}

function screenedField(path: string, value: string | undefined): void {
  if (value !== undefined && !screenText(value)) {
    throw new ValidationError('That text isn’t allowed.', 'screened', [
      { path, message: 'That text isn’t allowed.' },
    ]);
  }
}

/**
 * @mutation — POST /catalog/games (CAT-02/03/04/05). Genres validated against the controlled list;
 * name/studio/publisher screened (MOD-07); the CAT-03 dedup warn refuses with candidates unless
 * overridden (exact-normalized never overridable — decision 0058). The DB's partial unique index on
 * normalized_name is the F36 race decider; a losing INSERT surfaces as DUPLICATE_SUSPECTED too.
 */
const createGameMutation = mutation(
  {
    name: 'catalog.createGame',
    specIds: ['CAT-02', 'CAT-03', 'CAT-04', 'CAT-05', 'MOD-07', 'SYS-01', 'SYS-02'],
  },
  async (ctx, actorId, input: CreateGameRequest): Promise<CatalogItem> => {
    screenedField('name', input.name);
    screenedField('studio', input.studio);
    screenedField('publisher', input.publisher);

    const genreIds = [...new Set(input.genreIds)];
    const known = await catalogRepo.genresByIds(genreIds, ctx.tx);
    if (known.length !== genreIds.length) {
      throw new ValidationError('Unknown genre.', 'unknown_genre', [
        { path: 'genreIds', message: 'Contains a genre that is not on the controlled list.' },
      ]);
    }

    const pool = await catalogRepo.listLiveGamesSlim(ctx.tx);
    const hits = rankDedupCandidates(input.name, pool);
    const blocked = hits.length > 0 && (!input.dedupOverride || hits.some((h) => h.exact));
    if (blocked) throw new DuplicateSuspectedError(hits.map(toSuggestion));

    const game = await catalogRepo.insertGame(
      {
        name: input.name,
        normalizedName: normalizeTitle(input.name),
        studio: input.studio ?? null,
        publisher: input.publisher ?? null,
        releaseDate: input.releaseDate ?? null,
        createdBy: actorId,
      },
      ctx.tx,
    );
    await catalogRepo.insertGameGenres(game.id, genreIds, ctx.tx);

    await ctx.emit({
      eventType: 'catalog.game_created',
      entityRef: { type: 'game', id: game.id },
      payload: {}, // ids ride the envelope; no free text in the event spine (F18)
    });

    const [item] = await assembleItems(actorId, [game], ctx.tx);
    return item!;
  },
);

export async function createGame(actorId: string, input: CreateGameRequest): Promise<CatalogItem> {
  try {
    return await createGameMutation(actorId, input);
  } catch (e) {
    // The F36 race loser: the partial unique index refused the same normalized title. The failed tx
    // is already rolled back — re-rank on a FRESH read so the client gets the winner as a suggestion.
    if (isUniqueViolation(e)) {
      const pool = await catalogRepo.listLiveGamesSlim();
      throw new DuplicateSuspectedError(rankDedupCandidates(input.name, pool).map(toSuggestion));
    }
    throw e;
  }
}

// ── CAT-13/14 — wiki-live game editing + revert (M6 W-6, game-edit-wiki-draft; owner-signed) ───────

/** A1 — the 14-day editor age-gate (role='admin' EXEMPT). SYS-04-tunable; G-K async. */
const GAME_EDIT_MIN_ACCOUNT_AGE_MS = 14 * 24 * 60 * 60_000;

/**
 * A1 — resolve the actor + enforce editor standing: the account must be ≥ 14 days old unless the
 * actor is an admin (the role column is live). The client pre-gates with the quiet disabled EDIT
 * key; THIS is the enforcement.
 */
async function requireEditorStanding(actorId: string, exec: Executor): Promise<UserRow> {
  const actor = await profileRepo.getOwnProfile(actorId, exec);
  if (!actor) throw new NotFoundError('Account not found.');
  if (actor.role !== 'admin' && Date.now() - actor.createdAt.getTime() < GAME_EDIT_MIN_ACCOUNT_AGE_MS) {
    throw new AccountTooNewError();
  }
  return actor;
}

/** History values compare canonically: genre arrays are sorted at write, so JSON equality decides. */
function sameEditValue(a: GameEditValue, b: GameEditValue): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function toEditView(row: GameEditRow, editorUsername: string): GameEditView {
  return {
    id: row.id,
    gameId: row.gameId,
    field: row.field as GameEditableField,
    oldValue: row.oldValue ?? null,
    newValue: row.newValue ?? null,
    editor: { userId: row.editorId, username: editorUsername },
    editedAt: row.editedAt.toISOString(),
    status: row.status as 'live' | 'reverted',
  };
}

/** The current canonical value of an editable field (genres = the SORTED id array, the history form). */
async function currentFieldValue(
  game: GameRow,
  field: GameEditableField,
  exec: Executor,
): Promise<GameEditValue> {
  if (field === 'genres') return (await gameEditRepo.genreIdsForGame(game.id, exec)).sort();
  return game[field];
}

/** Apply a (new or replayed-old) value onto the canonical row — the same-tx wiki-live write. */
async function applyFieldValue(
  gameId: string,
  field: GameEditableField,
  value: GameEditValue,
  exec: Executor,
): Promise<void> {
  if (field === 'genres') {
    await gameEditRepo.replaceGameGenres(gameId, value as string[], exec);
    return;
  }
  await gameEditRepo.updateGameFields(gameId, { [field]: value as string | null }, exec);
}

/**
 * @mutation — POST /catalog/games/:id/edits (CAT-13/14). One field per request; the request IS the
 * history row, applied LIVE in the same tx. The stage-2 value parse (shared zod) + MOD-07 screening +
 * the CAT-04 controlled-list check mirror create; `name` (and anything off the editable set) refuses
 * with the NAMED 422 `uneditable_field` — the title is dedup identity (CAT-03), fixed via report →
 * admin MOD-14, never here. Concurrency is last-write-wins by design (draft §4 [owner-nod]) — no
 * CAS/baseValue; the loser's value sits intact in history one revert away.
 */
const applyGameEditMutation = mutation(
  {
    name: 'catalog.applyGameEdit',
    specIds: ['CAT-13', 'CAT-14', 'CAT-04', 'MOD-07', 'SYS-01', 'SYS-02', 'SYS-05'],
  },
  async (ctx, actorId, gameId: string, input: GameEditRequest): Promise<GameEditRow> => {
    if (!isEditableGameField(input.field)) {
      throw new ValidationError('That field can’t be edited.', 'uneditable_field', [
        { path: 'field', message: 'Only studio, publisher, releaseDate, and genres are editable.' },
      ]);
    }
    const field = input.field;

    // Stage 2 — the per-field value rules (shared zod; the route already parsed the envelope).
    const parsed = GAME_EDIT_VALUE_SCHEMAS[field].safeParse(input.newValue);
    if (!parsed.success) throw parsed.error; // → 422 VALIDATION_ERROR (+ B1 details)
    let newValue = parsed.data as GameEditValue;

    await requireEditorStanding(actorId, ctx.tx); // A1 — 14-day gate, admins exempt

    const [game] = await catalogRepo.gamesByIds([gameId], ctx.tx);
    if (!game) throw new NotFoundError('Game not found.');

    if (field === 'studio' || field === 'publisher') {
      screenedField(field, (newValue as string | null) ?? undefined); // MOD-07
    }
    if (field === 'genres') {
      const genreIds = [...new Set(newValue as string[])];
      const known = await catalogRepo.genresByIds(genreIds, ctx.tx);
      if (known.length !== genreIds.length) {
        throw new ValidationError('Unknown genre.', 'unknown_genre', [
          { path: 'newValue', message: 'Contains a genre that is not on the controlled list.' },
        ]);
      }
      newValue = genreIds.sort(); // the canonical (sorted) history form
    }

    const oldValue = await currentFieldValue(game, field, ctx.tx);
    if (sameEditValue(oldValue, newValue)) {
      // The no-op guard — don't pollute the append-only history with zero-diff rows (draft §1.1).
      throw new ValidationError('Nothing changed.', 'no_change', [
        { path: 'newValue', message: 'The new value equals the current one.' },
      ]);
    }

    const edit = await gameEditRepo.insertGameEdit(
      { gameId, editorId: actorId, field, oldValue, newValue, status: 'live' },
      ctx.tx,
    );
    await applyFieldValue(gameId, field, newValue, ctx.tx);

    await ctx.emit({
      eventType: 'catalog.game_edited',
      entityRef: { type: 'game', id: gameId },
      payload: { field }, // the pinned field enum only — old/new user text stays off the spine (F18)
    });
    return edit;
  },
);

export async function submitGameEdit(
  actorId: string,
  gameId: string,
  input: GameEditRequest,
): Promise<GameEditResponse> {
  if (!UUID_RE.test(gameId)) throw new NotFoundError('Game not found.');
  const edit = await applyGameEditMutation(actorId, gameId, input);
  // Post-commit: assemble the APPLIED GameDetail (the one-round-trip client reconcile) + the
  // editor's username for the edit view (the actor's own row — a self read).
  const editor = await profileRepo.getOwnProfile(actorId);
  const game = await gameDetail(actorId, gameId);
  return { edit: toEditView(edit, editor?.username ?? 'unknown'), game };
}

/**
 * @mutation — POST /catalog/games/:id/edits/:editId/revert (CAT-14). Replays `oldValue` onto the
 * game, stamps the target row reverted (conditionally — the F36 double-revert race decider), and
 * writes a NEW reversal row (editor = the reverter, old/new swapped) so the history stays a
 * complete, append-only account and a revert is itself visible and re-revertible. Rights (A3):
 * the edit's own editor · the game's CAT-05 contributor · admins (admin-standing revert writes the
 * MOD-10 audit row).
 */
const revertGameEditMutation = mutation(
  {
    name: 'catalog.revertGameEdit',
    specIds: ['CAT-14', 'MOD-10', 'SYS-01', 'SYS-07'],
  },
  async (ctx, actorId, gameId: string, editId: string): Promise<GameEditRow> => {
    const [game] = await catalogRepo.gamesByIds([gameId], ctx.tx);
    if (!game) throw new NotFoundError('Game not found.');
    const edit = await gameEditRepo.getEditById(editId, ctx.tx);
    if (!edit || edit.gameId !== gameId) throw new NotFoundError('Edit not found.');

    // A3 — revert entitlement: editor-self · the game's contributor · admins. Everyone else has the
    // report signal (the correct escalation for "two users disagree" — draft §2.4 [owner-nod]).
    const isSelf = edit.editorId === actorId;
    const isContributor = game.createdBy === actorId;
    let adminStanding = false;
    if (!isSelf && !isContributor) {
      const actor = await profileRepo.getOwnProfile(actorId, ctx.tx);
      if (actor?.role !== 'admin') {
        throw new ForbiddenError(
          'Only the editor, the game’s contributor, or an admin can revert this edit.',
        );
      }
      adminStanding = true;
    }

    // Conditional stamp — status='live' guards the F36 double-revert race: the loser sees no row.
    const stamped = await gameEditRepo.markReverted(editId, actorId, ctx.tx);
    if (!stamped) {
      throw new ValidationError('That edit was already reverted.', 'already_reverted', [
        { path: 'editId', message: 'This history row is no longer live.' },
      ]);
    }

    await applyFieldValue(gameId, edit.field as GameEditableField, edit.oldValue ?? null, ctx.tx);
    const reversal = await gameEditRepo.insertGameEdit(
      {
        gameId,
        editorId: actorId,
        field: edit.field,
        oldValue: edit.newValue ?? null,
        newValue: edit.oldValue ?? null,
        status: 'live',
      },
      ctx.tx,
    );

    // MOD-10 — an ADMIN-standing revert (not self, not contributor) is a privileged write: logged.
    if (adminStanding) {
      await ctx.audit({
        action: 'catalog.game_edit_reverted',
        target: { type: 'game_edit', id: edit.id },
      });
    }

    await ctx.emit({
      eventType: 'catalog.game_edited',
      entityRef: { type: 'game', id: gameId },
      payload: { field: edit.field, revertedEditId: edit.id }, // ids + the pinned enum only (F18)
    });
    return reversal;
  },
);

export async function revertGameEdit(
  actorId: string,
  gameId: string,
  editId: string,
): Promise<GameEditResponse> {
  if (!UUID_RE.test(gameId) || !UUID_RE.test(editId)) throw new NotFoundError('Edit not found.');
  const reversal = await revertGameEditMutation(actorId, gameId, editId);
  const reverter = await profileRepo.getOwnProfile(actorId);
  const game = await gameDetail(actorId, gameId);
  return { edit: toEditView(reversal, reverter?.username ?? 'unknown'), game };
}
