import { createRequire } from 'node:module';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
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
//   • full  → 672×939 (3×): the inspect/CardDetail large view (189pt → 567px at 3×) + the adopted `grid`
//     hero/shelf cards (fluid boxes measured by CardFace, ~180pt → 540px at 3×) + the CARD-21 share
//     composite base all read crisp; DOWN-scaled, never up-scaled. The prior 448px full (a 2× floor)
//     was UP-scaled ~20-26% on those adopted surfaces → the "crushed/pixelated" adopted hero/shelf the
//     owner flagged (round-2 bug 2): 448 stretched to 567 physical px is a visible softening. 672 out-
//     resolves the largest consumer at 3× DPR. Still a flattened PNG (never a live canvas — OQ-138); a
//     bigger PNG on local disk is free (no CDN/egress at M5).
export const RENDER_SIZES = {
  full: { w: 672, h: 939 },
  thumb: { w: 288, h: 402 },
} as const;

export interface FlattenResult {
  /** The full-size flattened card PNG (CardDetail / share base). */
  full: Buffer;
  /** The gallery thumbnail PNG. */
  thumb: Buffer;
}

// P1-a (walk-4 fix) — the fontId → [expo-google-fonts package, TTF subpath] registry. Mirrors the
// mobile `useCardSkiaCtx` face registration (apps/mobile/src/render/CardComposition.tsx) one-for-one,
// WEIGHTS included, so the server flatten draws the SAME face the live editor does. `clean-sans` is
// first (it doubles as the module-wide fallback face + the share-composite footer font).
export const FONT_FILES: ReadonlyArray<readonly [fontId: string, pkg: string, ttf: string]> = [
  ['clean-sans', '@expo-google-fonts/chakra-petch', '700Bold/ChakraPetch_700Bold.ttf'],
  ['bold-display', '@expo-google-fonts/paytone-one', '400Regular/PaytoneOne_400Regular.ttf'],
  ['press-start', '@expo-google-fonts/press-start-2p', '400Regular/PressStart2P_400Regular.ttf'],
  ['bitter', '@expo-google-fonts/bitter', '700Bold/Bitter_700Bold.ttf'],
  ['space-mono', '@expo-google-fonts/space-mono', '700Bold/SpaceMono_700Bold.ttf'],
  ['pacifico', '@expo-google-fonts/pacifico', '400Regular/Pacifico_400Regular.ttf'],
  ['stencil', '@expo-google-fonts/allerta-stencil', '400Regular/AllertaStencil_400Regular.ttf'],
];

/**
 * Build the fontId → typeface registry the flatten passes as `ctx.typefaces`. `loadFace(pkg, ttf)`
 * loads (and may fail per-font → returns undefined). Each font is registered independently — a missing
 * TTF degrades ONLY that fontId to the buildCard fallback, never the whole flatten. `pacifico-ultimate`
 * (the W-5 SCRIPT ULTIMATE SKU — its own cosmetic id, same Pacifico face) aliases the pacifico face,
 * mirroring the mobile registration. Pure w.r.t. the injected loader — the P1-a regression target.
 */
export function buildTypefaceRegistry(
  loadFace: (pkg: string, ttf: string) => unknown,
): Record<string, any> {
  const typefaces: Record<string, any> = {};
  for (const [fontId, pkg, ttf] of FONT_FILES) {
    const face = loadFace(pkg, ttf);
    if (face) typefaces[fontId] = face;
  }
  // COSM-05 (W-5/0080) — SCRIPT ULTIMATE (`pacifico-ultimate`) is its own SKU id (the composition
  // `fontId` IS the cosmetic id) but draws the same Pacifico face.
  if (typefaces['pacifico']) typefaces['pacifico-ultimate'] = typefaces['pacifico'];
  return typefaces;
}

/**
 * CARD-11 (owner ruling 2026-07-15): a card's nameplate TITLE TEXT is ALWAYS the game title —
 * system-derived, never user-authored. Only the title's font + ink (and the plate cosmetic) are
 * user-customizable. The stored `composition.nameplate.title` is therefore NOT trusted for the text;
 * every server-side render forces the game title so that cross-user artifacts (gallery · adopted ·
 * published · share) can never surface a drifted or stale title. Uppercased to match the render's
 * title convention (the styler's plate()/basePlate() store titles uppercased). A plateless legacy
 * composition (no nameplate) is returned untouched.
 */
