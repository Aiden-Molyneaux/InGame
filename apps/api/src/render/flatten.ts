import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCardElements } from './buildCard';
import type { CardComposition } from './composition';

// M5 §1 — the server-side CARD-15 flatten (decision 0064 render spike, ported into the API runtime).
// Proven feasible in-process: react-native-skia's headless / canvaskit build loads from the hoisted
// root node_modules and flattens the SHARED buildCardElements to PNG bytes in ~milliseconds (the M4
// spike + a fresh API-workspace probe — see the §1 receipt). One image is produced per size; the
// gallery consumes these flattened PNGs (never a live canvas — OQ-138). This module is one of the two
// reusable yields the §1 spike owes (render + storage); P3 hardens the budget/error posture on top.

/* eslint-disable @typescript-eslint/no-explicit-any */

// createRequire — the skia headless entrypoints are CommonJS; the API package is ESM ("type":
// "module"), so a static import can't reach the un-typed `lib/commonjs/**` subpaths. Runtime require
// via Node resolution keeps them off the tsc graph (typed `any` at this seam by design).
const require = createRequire(import.meta.url);

/** The PROOF size-ladder the flatten emits (px). Full = the CardDetail render; thumb = the gallery 3-up. */
export const RENDER_SIZES = {
  full: { w: 224, h: 313 },
  thumb: { w: 48, h: 67 },
} as const;

export interface FlattenResult {
  /** The full-size flattened card PNG (CardDetail / share base). */
  full: Buffer;
  /** The gallery thumbnail PNG. */
  thumb: Buffer;
}

// Lazily-initialised, cached skia context — LoadSkiaWeb pulls the ~canvaskit wasm once (~250ms cold),
// then every flatten reuses it. A module-level promise dedupes concurrent first-touch (F36-safe).
let skiaCtxPromise: Promise<any> | null = null;

async function getSkiaCtx(): Promise<any> {
  if (skiaCtxPromise) return skiaCtxPromise;
  skiaCtxPromise = (async () => {
    const { LoadSkiaWeb } = require('@shopify/react-native-skia/lib/commonjs/web/LoadSkiaWeb');
    await LoadSkiaWeb();
    const hs = require('@shopify/react-native-skia/lib/commonjs/headless');
    const {
      getSkiaExports,
      makeOffscreenSurface,
      drawOffscreen,
      Group,
      Fill,
      Rect,
      Oval,
      Path,
      Text,
      LinearGradient,
      RadialGradient,
    } = hs;
    const { Skia } = getSkiaExports();

    // Best-effort nameplate/text typeface (the same free font the M4 spike used). Absent → the
    // renderer degrades text/plate gracefully (the F21 posture); it never crashes the flatten.
    let typeface: any;
    try {
      const ttf = readFileSync(
        join(
          process.cwd(),
          'node_modules/@expo-google-fonts/chakra-petch/700Bold/ChakraPetch_700Bold.ttf',
        ),
      );
      typeface = Skia.Typeface.MakeFreeTypeFaceFromData(Skia.Data.fromBytes(new Uint8Array(ttf)));
    } catch {
      typeface = undefined;
    }

    return {
      makeOffscreenSurface,
      drawOffscreen,
      builderCtx: {
        Group,
        Fill,
        Rect,
        Oval,
        Path,
        Text,
        LinearGradient,
        RadialGradient,
        Skia,
        typeface,
      },
    };
  })();
  return skiaCtxPromise;
}

async function renderOne(w: number, h: number, composition: CardComposition): Promise<Buffer> {
  const skia = await getSkiaCtx();
  const surface = skia.makeOffscreenSurface(w, h);
  // withEffect=true bakes the STATIC effect/finish keyframe into the still image — the gallery/detail
  // view is a flattened PNG, not a live canvas (OQ-138), so the card must look complete on its own.
  const tree = buildCardElements(composition, w, h, skia.builderCtx, true);
  const image = await skia.drawOffscreen(surface, tree);
  return Buffer.from(image.encodeToBytes());
}

/**
 * Flatten a stored composition to the full + thumbnail PNG buffers the publish path stores. `composition`
 * is the `card_designs.composition` jsonb (boundary-validated at write time); it is the render-module's
 * `CardComposition` shape (the closed attributes ride the passthrough envelope, decision 0064).
 */
export async function flattenComposition(
  composition: Record<string, unknown>,
): Promise<FlattenResult> {
  const comp = composition as unknown as CardComposition;
  const [full, thumb] = await Promise.all([
    renderOne(RENDER_SIZES.full.w, RENDER_SIZES.full.h, comp),
    renderOne(RENDER_SIZES.thumb.w, RENDER_SIZES.thumb.h, comp),
  ]);
  return { full, thumb };
}
