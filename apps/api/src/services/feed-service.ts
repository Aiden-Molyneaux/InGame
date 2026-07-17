import type { FeedItem, FeedItemType, FeedObject, FeedResponse } from '@ingame/shared';
import { feedWindowMsValue } from '../config/social';
import * as feedRepo from '../repositories/feed-repo';
import type { FriendEventRow } from '../repositories/feed-repo';
import * as catalogRepo from '../repositories/catalog-repo';
import * as cardRepo from '../repositories/card-repo';
import * as friendReadRepo from '../repositories/friend-read-repo';

// SOC-06 aggregated friend-activity feed (M6 P4, OQ-071). Computed at REQUEST TIME from the ACH-08
// `domain_events` outbox over the actor's ACCEPTED friends (feed-repo, the SYS-01-FRIEND-READ class).
//
// SCALE POSTURE (decision #4): NO materialized feed table at M6 — the beta cohort is ≤20 users, so a
// read-time scan + in-memory aggregation is ample and simpler (a fan-out/materialized feed is an M7+
// concern if the cohort grows). The raw scan is bounded by FEED_EVENT_SCAN_CAP.
//
// LOW-NOISE (SOC-06): events are AGGREGATED BY actor+type into FIXED wall-clock windows (config
// FEED_WINDOW_MS) — one item per (actor, type, window). An import BURST (100 adds in one window) collapses
// to ONE `added_games` item with aggregateCount 100 + a ≤3 peek (import-flood suppression). TRIVIA is
// excluded: an `entry_updated` event feeds ONLY when its payload carries a status FLIP to beaten/completed
// (P4 design — the widened `collection.entry_updated` payload); a stat-only edit (hours) has no `status`
// and never maps to a feed type.
//
// CURSOR (decision #4): a keyset over the IMMUTABLE sort key `(windowStart desc, actorId asc, type asc)`.
// windowStart is fixed per bucket, so a concurrent insert only bumps an existing bucket's `aggregateCount`
// (never moves its sort key) or lands in a new bucket — so pagination never dupes or skips the tail. The
// cursor is an opaque base64url of `{ w: windowStartMs, a: actorId, t: type }`.

const FEED_PAGE_SIZE = 20;
// Beta-scale bound on the in-memory aggregation scan (the ≤20-user cohort produces far fewer events; a
// materialized feed replaces this if the cohort ever outgrows a request-time scan — M7+). SYS-04 spirit.
const FEED_EVENT_SCAN_CAP = 5000;

// The domain-event types the feed reads (everything else — reorders, equips, now-playing, blocks, invites,
// recommendations, wallet, iap — is NOT friend-activity and never scanned). `achievement.unlocked` is
// mapped now even though P6 emits it later: the feed renders it the day the engine lands (a fixture event
// proves the mapping today).
const FEED_SOURCE_EVENT_TYPES = [
  'collection.entry_added',
  'collection.entry_updated',
  'card.published',
  'achievement.unlocked',
] as const;

interface MappedEvent {
  actorId: string;
  actorUsername: string;
  actorAvatarUrl: string | null;
  type: FeedItemType;
  occurredAt: Date;
  /** The object ref this event contributes (a gameId, a cardId, or an achievementId + optional label). */
  ref: { gameId?: string; cardId?: string; achievementId?: string; label?: string };
}

/** Map one raw friend event to a feed event, or `null` (trivia / irrelevant → excluded). */
function mapEvent(e: FriendEventRow): MappedEvent | null {
  const base = {
    actorId: e.actorId,
    actorUsername: e.actorUsername,
    actorAvatarUrl: e.actorAvatarUrl,
    occurredAt: e.occurredAt,
  };
  const p = e.payload;
  switch (e.eventType) {
    case 'collection.entry_added': {
      const gameId = typeof p.gameId === 'string' ? p.gameId : undefined;
      if (!gameId) return null;
      return { ...base, type: 'added_games', ref: { gameId } };
    }
    case 'collection.entry_updated': {
      // TRIVIA EXCLUSION: only a status FLIP to beaten/completed feeds (the widened payload carries the new
      // `status` value ONLY when status changed — a stat-only edit has no `status` and drops here).
      const status = typeof p.status === 'string' ? p.status : undefined;
      const gameId = typeof p.gameId === 'string' ? p.gameId : undefined;
      if (!gameId) return null;
      if (status === 'beaten') return { ...base, type: 'beat_game', ref: { gameId } };
      if (status === 'completed') return { ...base, type: 'completed_game', ref: { gameId } };
      return null; // hours/other edits — trivia, excluded
    }
    case 'card.published': {
      const gameId = typeof p.gameId === 'string' ? p.gameId : undefined;
      return { ...base, type: 'published_card', ref: { cardId: e.entityId, gameId } };
    }
    case 'achievement.unlocked': {
      // OQ-148 (§4 privacy-audit ruling, M6 default — conservative): a SECRET-tier unlock must NOT name
      // the egg in friends' feeds (it would spoil the `???` for those who haven't found it). The P6
      // engine stamps `kind` on the payload; mask a secret's label, keep a standard/prestige name.
      const isSecret = p.kind === 'secret';
      const named = typeof p.label === 'string' ? p.label : typeof p.title === 'string' ? p.title : undefined;
      const label = isSecret ? 'a secret achievement' : named;
      return { ...base, type: 'unlocked_achievement', ref: { achievementId: e.entityId, label } };
    }
    default:
      return null;
  }
}