export function withGameTitle(
  composition: Record<string, unknown>,
  gameTitle: string,
): Record<string, unknown> {
  const nameplate = composition.nameplate as { title?: string } | undefined;
  if (!nameplate) return composition;
  return { ...composition, nameplate: { ...nameplate, title: gameTitle.toUpperCase() } };
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
    // The sksg scene-graph root, required directly (same lib/commonjs seam as `headless` above).
    // The headless entrypoint's own `drawOffscreen` is NOT used: it constructs its SkiaSGRoot on a
    // module-private Skia handle we can't wrap, so the paints/shaders/mask-filters the sksg replay
    // allocates through it can never be tracked or freed — see the lifecycle block below.
    const { SkiaSGRoot } = require('@shopify/react-native-skia/lib/commonjs/sksg/Reconciler');
    const {
      getSkiaExports,
      makeOffscreenSurface,
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

    // Best-effort nameplate/text typefaces. Absent → the renderer degrades text/plate gracefully
    // (the F21 posture); it never crashes the flatten.
    //
    // The fonts MUST be resolved through node module resolution — NOT `process.cwd()`. The API's
    // dev/prod scripts run with cwd = `apps/api` (npm `-w @ingame/api run …` sets the script cwd to
    // the workspace dir), but `@expo-google-fonts/*` is HOISTED to the repo-root `node_modules`, so a
    // cwd-relative read hit `apps/api/node_modules/…` → ENOENT → the catch swallowed it → `typeface`
    // undefined → EVERY server flatten silently dropped ALL text (the nameplate title AND text
    // elements): the plate band rendered but the card name never did (owner round-2 bug 1). Resolving
    // the package.json via `require` (the same createRequire the skia libs use) finds the hoisted font
    // regardless of cwd.
    //
    // P1-a (walk-4 fix): buildCard resolves a per-element / per-nameplate face from `ctx.typefaces[fontId]`
    // and falls back to `ctx.typeface` only when that map has no entry. The server previously populated
    // ONLY `typeface` (chakra-petch) and NEVER `typefaces`, so EVERY non-default font — the 4 premium
    // fonts (bitter · space-mono · pacifico · stencil), the free bold-display/press-start, AND the W-5
    // SCRIPT ULTIMATE (`pacifico-ultimate`) — silently rendered in chakra-petch on the flatten (the owner
    // saw the right ink but a fallback font face). `buildTypefaceRegistry` (below) MIRRORS the mobile
    // `useCardSkiaCtx` fontId→face registration one-for-one; each font loads independently so a single
    // missing/unreadable TTF degrades ONLY that fontId to the chakra-petch fallback, never the flatten.
    const loadFace = (pkg: string, ttfSubpath: string): any => {
      try {
        const pkgJson = require.resolve(`${pkg}/package.json`);
        const ttf = readFileSync(join(dirname(pkgJson), ttfSubpath));
        return Skia.Typeface.MakeFreeTypeFaceFromData(Skia.Data.fromBytes(new Uint8Array(ttf)));
      } catch {
        return undefined;
      }
    };

    const typefaces = buildTypefaceRegistry(loadFace);
    // clean-sans stays the module-wide fallback (`typeface`) — the same free font the M4 spike used +
    // the share-composite footer draws with.
    const typeface = typefaces['clean-sans'];

    return {
      makeOffscreenSurface,
      SkiaSGRoot,
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
        typefaces,
      },
    };
  })().catch((err) => {
    // A transient first-touch failure (a wasm fetch/instantiation blip) must not poison the cache
    // forever: evict the rejected promise before rethrowing so the NEXT flatten retries the load —
    // otherwise every publish/share 500s until a process restart.
    skiaCtxPromise = null;
    throw err;
  });
  return skiaCtxPromise;
}

