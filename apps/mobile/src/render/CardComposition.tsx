import { Canvas, Group, Fill, Rect, Oval, Path, Text, LinearGradient, Skia, useFont, drawAsImage } from '@shopify/react-native-skia';
import { ChakraPetch_700Bold } from '@expo-google-fonts/chakra-petch';
import { buildCardElements, type SkiaCtx } from './buildCard';
import type { CardComposition as Comp } from './composition';

// CardComposition (CARD-15) — the react-native-skia consumer of the shared render module. The live
// editor renders <CardComposition/>; flattenComposition() produces the static image (SAVE-PRIVATE /
// the size-ladder). Both call the SAME buildCardElements the node harness (flatten.spike.ts) verifies.

/** Skia context for the RN build — loads the title typeface. Call from a component (it's a hook). */
export function useCardSkiaCtx(): SkiaCtx {
  const font = useFont(ChakraPetch_700Bold, 12);
  const typeface = font ? font.getTypeface() : undefined;
  return { Group, Fill, Rect, Oval, Path, Text, LinearGradient, Skia, typeface };
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
