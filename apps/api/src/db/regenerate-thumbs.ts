import { sql } from 'drizzle-orm';
import { getDb, type Executor } from './client';
import { flattenThumb } from '../render/flatten';
import { getStorage } from '../storage';

// Decision 0047 (M6 walk) — the one-time PLATELESS-THUMB regeneration. Flattened cards bake the
// nameplate into the PNG, and every thumb published BEFORE the flatten fix carries a smudged sub-9px
// plate (the Friends feed peeks). The flatten now renders the THUMB variant plateless (render/flatten.ts
// `withoutNameplate` — decision 0047's ruled size-ladder exception; full.png keeps the CARD-11 title);
// this backfill re-renders ONLY thumb.png for every published card at the SAME storage key, so client
// caches simply refetch. Mirrors the src/db backfill pattern (0015 worn-premium-reset ·
// backfill-equipped-labels): a TESTED db/ INFRA function (parameterized raw `sql` — a deliberate
// server-internal bulk maintenance op, not a repository; the rule-02 raw-SQL ban covers only the strict
// repository surface). The composition is read ONCE, server-side, to re-render — the same owner-side
// read the publish path does; no composition crosses a user boundary (OQ-122 is about WIRE reads).
//
// IDEMPOTENT: the render is deterministic, so a re-run overwrites each thumb with identical bytes —
// safe to run any number of times; the URL bump is guarded (already-busted rows are left alone).
//
// CACHE-BUST (the owner-device wrinkle): RN's <Image> cache is URL-KEYED — a client that ever loaded a
// plated thumb would keep serving it from cache indefinitely if the URL stayed identical. The
// regeneration therefore BUMPS the stored `thumb_url` with `?v=2`: the /media route is
// `express.static` (PATH-keyed — the query string never reaches the file lookup), so the same file
// serves at the "new" URL and every client refetches. THE PRINCIPLE: NEVER change a served image's
// content under an unchanged URL without busting — new content at a NEW key (the publish path's
// per-card keys) or a version marker on the URL where the key must stay.

/** The cache-buster the regeneration stamps onto `thumb_url` (bump on any future content rewrite). */
export const THUMB_URL_BUSTER = '?v=2';

export interface RegenerateThumbsResult {
  scanned: number;
  regenerated: number;
  failed: number;
}

interface PublishedThumbRow {
  id: string;
  composition: Record<string, unknown>;
  thumb_url: string;
}

/**
 * Re-render the PLATELESS thumb for every published card that has a stored thumb + cache-bust its
 * `thumb_url` (`?v=2`). Per-card failures are logged and counted, never fatal (one bad row must not
 * strand the rest of the shelf); the URL is bumped only after that row's rewrite succeeded, and only
 * once (a re-run never double-appends).
 */
export async function regeneratePlatelessThumbs(
  exec: Executor = getDb(),
): Promise<RegenerateThumbsResult> {
  const result = await exec.execute(
    sql`SELECT id, composition, thumb_url FROM card_designs WHERE status = 'published' AND thumb_url IS NOT NULL`,
  );
  const rows = result.rows as unknown as PublishedThumbRow[];
  const storage = getStorage();

  let regenerated = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const thumb = await flattenThumb(row.composition);
      await storage.put(`cards/${row.id}/thumb.png`, thumb, 'image/png');
      // Cache-bust AFTER the rewrite landed (a bumped URL must never point at stale bytes). Guarded —
      // an already-busted row keeps its URL (idempotent re-runs).
      if (!row.thumb_url.includes('?')) {
        await exec.execute(
          sql`UPDATE card_designs SET thumb_url = ${row.thumb_url + THUMB_URL_BUSTER} WHERE id = ${row.id}`,
        );
      }
      regenerated += 1;
    } catch (e) {
      failed += 1;
      console.error(`[regenerate-thumbs] ${row.id} FAILED:`, (e as Error).message);
    }
  }
  console.log(
    `[regenerate-thumbs] plateless-thumb regeneration (decision 0047): ${regenerated}/${rows.length} regenerated${failed ? `, ${failed} failed` : ''}`,
  );
  return { scanned: rows.length, regenerated, failed };
}