interface Bucket {
  actorId: string;
  actorUsername: string;
  actorAvatarUrl: string | null;
  type: FeedItemType;
  windowStartMs: number;
  count: number;
  latestOccurredAt: Date;
  /** Distinct object refs in newest-first order (the events arrive newest-first from the repo). */
  refs: MappedEvent['ref'][];
  seen: Set<string>;
}

const refKey = (r: MappedEvent['ref']): string => r.cardId ?? r.gameId ?? r.achievementId ?? '';

function encodeCursor(item: FeedItem): string {
  const windowStartMs = Date.parse(item.windowStart);
  const payload = JSON.stringify({ w: windowStartMs, a: item.actor.userId, t: item.type });
  return Buffer.from(payload, 'utf8').toString('base64url');
}

interface DecodedCursor {
  w: number;
  a: string;
  t: string;
}

/** Decode the opaque keyset cursor; a malformed cursor reads as "from the beginning" (null). */
function decodeCursor(cursor: string | undefined): DecodedCursor | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as DecodedCursor;
    if (typeof parsed.w === 'number' && typeof parsed.a === 'string' && typeof parsed.t === 'string') {
      return parsed;
    }
  } catch {
    /* malformed → beginning */
  }
  return null;
}

/**
 * The stable sort comparator: windowStart DESC, then actorId ASC, then type ASC. Deterministic + total
 * (the three-tuple is the item identity), so the keyset cursor is unambiguous.
 */
function compareKeys(
  a: { windowStartMs: number; actorId: string; type: string },
  b: { windowStartMs: number; actorId: string; type: string },
): number {
  if (a.windowStartMs !== b.windowStartMs) return b.windowStartMs - a.windowStartMs; // DESC
  if (a.actorId !== b.actorId) return a.actorId < b.actorId ? -1 : 1; // ASC
  if (a.type !== b.type) return a.type < b.type ? -1 : 1; // ASC
  return 0;
}

/** True iff `item` sorts STRICTLY AFTER the cursor position in the keyset order. */
function isAfterCursor(item: { windowStartMs: number; actorId: string; type: string }, c: DecodedCursor): boolean {
  return compareKeys(item, { windowStartMs: c.w, actorId: c.a, type: c.t }) > 0;
}

/**
 * GET /me/feed (SOC-06) — the aggregated, cursor-paginated friend-activity feed. Read-only compute at
 * request time (beta-scale posture). Privacy: the serialized item carries PUBLIC summaries ONLY (the
 * friend's identity, game titles, flattened card peeks, achievement labels) — never hours/notes/ratings.
 */
