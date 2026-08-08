import { describe, it, expect } from 'vitest';
import { trackSkia } from './flatten';

// The CanvasKit lifecycle tracker (the ~680-flatten WASM-heap crash fuse, load-harness 2026-08-08) —
// `trackSkia` is the mechanism that lets renderElementToPng delete every per-render native allocation.
// These tests pin its contract against a fake JsiSk-shaped API: every factory result carrying the
// JsiSk disposable signature (`dispose` fn + `__typename__`) is registered — through nested factories
// too — while non-disposable results (colors, null misses) pass through untracked, and calls forward
// verbatim. The 1500-flatten soak against the real canvaskit-wasm is the end-to-end evidence (recorded
// in the M6 ledger); it is deliberately NOT a CI test — WASM heap behavior is machine/time flaky.

const disposable = (typename: string): { dispose: () => void; __typename__: string } => ({
  dispose: () => undefined,
  __typename__: typename,
});

const makeFakeSkia = () => ({
  // Direct function factory (the Skia.Paint() shape).
  Paint: () => disposable('Paint'),
  // Function factory with args (the Skia.Font(face, size) shape).
  Font: (_face: unknown, size: number) => ({ ...disposable('Font'), size }),
  // Nested factory object (the Skia.Path.Make / MakeFromSVGString shape) — `this`-dependent, like the
  // real JsiSk factories (Host subclasses reading this.CanvasKit).
  Path: {
    tag: 'path-factory',
    Make() {
      return { ...disposable('Path'), from: (this as { tag: string }).tag };
    },
    MakeFromSVGString(d: string) {
      return d === 'bad' ? null : disposable('Path');
    },
  },
  // Non-disposable result (the Skia.Color Float32Array shape) — must pass through untracked.
  Color: () => new Float32Array([0, 0, 0, 1]),
});

describe('trackSkia — the per-render CanvasKit allocation tracker', () => {
  it('registers disposables returned by direct factory calls', () => {
    const seen: unknown[] = [];
    const skia = trackSkia(makeFakeSkia(), (o) => seen.push(o));
    const paint = skia.Paint();
    const font = skia.Font(undefined, 12);
    expect(seen).toEqual([paint, font]);
    expect(font.size).toBe(12); // arguments forward verbatim
  });

  it('registers disposables created through nested factories, preserving `this`', () => {
    const seen: unknown[] = [];
    const skia = trackSkia(makeFakeSkia(), (o) => seen.push(o));
    const p = skia.Path.Make();
    expect(seen).toEqual([p]);
    expect(p.from).toBe('path-factory'); // the factory method ran with the unwrapped factory as `this`
  });

  it('does not register non-disposable results or null factory misses', () => {
    const seen: unknown[] = [];
    const skia = trackSkia(makeFakeSkia(), (o) => seen.push(o));
    const color = skia.Color();
    const miss = skia.Path.MakeFromSVGString('bad');
    expect(color).toBeInstanceOf(Float32Array);
    expect(miss).toBeNull();
    expect(seen).toEqual([]);
  });

  it('an object with dispose but no __typename__ is not treated as a Skia native', () => {
    const seen: unknown[] = [];
    const skia = trackSkia({ Weird: () => ({ dispose: () => undefined }) }, (o) => seen.push(o));
    skia.Weird();
    expect(seen).toEqual([]);
  });
});
