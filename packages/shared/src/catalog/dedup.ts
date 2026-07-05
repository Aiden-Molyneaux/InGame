// CAT-03 — the fuzzy-dedup core (normalize + hand-rolled trigram similarity + candidate ranking).
// Lives in @ingame/shared as PURE logic so it is unit-tested (testing-strategy §2) and shared by the
// server's create/search paths. Hand-rolled per D5/rule-8 (no new dependency); the pg_trgm-indexed
// in-DB upgrade is the known path if the catalog outgrows an in-service scan (v2 scale: the service
// compares against a slim projection of live rows).
//
// LEVERS (D5 — G-K, safe-default-until-approved; surfaced to the owner before they take effect):
// warn-threshold 0.5 · top-5 candidates.

export const DEDUP_WARN_THRESHOLD = 0.5;
export const DEDUP_CANDIDATE_LIMIT = 5;

/**
 * The exact dedup key (CAT-03; §7 "catalog search is indexed on normalized_name"): lowercase,
 * diacritics stripped, apostrophes dropped WITHOUT splitting the word, every other non-alphanumeric
 * run folded to one space, trimmed.
 */
export function normalizeTitle(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // combining marks (é → e)
    .toLowerCase()
    .replace(/['’]/g, '') // baldur's → baldurs (no split)
    // Fold every non-letter/non-number run to one space. Unicode-aware (\p{L}\p{N}) so non-Latin
    // titles (CJK/Cyrillic/…) keep their letters and stay DISTINCT non-empty keys — a plain [^a-z0-9]
    // strip emptied them all to '', colliding every non-Latin game as an exact (non-overridable) dup.
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function trigramsOf(s: string): Set<string> {
  const out = new Set<string>();
  if (s.length === 0) return out;
  const padded = `  ${s} `; // pg_trgm-style boundary padding
  for (let i = 0; i + 3 <= padded.length; i++) out.add(padded.slice(i, i + 3));
  return out;
}

/** Jaccard similarity over boundary-padded trigram sets of two NORMALIZED titles — 0..1. */
export function trigramSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const ta = trigramsOf(a);
  const tb = trigramsOf(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / (ta.size + tb.size - shared);
}

export interface DedupLevers {
  threshold?: number;
  limit?: number;
}

export type DedupHit<T> = T & { similarity: number; exact: boolean };

/**
 * Rank a pool of live catalog rows against a candidate title: exact-normalized matches always
 * surface (similarity 1, `exact: true`); near-misses surface at/above the warn threshold;
 * best-first, capped (D5 top-5).
 */
export function rankDedupCandidates<T extends { normalizedName: string }>(
  candidateName: string,
  pool: readonly T[],
  levers: DedupLevers = {},
): Array<DedupHit<T>> {
  const threshold = levers.threshold ?? DEDUP_WARN_THRESHOLD;
  const limit = levers.limit ?? DEDUP_CANDIDATE_LIMIT;
  const key = normalizeTitle(candidateName);
  return pool
    .map((row) => ({
      ...row,
      similarity: trigramSimilarity(key, row.normalizedName),
      exact: row.normalizedName === key,
    }))
    .filter((hit) => hit.exact || hit.similarity >= threshold)
    .sort((a, b) => Number(b.exact) - Number(a.exact) || b.similarity - a.similarity)
    .slice(0, limit);
}