// ── CanvasKit-WASM object lifecycle (the load-harness ~680-flatten crash fuse) ───────────────────────
// CanvasKit objects (Surface · Image · Paint · Path · Font · Shader · …) are embind handles into the
// WASM heap: JS GC never frees them, so every PER-RENDER allocation must be `.delete()`d explicitly or
// the heap fills until canvaskit hard-aborts (`RuntimeError: Aborted()` at ~684–690 cumulative flattens
// — the 2026-08-08 load-harness MEASUREMENT-TABLE, reproduced 4×). Ownership ground truth (canvaskit-wasm
// typings + the JsiSk web wrappers this module runs on):
//   • Every JsiSk wrapper exposes `dispose()` → `ref.delete()` and stamps `__typename__` — the tracker's
//     disposable signature. For JS-backed values (Matrix/Point/Rect/Data) `dispose()` is a no-op, so
//     blanket disposal is safe.
//   • `Skia.Data.fromBytes` wraps the JS bytes (NO wasm copy); `MakeImageFromEncoded` /
//     `MakeFreeTypeFaceFromData` copy INTO the heap — the returned Image/Typeface owns its own copy.
//   • `image.encodeToBytes()` hands back JS bytes and `Buffer.from` copies again — the snapshot is
//     deletable the moment encode returns.
//   • `surface.getCanvas()` is owned by the surface (never deleted separately); `surface.dispose()`
//     frees the raster. (Node has no OffscreenCanvas → MakeOffscreen is a CPU `CanvasKit.MakeSurface`:
//     ~2.5MB full / ~0.5MB thumb of wasm heap per undeleted surface — the dominant leak term.)
//   • The PROCESS-WIDE singletons — the CanvasKit instance, the JsiSk API object, and the boot-loaded
//     typeface registry (`builderCtx.typeface(s)`) — are NEVER deleted; only per-render allocations are.
// The sksg replay itself allocates natives through whatever Skia handle its root is given (the
// DrawingContext paint pool, gradient shaders, blur mask-filters — none freed by the library), so each
// render passes ONE tracked facade of the Skia API into BOTH buildCardElements and its own SkiaSGRoot:
// every factory result carrying the disposable signature is registered and deleted in the `finally`,
// error paths included. Rendered output is untouched — the facade forwards every call verbatim.
// THE FACADE BOUNDARY (known debt): tracked = factory calls made THROUGH the facade (and its
// sub-factories); natives created by METHODS ON RESULTS — e.g. `path.copy()`,
// `effect.makeShaderWithChildren(...)` — are NOT tracked, so a future cosmetic that reaches for those
// (path trimming, a runtime-shader finish) re-arms the crash fuse. Neither is reachable from today's
// composition schema (verified in the 8d20b66 audit).

interface SkiaDisposable {
  dispose: () => void;
  __typename__: string;
}

const isSkiaDisposable = (o: unknown): o is SkiaDisposable =>
  !!o &&
  typeof o === 'object' &&
  typeof (o as SkiaDisposable).dispose === 'function' &&
  typeof (o as SkiaDisposable).__typename__ === 'string';

/**
 * Wrap the JsiSk `Skia` API (and, recursively, its sub-factories — `Skia.Path`, `Skia.Shader`, …) so
 * that every native object returned by a factory call is handed to `register`. Calls forward verbatim
 * (`this` = the unwrapped factory), non-disposable results (colors, numbers, null) pass through
 * untracked. Exported for the lifecycle unit test only.
 */
export function trackSkia(skiaApi: any, register: (o: SkiaDisposable) => void): any {
  const wrap = (target: any): any =>
    new Proxy(target, {
      get(t, prop) {
        const v = t[prop];
        if (typeof v === 'function') {
          return (...args: any[]) => {
            const result = v.apply(t, args);
            if (isSkiaDisposable(result)) register(result);
            return result;
          };
        }
        if (v && typeof v === 'object') return wrap(v);
        return v;
      },
    });
  return wrap(skiaApi);
}

/**
 * The one render mechanism: `plan` receives a per-render builderCtx whose `Skia` is the tracked facade
 * and returns the surface dimensions + element tree; the tree is mounted on a private SkiaSGRoot (built
 * on the SAME facade, so the replay's own paint/shader allocations are tracked too), drawn, snapshotted,
 * and PNG-encoded. The `finally` deterministically deletes every tracked allocation, the snapshot, and
 * the surface — on success AND on every error path. Exported for the wiring smoke test only
 * (flatten-wiring.test.ts) — production callers are renderOne / compositeShareImage.
 */
