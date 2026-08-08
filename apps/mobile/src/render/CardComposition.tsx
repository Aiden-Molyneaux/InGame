import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Canvas, Group, Fill, Rect, Oval, Path, Text, LinearGradient, RadialGradient, BlurMask, Skia, useTypeface, drawAsImage } from '@shopify/react-native-skia';
import { ChakraPetch_700Bold } from '@expo-google-fonts/chakra-petch';
import { PaytoneOne_400Regular } from '@expo-google-fonts/paytone-one';
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { Bitter_700Bold } from '@expo-google-fonts/bitter';
import { SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { Pacifico_400Regular } from '@expo-google-fonts/pacifico';
import { AllertaStencil_400Regular } from '@expo-google-fonts/allerta-stencil';
import { buildCardElements, buildBedElements, buildOverlayElements, buildCellStrip, buildBaseStrip, buildCompositionStrip, type SkiaCtx, type StripCell } from './buildCard';
import { AnimatedCardLayer, hasMotion, useSurfaceFocused, useSurfaceNavigation } from './animated';
import type { CardComposition as Comp } from './composition';

// CardComposition (CARD-15) — the react-native-skia consumer of the shared render module. The live
// editor renders <CardComposition/>; flattenComposition() produces the static image (PROOF / the
// size-ladder). Both call the SAME buildCardElements the node harness (flatten.spike.ts) verifies.
// M4 §3.4 adds the Canvas consumers: <CardBed/> (the press bed — bare base+vectors, isolation
// ghosting) and <ProofPrint/> (the true print: the client flatten as a PNG + the effect/finish
// painted live over it — the CARD-15 image+overlay viewer architecture, demonstrated in-app).

/**
 * Skia context for the RN build — loads the title typefaces. Call from a component (it's a hook).
 * useTypeface (NOT useFont(...).getTypeface()) — a Font's extracted typeface is a raw pointer the
 * canvaskit/web backend refuses in `Skia.Font(tf, size)` ("raw pointer to smart pointer is
 * illegal"); useTypeface yields the proper smart-pointer Typeface on both targets.
 */
export function useCardSkiaCtx(): SkiaCtx {
  const typeface = useTypeface(ChakraPetch_700Bold) ?? undefined; // 0063 "clean-sans"
  const display = useTypeface(PaytoneOne_400Regular) ?? undefined; // 0063 "bold-display" — already bundled
  // decision 0068 title fonts — a missing typeface (still loading) falls back to `typeface` in the
  // builder, so a slow font never crashes the draw (buildCard's face resolution).
  const pixel = useTypeface(PressStart2P_400Regular) ?? undefined;
  const slab = useTypeface(Bitter_700Bold) ?? undefined;
  const mono = useTypeface(SpaceMono_700Bold) ?? undefined;
  const script = useTypeface(Pacifico_400Regular) ?? undefined;
  const stencil = useTypeface(AllertaStencil_400Regular) ?? undefined;
  const typefaces: Record<string, unknown> = {};
  if (typeface) typefaces['clean-sans'] = typeface;
  if (display) typefaces['bold-display'] = display;
  if (pixel) typefaces['press-start'] = pixel;
  if (slab) typefaces['bitter'] = slab;
  if (mono) typefaces['space-mono'] = mono;
  if (script) typefaces['pacifico'] = script;
  // COSM-05 (W-5/0080) — SCRIPT ULTIMATE (`pacifico-ultimate`) is its own SKU id (`fontId` IS the
  // cosmetic id), but draws the same Pacifico face.
  if (script) typefaces['pacifico-ultimate'] = script;
  if (stencil) typefaces['stencil'] = stencil;
  return { Group, Fill, Rect, Oval, Path, Text, LinearGradient, RadialGradient, BlurMask, Skia, typeface, typefaces };
}

export function CardComposition({
  composition,
  width,
  height,
  effect = false,
  animate = false,
}: {
  composition: Comp;
  width: number;
  height: number;
  effect?: boolean;
  animate?: boolean;
}) {
  const ctx = useCardSkiaCtx();
  // P6/R4 (walk-4 Murr fix) — the focus gate lives HERE, in the host tree, because Canvas children run
  // under skia's own reconciler root where NavigationContext is unreachable (a gate inside the layer
  // would silently never fire). A blurred screen simply doesn't mount the motion layer; skia re-renders
  // its children on host re-render, and the layer's loop cleanup cancels on unmount.
  const focused = useSurfaceFocused();
  // R5×R4 (Murr, e642c01 major 2) — the `focused` render gate defers under freezeOnBlur (a blurred
  // screen may never re-render), so the navigation handle ALSO rides down as a prop: the layer's own
  // imperative blur/focus brake stops the loops even when this host never re-renders. Props cross
  // the skia reconciler boundary; context does not.
  const navigation = useSurfaceNavigation();
  // The static tree + (where the surface opts in) the additive motion overlay. `animate` is an
  // EXPLICIT per-surface opt-in (owner iteration 2026-07-09 — the old ≥180px width heuristic left
  // every out-of-Styler surface static): hero/detail surfaces pass it, grids and tiles never do,
  // so the clock budget stays one-or-two animated cards per screen by construction.
  const motion = animate && effect && focused && hasMotion(composition);
  return (
    <Canvas style={{ width, height }}>
      {buildCardElements(composition, width, height, ctx, effect)}
      {motion ? <AnimatedCardLayer composition={composition} width={width} height={height} navigation={navigation} /> : null}
    </Canvas>
  );
}

/** The press-bed draw (Canvas P1/P2) — base + vectors BARE; `pulledIndex` ghosts the rest to 28%. */
export function CardBed({
  composition,
  width,
  height,
  pulledIndex = null,
}: {
  composition: Comp;
  width: number;
  height: number;
  pulledIndex?: number | null;
}) {
  const ctx = useCardSkiaCtx();
  return <Canvas style={{ width, height }}>{buildBedElements(composition, width, height, ctx, { pulledIndex })}</Canvas>;
}

// (No per-element thumbnail component exists on purpose — a <Canvas> per cell provably evicts
// WebGL contexts at rack scale; multi-cell previews MUST ride the strip components below.)

/**
 * A grid/row of element cells in ONE canvas — the LayerRack panes + AssetShelf glyph grids ride
 * this so the page never approaches the browser's ~16-WebGL-context ceiling (one <Canvas> per
 * cell provably evicts contexts at rack scale).
 */
export function GlyphStrip({
  cells,
  cellW,
  cellH,
  strideX,
  strideY,
  cols,
  width,
  height,
}: {
  cells: StripCell[];
  cellW: number;
  cellH: number;
  strideX: number;
  strideY: number;
  cols: number;
  width: number;
  height: number;
}) {
  const ctx = useCardSkiaCtx();
  return <Canvas style={{ width, height }}>{buildCellStrip(cells, cellW, cellH, strideX, strideY, cols, ctx)}</Canvas>;
}

/**
 * A row of FULL-composition tiles in ONE canvas (the Styler FRAME/EFFECT/FINISH preview rails). The
 * strip is display-only (`pointerEvents="none"`) — the AttributeSection lays transparent Pressables
 * over it for taps + a11y, exactly like the AssetShelf glyph grid. One canvas, not one-per-tile (the
 * WebGL-context ceiling — decision 0068 pushed the frame rail to 16 tiles).
 */
export function CompositionStrip({
  comps,
  cellW,
  cellH,
  strideX,
  width,
  height,
}: {
  comps: Comp[];
  cellW: number;
  cellH: number;
  strideX: number;
  width: number;
  height: number;
}) {
  const ctx = useCardSkiaCtx();
  return (
    <Canvas style={{ width, height }} pointerEvents="none">
      {buildCompositionStrip(comps, cellW, cellH, strideX, ctx, true)}
    </Canvas>
  );
}

/** A row of base swatches in ONE canvas (the AssetShelf BASE rows). */
export function BaseStrip({
  bases,
  cell,
  stride,
  width,
  height,
}: {
  bases: Array<Comp['base']>;
  cell: number;
  stride: number;
  width: number;
  height: number;
}) {
  const ctx = useCardSkiaCtx();
  return <Canvas style={{ width, height }}>{buildBaseStrip(bases, cell, stride, ctx)}</Canvas>;
}

/**
 * The PROOF true print (Canvas P6): the composition CLIENT-FLATTENED to a PNG (CARD-15's flatten,
 * its first in-app consumer) with the effect+finish painted live over the image — exactly what an
 * M5 viewer will see. Flatten failure degrades to the live render (never a crash), reported up.
 */
export function ProofPrint({
  composition,
  width,
  height,
  onFlattenError,
}: {
  composition: Comp;
  width: number;
  height: number;
  onFlattenError?: (e: unknown) => void;
}) {
  const ctx = useCardSkiaCtx();
  // P6/R4 (walk-4 Murr fix) — host-side focus gate; see CardComposition. The PROOF's motion overlay
  // must not tick while its screen is blurred/stack-retained. R5×R4: the navigation handle rides
  // down too — the imperative brake covers the freeze-deferred-render case (see CardComposition).
  const focused = useSurfaceFocused();
  const navigation = useSurfaceNavigation();
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const typefaceReady = !!ctx.typeface;
  useEffect(() => {
    let live = true;
    setUri(null);
    setFailed(false);
    flattenComposition(composition, width, height, ctx)
      .then((u) => {
        if (live) setUri(u);
      })
      .catch((e) => {
        if (!live) return;
        setFailed(true);
        onFlattenError?.(e);
      });
    return () => {
      live = false;
    };
    // ctx is rebuilt every render — the typefaces' arrival is the real dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composition, width, height, typefaceReady]);
  return (
    <View style={{ width, height }}>
      {uri && !failed ? (
        <Image source={{ uri }} style={{ width, height }} />
      ) : (
        // pending or failed → the live draw stands in (same tree, so nothing can visually drift)
        <Canvas style={{ width, height }}>{buildCardElements(composition, width, height, ctx, false)}</Canvas>
      )}
      <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
        {buildOverlayElements(composition, width, height, ctx)}
        {focused && hasMotion(composition) ? (
          // the PROOF is the one bed-size print on screen — it animates when the kinds do AND the
          // screen is focused (P6/R4 — the host-side gate; see CardComposition)
          <AnimatedCardLayer composition={composition} width={width} height={height} navigation={navigation} />
        ) : null}
      </Canvas>
    </View>
  );
}

/**
 * Flatten a composition to a PNG data URI (CARD-15 client/offline flatten, P11 — the PROOF print;
 * the flatten-to-storage seam rides M5 publish, decision 0066 §1). The `effect` is a runtime
 * overlay, so the flattened base excludes it. `ctx` comes from `useCardSkiaCtx()` so the title
 * font is available.
 */
export async function flattenComposition(composition: Comp, width: number, height: number, ctx: SkiaCtx): Promise<string> {
  const image = await drawAsImage(buildCardElements(composition, width, height, ctx, false), { width, height });
  return `data:image/png;base64,${image.encodeToBase64()}`;
}
