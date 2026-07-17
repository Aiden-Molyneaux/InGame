import { reorder, indexFromDrag, isPermutation } from './components/wtp/reorder';

// P10 — the pure reorder math behind the Top-10 ARRANGE + queue drag (manifest A4). The drag gesture is
// a thin shell over these; testing them here is what makes the reorder correct without a device.

describe('WTP-01 / COL-13: reorder()', () => {
  const L = ['a', 'b', 'c', 'd'];

  it('moves an item down', () => {
    expect(reorder(L, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });
  it('moves an item up', () => {
    expect(reorder(L, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });
  it('is a no-op when from === to', () => {
    expect(reorder(L, 2, 2)).toEqual(L);
  });
  it('clamps out-of-range indices', () => {
    expect(reorder(L, 0, 99)).toEqual(['b', 'c', 'd', 'a']);
    expect(reorder(L, -5, 0)).toEqual(L); // clamps to 0 → no-op
  });
  it('never mutates the input', () => {
    const copy = [...L];
    reorder(L, 0, 3);
    expect(L).toEqual(copy);
  });
  it('returns a copy for a single/empty list', () => {
    expect(reorder(['x'], 0, 0)).toEqual(['x']);
    expect(reorder([], 0, 0)).toEqual([]);
  });
  it('always yields a valid FULL permutation (the server reorder rule)', () => {
    expect(isPermutation(L, reorder(L, 1, 3))).toBe(true);
    expect(isPermutation(L, ['a', 'b', 'c'])).toBe(false); // length mismatch
  });
});

describe('WTP-01: indexFromDrag()', () => {
  const H = 60;
  it('shifts one slot down per row-height of drag', () => {
    expect(indexFromDrag(0, H, H, 5)).toBe(1);
    expect(indexFromDrag(0, 2 * H, H, 5)).toBe(2);
  });
  it('shifts up for a negative delta', () => {
    expect(indexFromDrag(3, -2 * H, H, 5)).toBe(1);
  });
  it('rounds to the nearest slot', () => {
    expect(indexFromDrag(0, H * 0.6, H, 5)).toBe(1); // >half → next
    expect(indexFromDrag(0, H * 0.4, H, 5)).toBe(0); // <half → stay
  });
  it('clamps at the list bounds', () => {
    expect(indexFromDrag(4, 10 * H, H, 5)).toBe(4);
    expect(indexFromDrag(0, -10 * H, H, 5)).toBe(0);
  });
  it('is a no-op for a single-item list or zero row height', () => {
    expect(indexFromDrag(0, 100, H, 1)).toBe(0);
    expect(indexFromDrag(0, 100, 0, 5)).toBe(0);
  });
});
