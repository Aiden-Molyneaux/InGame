import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { createElement as h } from 'react';
import { renderElementToPng } from './flatten';

// The WIRING pins for the CanvasKit lifecycle fix (8d20b66 hardening round).
//
// (1) The lib/commonjs seam pin: flatten.ts runtime-requires three UNTYPED react-native-skia internals
//     (the documented createRequire seam). A skia version bump that moves any of them is a LAZY fuse —
//     CI green, boot clean, first publish 500s — so this test requires each path and asserts the exact
//     exports flatten.ts consumes, making a moved path fail CI loudly instead.
// (2) The tracked-lifecycle smoke: renders a tiny plan through renderElementToPng against the REAL
//     canvaskit-wasm in node_modules (~250ms cold load, cached per worker) and asserts natives
//     allocated through the tracked facade come back embind-DELETED — success AND error path. This is
//     the only guard that catches someone unwiring `Skia: trackedSkia` or gutting the finally. All
//     assertions are deterministic (isDeleted / PNG magic) — no memory or timing checks, nothing that
//     flakes under machine load; the 1500-flatten soak evidence lives in the M6 ledger, not CI.

const require = createRequire(import.meta.url);

describe('the react-native-skia lib/commonjs seams flatten.ts requires', () => {
  it('headless — exports makeOffscreenSurface, getSkiaExports, and the builder components', () => {
    const hs = require('@shopify/react-native-skia/lib/commonjs/headless');
    expect(typeof hs.makeOffscreenSurface).toBe('function');
    expect(typeof hs.getSkiaExports).toBe('function');
    for (const c of ['Group', 'Fill', 'Rect', 'Oval', 'Path', 'Text', 'Image', 'LinearGradient', 'RadialGradient']) {
      expect(hs[c], `headless export ${c}`).toBeDefined();
    }
  });

  it('web/LoadSkiaWeb — exports LoadSkiaWeb', () => {
    const m = require('@shopify/react-native-skia/lib/commonjs/web/LoadSkiaWeb');
    expect(typeof m.LoadSkiaWeb).toBe('function');
  });

  it('sksg/Reconciler — exports the SkiaSGRoot class', () => {
    const m = require('@shopify/react-native-skia/lib/commonjs/sksg/Reconciler');
    expect(typeof m.SkiaSGRoot).toBe('function');
  });
});

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** A JsiSk wrapper as the smoke sees it: the embind native under `ref` carries its own tombstone. */
interface TrackedNative {
  ref: { isDeleted(): boolean };
}

describe('renderElementToPng — the tracked-lifecycle wiring (real canvaskit-wasm)', () => {
  it(
    'renders a plan to PNG bytes and deletes every native allocated through the tracked facade',
    async () => {
      const created: TrackedNative[] = [];
      const png = await renderElementToPng((ctx) => {
        // Allocate through the per-render facade exactly the way buildCard does (ctx.Skia factories).
        const p = ctx.Skia.Path.MakeFromSVGString('M0 0 L12 0 L12 12 L0 12 Z');
        expect(p).not.toBeNull();
        created.push(p);
        return {
          w: 16,
          h: 16,
          tree: h(
            ctx.Group,
            {},
            h(ctx.Rect, { x: 0, y: 0, width: 16, height: 16, color: '#123456' }),
            h(ctx.Path, { path: p, color: '#e8c14a' }),
          ),
        };
      });
      expect(png.subarray(0, 8).equals(PNG_MAGIC)).toBe(true);
      // The tracker registered the allocation AND the finally drained it: the underlying embind
      // native must be deleted (ref.isDeleted() is canvaskit's own tombstone check).
      expect(created.length).toBeGreaterThan(0);
      for (const o of created) expect(o.ref.isDeleted()).toBe(true);
    },
    30_000,
  );

  it(
    'deletes tracked natives on the error path too (a throwing plan must not leak)',
    async () => {
      const created: TrackedNative[] = [];
      await expect(
        renderElementToPng((ctx) => {
          created.push(ctx.Skia.Path.MakeFromSVGString('M0 0 L5 5 L0 5 Z'));
          throw new Error('boom — plan failed after allocating');
        }),
      ).rejects.toThrow('boom');
      expect(created.length).toBe(1);
      expect(created[0]?.ref.isDeleted()).toBe(true);
    },
    30_000,
  );
});
