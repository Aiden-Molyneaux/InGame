// Pure reorder helpers for the WTP drag surfaces (the Top-10 ARRANGE re-rank + the queue reorder). The
// drag gesture (DragRankList) computes a from/to index and calls `reorder` — keeping the index math a
// pure, unit-tested function so the gesture layer stays a thin presentation shell (manifest A4).

/**
 * Move the item at `from` to `to`, returning a NEW array (never mutates). Out-of-range indices clamp;
 * a no-op (from === to, or a single/empty list) returns a shallow copy unchanged. Generic so it serves
 * both the queue's `orderedItemIds` (itemId strings) and the Top-10's `orderedGameIds`.
 */
export function reorder<T>(list: readonly T[], from: number, to: number): T[] {
  const out = list.slice();
  if (out.length < 2) return out;
  const f = clamp(from, 0, out.length - 1);
  const t = clamp(to, 0, out.length - 1);
  if (f === t) return out;
  const [moved] = out.splice(f, 1);
  out.splice(t, 0, moved as T);
  return out;
}

/** Whether a candidate list is a valid FULL permutation of the original (the server's reorder rule). */
export function isPermutation<T>(original: readonly T[], candidate: readonly T[]): boolean {
  if (original.length !== candidate.length) return false;
  const a = [...original].sort();
  const b = [...candidate].sort();
  return a.every((v, i) => v === (b[i] as unknown));
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Given a drag that lifted the row at `fromIndex` and dragged it by `deltaY` pixels over rows of fixed
 * `rowHeight`, resolve the destination index (clamped). Fixed row height keeps this pure arithmetic — no
 * async row measuring (manifest A4).
 */
export function indexFromDrag(
  fromIndex: number,
  deltaY: number,
  rowHeight: number,
  count: number,
): number {
  if (rowHeight <= 0 || count < 2) return fromIndex;
  const shift = Math.round(deltaY / rowHeight);
  return clamp(fromIndex + shift, 0, count - 1);
}
