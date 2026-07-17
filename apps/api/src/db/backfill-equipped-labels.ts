import { sql } from 'drizzle-orm';
import { getDb, type Executor } from './client';
import { deriveEquippedLabels } from '../render/equipped-labels';

// CARD-22 / OQ-146 (decision 0076 §0.2, M6 P2) — the one-time BACKFILL of `card_designs.equipped_labels`
// for cards PUBLISHED before the label denormalization landed. Mirrors the 0015 worn-premium-reset
// pattern: a TESTED db/ INFRA function (a deliberate server-internal bulk maintenance op, like reset.ts /
// worn-premium-reset.ts — NOT a repository; it uses parameterized raw `sql`, so the rule-02 scope/raw-SQL
// ban — which applies only to the strict repository surface — does not fire here). It is the source of
// truth the migration window applies once.
//
// WHY a script, not a pure-SQL migration: the label derivation is TS (it maps a composition's kind/color
// to roster display names — the same logic the publish path runs); it cannot be expressed cleanly in SQL,
// so unlike 0015 the SQL migration (0016) only ADDS the column and this function does the backfill. On a
// FRESH prod DB (P15/G-C roll-forward) there are zero published cards, so this is a no-op there; it exists
// for dev/existing-data rows. Going forward every publish writes its own labels (card-service).
//
// It reads each published card's `composition` ONCE, server-side, to snapshot the labels — the same owner-
// side read the publish path does; the composition never crosses to another USER (the OQ-122 exclusion is
// about cross-user WIRE reads, which this is not). Idempotent: re-running re-derives the same labels.

export interface BackfillEquippedLabelsResult {
  scanned: number;
  updated: number;
}

interface PublishedRow {
  id: string;
  composition: Record<string, unknown>;
  equipped_labels: Record<string, string>;
}

/**
 * Snapshot the CARD-22 equipped-readout labels for every PUBLISHED card from its stored composition.
 * Only writes a row when the derived labels DIFFER from what is already stored (so a re-run over an
 * already-backfilled shelf reports `updated: 0`). Returns the scan/update counts (for the NOTICE).
 */
export async function backfillEquippedLabels(
  exec: Executor = getDb(),
): Promise<BackfillEquippedLabelsResult> {
  const result = await exec.execute(
    sql`SELECT id, composition, equipped_labels FROM card_designs WHERE status = 'published'`,
  );
  const rows = result.rows as unknown as PublishedRow[];

  let updated = 0;
  for (const row of rows) {
    const labels = deriveEquippedLabels(row.composition);
    // Idempotency guard — an ORDER-INDEPENDENT canonical compare (Postgres jsonb does not preserve key
    // insertion order on read-back, so a plain JSON.stringify would always "differ" and re-write forever).
    if (canonical(labels) === canonical(row.equipped_labels ?? {})) continue;
    await exec.execute(
      sql`UPDATE card_designs SET equipped_labels = ${JSON.stringify(labels)}::jsonb WHERE id = ${row.id}`,
    );
    updated += 1;
  }
  return { scanned: rows.length, updated };
}

/** Sorted-key JSON — a stable canonical form so key ordering never triggers a spurious re-write. */
function canonical(o: Record<string, string>): string {
  return JSON.stringify(Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b))));
}