export async function renderElementToPng(
  plan: (builderCtx: any) => { w: number; h: number; tree: any },
): Promise<Buffer> {
  const skia = await getSkiaCtx();
  const allocations = new Set<SkiaDisposable>();
  const trackedSkia = trackSkia(skia.builderCtx.Skia, (o) => allocations.add(o));
  let surface: any;
  let snapshot: any;
  let root: any;
  try {
    const { w, h, tree } = plan({ ...skia.builderCtx, Skia: trackedSkia });
    surface = skia.makeOffscreenSurface(w, h);
    root = new skia.SkiaSGRoot(trackedSkia);
    await root.render(tree);
    root.drawOnCanvas(surface.getCanvas());
    surface.flush();
    snapshot = surface.makeImageSnapshot();
    // The JsiSk wrapper already throws on a falsy encode result; this guard keeps the failure TYPED
    // if that wrapper behavior ever changes (F21 posture: a broken encode must surface as an error,
    // never as a misleading Buffer.from(null) TypeError or a corrupt PNG).
    const png = snapshot.encodeToBytes();
    if (!png) throw new Error('flatten: PNG encode failed (encodeToBytes returned no bytes).');
    return Buffer.from(png);
  } finally {
    // Unmount BEFORE freeing natives so the reconciler never touches a deleted handle.
    if (root) await (root.unmount() as Promise<unknown>).catch(() => undefined);
    // Each dispose is individually guarded: one bad handle must never leak the rest of the batch.
    try {
      snapshot?.dispose();
    } catch {
      /* already freed */
    }
    for (const o of allocations) {
      try {
        o.dispose();
      } catch {
        /* already freed */
      }
    }
    try {
      surface?.dispose();
    } catch {
      /* already freed */
    }
  }
}

async function renderOne(w: number, h: number, composition: CardComposition): Promise<Buffer> {
  // withEffect=true bakes the STATIC effect/finish keyframe into the still image — the gallery/detail
  // view is a flattened PNG, not a live canvas (OQ-138), so the card must look complete on its own.
  return renderElementToPng((builderCtx) => ({
    w,
    h,
    tree: buildCardElements(composition, w, h, builderCtx, true),
  }));
}

/**
 * Decision 0047 (the nameplate-legibility ruling) — the THUMB variant renders PLATELESS. Small card
 * thumbnails must not draw the nameplate/title (sub-9px = illegible; the boards' cross-sweep dropped
 * the plate on /mini+/thumb sizes, including the Friends feed peek). The builder already owns the
 * F-06 size-ladder plate-drop (`plated = W >= 96 && !!c.nameplate`, buildCard.ts) — the client's live
 * mini/thumb renders take that branch in POINT space. The server thumb, however, renders at PHYSICAL
 * pixels (288 = 96pt × 3 DPR, the F3 resolution pass) — numerically ≥ 96, so the W-half of the gate
 * stopped firing and the plate got BAKED into thumb.png. Stripping the nameplate routes the render
 * through the SAME `!!c.nameplate` half of the existing gate (plateH = 0, no plate group, elements
 * full-height) — byte-for-byte the client's small-size code path, no new builder flag.
 * full.png KEEPS the plate: CARD-11/F-14 — the title is system-guaranteed on the full render; the
 * thumb drop is 0047's ruled size-ladder exception.
 */
export function withoutNameplate(composition: Record<string, unknown>): Record<string, unknown> {
  if (!('nameplate' in composition)) return composition;
  const { nameplate: _dropped, ...rest } = composition;
  return rest;
}

/** The PLATELESS thumb render alone (decision 0047) — the regeneration backfill's unit of work. */
export async function flattenThumb(composition: Record<string, unknown>): Promise<Buffer> {
  const comp = withoutNameplate(composition) as unknown as CardComposition;
  return renderOne(RENDER_SIZES.thumb.w, RENDER_SIZES.thumb.h, comp);
}

/**
 * Flatten a stored composition to the full + thumbnail PNG buffers the publish path stores. `composition`
 * is the `card_designs.composition` jsonb (boundary-validated at write time); it is the render-module's
 * `CardComposition` shape (the closed attributes ride the passthrough envelope, decision 0064).
 * The thumb renders PLATELESS (decision 0047 — see `withoutNameplate`); the full keeps the CARD-11 title.
 */
export async function flattenComposition(
  composition: Record<string, unknown>,
): Promise<FlattenResult> {
  const comp = composition as unknown as CardComposition;
  const [full, thumb] = await Promise.all([
    renderOne(RENDER_SIZES.full.w, RENDER_SIZES.full.h, comp),
    flattenThumb(composition),
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
  // Everything allocated here (the decoded base image, the two footer fonts) goes through the tracked
  // builderCtx.Skia, so renderElementToPng's finally deletes it — decode-failure path included. The
  // `typeface` itself is the boot singleton and stays alive.
  return renderElementToPng((builderCtx) => {
    const { Skia, Group, Rect, Text, Image, typeface } = builderCtx;
    const baseImage = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(new Uint8Array(basePng)));
    if (!baseImage)
      throw new Error('CARD-21: could not decode the base render for the share composite.');
    const w = baseImage.width();
    const cardH = baseImage.height();

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
    return { w, h: cardH + SHARE_FOOTER_H, tree: h(Group, {}, ...children) };
  });
}