export async function getFeed(actorId: string, cursor?: string): Promise<FeedResponse> {
  const windowMs = feedWindowMsValue();
  const rawEvents = await feedRepo.listFriendEvents(actorId, [...FEED_SOURCE_EVENT_TYPES], FEED_EVENT_SCAN_CAP);

  // ── Aggregate into (actor, type, window) buckets ────────────────────────────────────────────────────
  const buckets = new Map<string, Bucket>();
  for (const e of rawEvents) {
    const mapped = mapEvent(e);
    if (!mapped) continue; // trivia / irrelevant
    const windowStartMs = Math.floor(mapped.occurredAt.getTime() / windowMs) * windowMs;
    const key = `${mapped.type}:${mapped.actorId}:${windowStartMs}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        actorId: mapped.actorId,
        actorUsername: mapped.actorUsername,
        actorAvatarUrl: mapped.actorAvatarUrl,
        type: mapped.type,
        windowStartMs,
        count: 0,
        latestOccurredAt: mapped.occurredAt,
        refs: [],
        seen: new Set(),
      };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (mapped.occurredAt > bucket.latestOccurredAt) bucket.latestOccurredAt = mapped.occurredAt;
    const rk = refKey(mapped.ref);
    if (rk && !bucket.seen.has(rk)) {
      bucket.seen.add(rk);
      bucket.refs.push(mapped.ref); // newest-first (events arrive desc)
    }
  }

  // ── Sort by the immutable keyset, apply the cursor, page ────────────────────────────────────────────
  const decoded = decodeCursor(cursor);
  const ordered = [...buckets.values()].sort(compareKeys);
  const afterCursor = decoded ? ordered.filter((b) => isAfterCursor(b, decoded)) : ordered;
  const pageBuckets = afterCursor.slice(0, FEED_PAGE_SIZE);
  const hasMore = afterCursor.length > FEED_PAGE_SIZE;

  // ── Resolve object peeks (≤3 per item), batch-wise, flattened only ──────────────────────────────────
  const gameIds = new Set<string>();
  const cardIds = new Set<string>();
  // The game-type peeks (added/beat/completed) show the EVENT ACTOR's DISPLAYED card for that game —
  // group the wanted (friend-actor → gameIds) so one friend-shelf read per distinct actor resolves them.
  const gameRefsByActor = new Map<string, Set<string>>();
  for (const b of pageBuckets) {
    for (const ref of b.refs.slice(0, 3)) {
      if (ref.gameId) gameIds.add(ref.gameId);
      if (ref.cardId) cardIds.add(ref.cardId);
      if (ref.gameId && !ref.cardId && !ref.achievementId) {
        let set = gameRefsByActor.get(b.actorId);
        if (!set) gameRefsByActor.set(b.actorId, (set = new Set()));
        set.add(ref.gameId);
      }
    }
  }

  // The F-19 walk fix (3e54633 parity): a game-type peek renders the ACTOR'S DISPLAYED card — their
  // equipped design, OWN or ADOPTED — resolved through the P2 FRIEND-READ machinery
  // (friendReadRepo.listFriendCollection → FRIEND_ENTRY_COLUMNS: flattened columns ONLY, never
  // composition — the OQ-122 invariant; the viewer is an accepted friend of every feed actor by
  // construction, so the friendScoped gate passes). NOT equippedCardsByGameId — that is the OWNER-side
  // resolver (own designs carry composition) and must never feed a cross-user wire. An equipped design
  // without a flattened artifact yet (own private, imageUrl null) falls through to the representative
  // fallback — a peek needs pixels. One shelf read per distinct friend on the page (≤20 at beta scale).
  const displayedCardByActorGame = new Map<string, { id: string; imageUrl: string | null; thumbUrl: string | null }>();
  for (const [friendId, wantedGames] of gameRefsByActor) {
    const shelf = await friendReadRepo.listFriendCollection(actorId, friendId);
    for (const row of shelf) {
      if (wantedGames.has(row.game.id) && row.cardId && row.cardImageUrl) {
        displayedCardByActorGame.set(`${friendId}:${row.game.id}`, {
          id: row.cardId,
          imageUrl: row.cardImageUrl,
          thumbUrl: row.cardThumbUrl,
        });
      }
    }
  }
  // Fallback for games whose actor has no displayed card (unequipped / no artifact / entry gone): a
  // representative PUBLISHED card for the game; truly nothing → no card (the client's default stub).
  const fallbackGameIds = new Set<string>();
  for (const [friendId, wantedGames] of gameRefsByActor) {
    for (const g of wantedGames) {
      if (!displayedCardByActorGame.has(`${friendId}:${g}`)) fallbackGameIds.add(g);
    }
  }
  const [games, cardPeeks, repCards] = await Promise.all([
    catalogRepo.gamesByIds([...gameIds]),
    cardRepo.publishedPeeksByIds([...cardIds]),
    cardRepo.representativeCardsByGames([...fallbackGameIds]),
  ]);
  const titleByGame = new Map(games.map((g) => [g.id, g.name]));

  const items: FeedItem[] = pageBuckets.map((b) => {
    const windowStart = new Date(b.windowStartMs);
    const windowEnd = new Date(b.windowStartMs + windowMs);
    const objects: FeedObject[] = b.refs.slice(0, 3).map((ref) => {
      const obj: FeedObject = {};
      if (ref.gameId) {
        obj.gameId = ref.gameId;
        const title = titleByGame.get(ref.gameId);
        if (title !== undefined) obj.title = title;
      }
      // Game-type peek card (F-19 walk fix): the actor's DISPLAYED card (own OR adopted, flattened) →
      // a representative published card for the game → nothing (client default). Flattened-only always.
      if (ref.gameId && !ref.cardId && !ref.achievementId) {
        const displayed =
          displayedCardByActorGame.get(`${b.actorId}:${ref.gameId}`) ?? repCards.get(ref.gameId);
        if (displayed) {
          obj.card = { id: displayed.id, imageUrl: displayed.imageUrl, thumbUrl: displayed.thumbUrl };
        }
      }
      if (ref.cardId) {
        const peek = cardPeeks.get(ref.cardId);
        if (peek) {
          obj.card = { id: peek.id, imageUrl: peek.imageUrl, thumbUrl: peek.thumbUrl };
          // published_card's game comes from the card row when the event payload lacked it.
          if (!obj.gameId) {
            obj.gameId = peek.gameId;
            const title = titleByGame.get(peek.gameId);
            if (title !== undefined) obj.title = title;
          }
        }
      }
      if (ref.achievementId) obj.achievementId = ref.achievementId;
      if (ref.label) obj.label = ref.label;
      return obj;
    });
    return {
      feedItemId: `${b.type}:${b.actorId}:${b.windowStartMs}`,
      actor: { userId: b.actorId, username: b.actorUsername, avatarUrl: b.actorAvatarUrl },
      type: b.type,
      aggregateCount: b.count,
      objects,
      occurredAt: b.latestOccurredAt.toISOString(),
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
    };
  });

  const nextCursor = hasMore && items.length > 0 ? encodeCursor(items[items.length - 1]!) : null;
  return { items, nextCursor };
}
