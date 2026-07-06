import { Canvas, Group, Fill, Rect, Oval, Path, Text, LinearGradient, RadialGradient, Skia, useTypeface, drawAsImage } from '@shopify/react-native-skia';
import { ChakraPetch_700Bold } from '@expo-google-fonts/chakra-petch';
import { PaytoneOne_400Regular } from '@expo-google-fonts/paytone-one';
import { buildCardElements, type SkiaCtx } from './buildCard';
import type { CardComposition as Comp } from './composition';

// CardComposition (CARD-15) — the react-native-skia consumer of the shared render module. The live
// editor renders <CardComposition/>; flattenComposition() produces the static image (SAVE-PRIVATE /
// the size-ladder). Both call the SAME buildCardElements the node harness (flatten.spike.ts) verifies.

/**
 * Skia context for the RN build — loads the title typefaces. Call from a component (it's a hook).
 * useTypeface (NOT useFont(...).getTypeface()) — a Font's extracted typeface is a raw pointer the
 * canvaskit/web backend refuses in `Skia.Font(tf, size)` ("raw pointer to smart pointer is
 * illegal"); useTypeface yields the proper smart-pointer Typeface on both targets.
 */
export function useCardSkiaCtx(): SkiaCtx {
  const typeface = useTypeface(ChakraPetch_700Bold) ?? undefined; // 0063 "clean-sans"
  const display = useTypeface(PaytoneOne_400Regular) ?? undefined; // 0063 "bold-display" — already bundled
  const typefaces: Record<string, unknown> = {};
  if (typeface) typefaces['clean-sans'] = typeface;
  if (display) typefaces['bold-display'] = display;
  return { Group, Fill, Rect, Oval, Path, Text, LinearGradient, RadialGradient, Skia, typeface, typefaces };
}

export function CardComposition({
  composition,
  width,
  height,
  effect = false,
}: {
  composition: Comp;
  width: number;
  height: number;
  effect?: boolean;
}) {
  const ctx = useCardSkiaCtx();
  return <Canvas style={{ width, height }}>{buildCardElements(composition, width, height, ctx, effect)}</Canvas>;
}

/**
 * Flatten a composition to a PNG data URI (CARD-15 client/offline flatten, P11 — feeds
 * `POST /cards/:id/save-private`). The `effect` is a runtime overlay, so the flattened base excludes
 * it. `ctx` comes from `useCardSkiaCtx()` so the title font is available.
 */
export async function flattenComposition(composition: Comp, width: number, height: number, ctx: SkiaCtx): Promise<string> {
  const image = await drawAsImage(buildCardElements(composition, width, height, ctx, false), { width, height });
  return `data:image/png;base64,${image.encodeToBase64()}`;
}
