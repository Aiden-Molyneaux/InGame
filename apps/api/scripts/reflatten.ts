/**
 * DEV — regenerate every stored flattened card render on the connected DB.
 *
 * The server flatten silently dropped ALL text (the nameplate title + text elements) because the
 * typeface load resolved the font from `process.cwd()` (= `apps/api` under the workspace scripts)
 * instead of the hoisted repo-root `node_modules` (owner round-2 bug 1). After the flatten.ts fix,
 * the on-disk PNGs are STALE (title-less) — they are only written at publish time. This one-shot
 * re-runs `flattenComposition` for every published card (any row with a stored `image_url`) and
 * re-writes `full.png` + `thumb.png` at the SAME keys, so the gallery / press-run / adopted shelf /
 * Game-page hero all show the card name without needing a re-publish.
 *
 * Adopted cards carry no render of their own — they point at the origin published card's image — so
 * regenerating the published set covers the adopted surfaces too. Run: `npm -w @ingame/api run reflatten`.
 *
 * Lives under scripts/ (NOT src/) on purpose: a full-table cross-user read of `composition` is an
 * inherently PRIVILEGED maintenance operation. It has no place in the actor-scoped production layer
 * (the SYS-01 lint correctly forbids cross-user composition reads there — CONVENTIONS rules 1/2), so
 * this one-shot admin tool sits beside the maintenance scripts instead of inside the guarded runtime.
 */
import { eq, isNull, not } from 'drizzle-orm';
import { getDb, closeDb } from '../src/db/client';
import { cardDesigns, games } from '../src/db/schema';
import { flattenComposition, withGameTitle } from '../src/render/flatten';
import { forceRegistryColors } from '../src/config/cosmetics';
import { getStorage } from '../src/storage';

async function main(): Promise<void> {
  const db = getDb();
  // CARD-11 (owner ruling 2026-07-15): the nameplate title text is the GAME title — join `games`
  // so every regenerated render is forced to the game title regardless of the stored composition.
  const rows = await db
    .select({
      id: cardDesigns.id,
      name: cardDesigns.name,
      composition: cardDesigns.composition,
      gameTitle: games.name,
    })
    .from(cardDesigns)
    .innerJoin(games, eq(games.id, cardDesigns.gameId))
    .where(not(isNull(cardDesigns.imageUrl)));

  const storage = getStorage();
  console.log(`reflatten: ${rows.length} card(s) with stored renders`);
  // Walk-4 Murr / P6-R7 — the /media mount now serves far-future Cache-Control, so rewriting bytes
  // at the SAME key would pin every client on the stale render for up to a year. A reflatten changes
  // the BYTES without changing the composition (the renderer changed), so the composition-hash bust
  // publish uses can't discriminate — stamp the run instead: every regenerated row's stored URLs get
  // a fresh `?v=r<runStamp>` (the regenerate-thumbs law: bytes rewritten ⇒ URL must move).
  const runStamp = Date.now().toString(36);
  let ok = 0;
  for (const row of rows) {
    try {
      // forceRegistryColors (Murr W-5 fix): publish forces the RENDER but stores the original
      // composition — without re-forcing here, a reflatten would regenerate every PNG from the raw
      // stored document and silently ship any smuggled recolour publish had suppressed.
      const { full, thumb } = await flattenComposition(
        withGameTitle(forceRegistryColors(row.composition), row.gameTitle),
      );
      const imageUrl = (await storage.put(`cards/${row.id}/full.png`, full, 'image/png')) + `?v=r${runStamp}`;
      const thumbUrl = (await storage.put(`cards/${row.id}/thumb.png`, thumb, 'image/png')) + `?v=r${runStamp}`;
      await db.update(cardDesigns).set({ imageUrl, thumbUrl }).where(eq(cardDesigns.id, row.id));
      ok += 1;
      console.log(`  ✓ ${row.name} (${row.id}) — full ${full.length}B / thumb ${thumb.length}B`);
    } catch (e) {
      console.error(`  ✗ ${row.name} (${row.id}) FAILED:`, (e as Error).message);
    }
  }
  console.log(`reflatten: done — ${ok}/${rows.length} regenerated (urls re-stamped ?v=r${runStamp})`);
}

main()
  .then(() => closeDb())
  .catch(async (e) => {
    console.error('reflatten FAILED:', e);
    await closeDb();
    process.exitCode = 1;
  });
