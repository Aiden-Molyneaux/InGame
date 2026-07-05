import { describe, it, expect } from 'vitest';
import { normalizeTitle, trigramSimilarity, rankDedupCandidates } from './dedup';

// CAT-03 — fuzzy dedup at creation (THE M3 named risk domain; testing-strategy §3: "near-duplicate
// titles are caught; exact normalization is correct"). TEST-FIRST per the TDD posture. Levers per
// D5 (G-K, safe-default-until-approved): normalized-title trigram similarity, warn-threshold 0.5,
// top-5 candidates, hand-rolled (no new dependency — rule 8).

describe('CAT-03: normalizeTitle — the exact dedup key', () => {
  it('lowercases', () => {
    expect(normalizeTitle('Elden Ring')).toBe('elden ring');
  });

  it('folds punctuation/separators to single spaces and trims', () => {
    expect(normalizeTitle('  ELDEN—RING!!  ')).toBe('elden ring');
    expect(normalizeTitle('Elden--Ring')).toBe('elden ring');
    expect(normalizeTitle('Elden.Ring: Shadow_of the/Erdtree')).toBe(
      'elden ring shadow of the erdtree',
    );
  });

  it('drops apostrophes WITHOUT splitting the word', () => {
    expect(normalizeTitle("Baldur's Gate 3")).toBe('baldurs gate 3');
    expect(normalizeTitle('Baldur’s Gate 3')).toBe('baldurs gate 3'); // curly variant
  });

  it('strips diacritics', () => {
    expect(normalizeTitle('Pokémon')).toBe('pokemon');
  });

  it('preserves non-Latin scripts as DISTINCT non-empty keys (no empty-string collision)', () => {
    const dq = normalizeTitle('ドラゴンクエスト');
    const zelda = normalizeTitle('ゼルダの伝説');
    expect(dq).not.toBe(''); // must NOT normalize to '' (which would collide as an exact dup)
    expect(zelda).not.toBe('');
    expect(dq).not.toBe(zelda);
    expect(trigramSimilarity(dq, zelda)).toBeLessThan(1);
  });

  it('keeps digits', () => {
    expect(normalizeTitle('Persona 5')).toBe('persona 5');
  });

  it('normalizes the same title written differently to the SAME key', () => {
    expect(normalizeTitle('ELDEN RING!')).toBe(normalizeTitle('elden ring'));
  });
});

describe('CAT-03: trigramSimilarity — the fuzzy warn signal', () => {
  it('identical normalized titles → 1', () => {
    expect(trigramSimilarity('elden ring', 'elden ring')).toBe(1);
  });

  it('is symmetric', () => {
    const ab = trigramSimilarity('elden ring', 'eldin ring');
    const ba = trigramSimilarity('eldin ring', 'elden ring');
    expect(ab).toBe(ba);
  });

  it('a near-miss typo scores ABOVE the 0.5 warn threshold', () => {
    expect(trigramSimilarity('elden ring', 'eldin ring')).toBeGreaterThanOrEqual(0.5);
  });

  it('unrelated titles score LOW', () => {
    expect(trigramSimilarity('elden ring', 'stardew valley')).toBeLessThan(0.2);
  });

  it('handles short/empty strings without NaN', () => {
    expect(trigramSimilarity('a', 'a')).toBe(1);
    expect(trigramSimilarity('', 'elden ring')).toBe(0);
    expect(trigramSimilarity('', '')).toBe(1);
  });
});

describe('CAT-03: rankDedupCandidates — "did you mean Elden Ring?"', () => {
  const pool = [
    { id: 'g1', name: 'Elden Ring', normalizedName: 'elden ring' },
    { id: 'g2', name: 'Hades', normalizedName: 'hades' },
    { id: 'g3', name: 'Stardew Valley', normalizedName: 'stardew valley' },
    { id: 'g4', name: 'Elden Ring: Shadow of the Erdtree', normalizedName: 'elden ring shadow of the erdtree' },
  ];

  it('surfaces the near-duplicate above the threshold, best-first, with its score', () => {
    const hits = rankDedupCandidates('Eldin Ring', pool);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.id).toBe('g1');
    expect(hits[0]?.similarity).toBeGreaterThanOrEqual(0.5);
    expect(hits[0]?.exact).toBe(false);
  });

  it('flags an EXACT normalized match (same game, differently written)', () => {
    const hits = rankDedupCandidates('ELDEN RING!', pool);
    expect(hits[0]?.id).toBe('g1');
    expect(hits[0]?.exact).toBe(true);
    expect(hits[0]?.similarity).toBe(1);
  });

  it('returns [] when nothing clears the threshold', () => {
    expect(rankDedupCandidates('Umurangi Generation', pool)).toEqual([]);
  });

  it('caps at the top-5 (D5)', () => {
    const crowded = Array.from({ length: 9 }, (_, i) => ({
      id: `c${i}`,
      name: `Elden Ring ${i}`,
      normalizedName: `elden ring ${i}`,
    }));
    const hits = rankDedupCandidates('Elden Ring 1', crowded);
    expect(hits.length).toBeLessThanOrEqual(5);
  });

  it('honors custom levers (threshold/limit are G-K-tunable)', () => {
    const strict = rankDedupCandidates('Eldin Ring', pool, { threshold: 0.99 });
    expect(strict).toEqual([]);
    const one = rankDedupCandidates('Elden Ring', pool, { limit: 1 });
    expect(one).toHaveLength(1);
  });
});
