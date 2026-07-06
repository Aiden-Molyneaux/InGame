import { lazy, Suspense, useState } from 'react';
import { Platform, Text, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import { theme } from '../theme';
import { compositionSchema } from '@ingame/shared';
import { GameCard, type GameCardSize } from './GameCard';
import type { CardComposition as Comp } from '../render/composition';

// CardFace — the composition-aware face (CARD-07/18, decision 0066): a CUSTOM design renders LIVE
// via the 0064 skia module (the owner holds the composition — imageUrl stays null until the M5
// flatten); no composition → the GameCard default placeholder. One component so the Game-page hero,
// the CardSwitcher cells, CardDetail, and the Styler tiles can never drift.
//
// WEB (the styler-manifest BOOT risk, defused): react-native-skia needs CanvasKit (wasm) loaded
// BEFORE any <Canvas> evaluates — so the skia consumer is LAZY, and on web the loader first awaits
// LoadSkiaWeb() against `/canvaskit.wasm` (served from apps/mobile/public — version-matched to the
// rn-skia dependency). Native imports it directly (skia ships in Expo Go SDK 54, decision 0064).
// The Suspense fallback is the default face, so nothing flashes broken while the wasm arrives.

const LazyComposedCard = lazy(async () => {
  if (Platform.OS === 'web') {
    const { LoadSkiaWeb } = await import('@shopify/react-native-skia/lib/module/web/LoadSkiaWeb');
    await LoadSkiaWeb({ locateFile: (file: string) => `/${file}` });
  }
  const mod = await import('../render/CardComposition');
  return { default: mod.CardComposition };
});

const SIZE_DIMS: Record<GameCardSize, { w: number; h: number }> = {
  hero: { w: 224, h: 313 },
  pick: { w: 138, h: 193 },
  grid: { w: 161, h: 225 },
  cell: { w: 96, h: 134 },
  mini: { w: 64, h: 89 },
  thumb: { w: 48, h: 67 },
};

/** Parse an unknown `card.composition` rider into a renderable composition (or null → default). */
export function parseComposition(raw: unknown): Comp | null {
  if (!raw) return null;
  const parsed = compositionSchema.safeParse(raw);
  return parsed.success ? (parsed.data as Comp) : null; // an unknown schemaVersion → default (F21)
}

export function CardFace({
  title,
  composition,
  size = 'grid',
  width,
  height,
  nowPlaying = false,
  style,
}: {
  title: string;
  composition?: Comp | null;
  size?: GameCardSize;
  /** Explicit pixel size (overrides `size` dims — the Styler hero). */
  width?: number;
  height?: number;
  nowPlaying?: boolean;
  style?: ViewStyle;
}) {
  const w = width ?? SIZE_DIMS[size].w;
  const h = height ?? SIZE_DIMS[size].h;
  // The skia canvas needs PIXEL dims, but callers may resize via `style` (fixed or fluid/aspectRatio)
  // — so the custom branch draws at the MEASURED box (the same lesson as GameCard's overflow fix),
  // with the intrinsic dims as the first-frame fallback.
  const [box, setBox] = useState<{ w: number; h: number }>({ w, h });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width: bw, height: bh } = e.nativeEvent.layout;
    if (bw > 0 && bh > 0) {
      setBox((prev) => (prev.w === bw && prev.h === bh ? prev : { w: bw, h: bh }));
    }
  };
  if (!composition) {
    return <GameCard title={title} size={size} nowPlaying={nowPlaying} style={{ width: w, height: h, ...style }} />;
  }
  return (
    <View
      style={[{ width: w, height: h }, style]}
      onLayout={onLayout}
      accessibilityRole="image"
      accessibilityLabel={`${title} card`}
    >
      <Suspense fallback={<GameCard title={title} size={size} style={{ width: box.w, height: box.h }} />}>
        <LazyComposedCard composition={composition} width={box.w} height={box.h} effect />
      </Suspense>
      {nowPlaying ? <NowTag /> : null}
    </View>
  );
}

/** Mirrors GameCard's ▶ NOW tag so the custom branch keeps the WTP-03 marker. */
function NowTag() {
  return (
    <View
      style={{
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: theme.scr.accent,
        paddingHorizontal: 4,
        paddingVertical: 1,
      }}
    >
      <Text
        style={{
          fontFamily: theme.font.screenBold,
          fontSize: theme.type.micro,
          color: theme.scr.accentInk,
          letterSpacing: 0.5,
        }}
      >
        ▶ NOW
      </Text>
    </View>
  );
}
