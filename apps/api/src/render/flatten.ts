import { createRequire } from 'node:module';
import { createElement } from 'react';
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

// The PROOF size-ladder the flatten emits (px). Full = the CardDetail / inspect / share-base render;
// thumb = the community-gallery 3-up cell.
//
// F3 gallery-resolution pass (owner device-walk E1e / decision 0076): the M5 seed emitted these at
// 224×313 / 48×67 — but the CLIENT renders them into much larger boxes at up to 3× device-pixel-ratio
// (iPhone), so a native <Image> upscaled them into mush (the gallery thumb was a 48px PNG stretched
// across a 96pt cell = a 6× blow-up). Both sizes are raised so each is served at ≥ its consumer's
// physical pixels:
//   • thumb → 288×402: the gallery cell is `cell` = 96pt wide (FlatCardImage), ×3 DPR = 288 physical px.
//   • full  → 448×626 (2×): the inspect/CardDetail large view (up to ~189pt → 567px at 3×) + adopted
//     `grid` cards (161pt → 483px) + the CARD-21 share composite base all read crisp; downscaled, never
//     upscaled. The gallery/inspect are still flattened PNGs (never a live canvas — OQ-138); a bigger
//     PNG on local disk is free (no CDN/egress at M5).
export const RENDER_SIZES = {
  full: { w: 448, h: 626 },
  thumb: { w: 288, h: 402 },
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
      Image, // CARD-21 share composite — draws the flattened base PNG under the attribution footer
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
        Image,
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

// ── M5 P9 — CARD-21 share-image composite ───────────────────────────────────────────────────────────
// FIRST PASS, not a converged design-board surface (flagged for the owner's eye per the P9 brief): a
// plain footer band under the flattened card, in the render module's existing gold/cream palette (the
// ornate-frame gold `#e8c14a` + the dust-overlay cream `#f3ecd9`, buildCard.ts) — carrying the "made in
// InGame" mark + designer attribution. No new asset/font: reuses the same typeface `getSkiaCtx` already
// loads for the nameplate.

const SHARE_FOOTER_H = 40;
const SHARE_BG = '#100c1c';
const SHARE_RULE = '#e8c14a';
const SHARE_MARK_COLOR = '#e8c14a';
const SHARE_ATTRIBUTION_COLOR = '#c9c2d9';

/**
 * CARD-21 — composite a share variant: the flattened card PNG (`basePng`, full-size) topped by a footer
 * band carrying "MADE IN INGAME" + "CARD ARTIST <username>". Draws the decoded base image via the skia
 * `Image` component (same react-element/`drawOffscreen` path `renderOne` uses) so the whole render
 * surface — live editor, gallery flatten, and the share composite — goes through one mechanism.
 */
export async function compositeShareImage(
  basePng: Buffer,
  attribution: { designerUsername: string },
): Promise<Buffer> {
  const h = createElement;
  const skia = await getSkiaCtx();
  const { Skia, Group, Rect, Text, Image, typeface } = skia.builderCtx;
  const baseImage = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(new Uint8Array(basePng)));
  if (!baseImage) throw new Error('CARD-21: could not decode the base render for the share composite.');
  const w = baseImage.width();
  const cardH = baseImage.height();
  const surface = skia.makeOffscreenSurface(w, cardH + SHARE_FOOTER_H);

  const children: any[] = [
    h(Image, { key: 'base', x: 0, y: 0, width: w, height: cardH, image: baseImage, fit: 'fill' }),
    h(Rect, { key: 'band', x: 0, y: cardH, width: w, height: SHARE_FOOTER_H, color: SHARE_BG }),
    h(Rect, { key: 'rule', x: 0, y: cardH, width: w, height: 1, color: SHARE_RULE }),
  ];
  if (typeface) {
    const markFont = Skia.Font(typeface, 12);
    const attrFont = Skia.Font(typeface, 9);
    children.push(
      h(Text, { key: 'mark', x: 10, y: cardH + 17, text: 'MADE IN INGAME', font: markFont, color: SHARE_MARK_COLOR }),
      h(Text, {
        key: 'attr',
        x: 10,
        y: cardH + 31,
        text: `CARD ARTIST ${attribution.designerUsername.toUpperCase()}`,
        font: attrFont,
        color: SHARE_ATTRIBUTION_COLOR,
      }),
    );
  }
  const tree = h(Group, {}, ...children);
  const image = await skia.drawOffscreen(surface, tree);
  return Buffer.from(image.encodeToBytes());
}
