import { Skia, loadData, type SkTypeface } from '@shopify/react-native-skia';
import { ChakraPetch_700Bold } from '@expo-google-fonts/chakra-petch';
import { PaytoneOne_400Regular } from '@expo-google-fonts/paytone-one';
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { Bitter_700Bold } from '@expo-google-fonts/bitter';
import { SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { Pacifico_400Regular } from '@expo-google-fonts/pacifico';
import { AllertaStencil_400Regular } from '@expo-google-fonts/allerta-stencil';

// P1 (perf-round2 C1) — the MODULE-LEVEL typeface cache. rn-skia's `useTypeface` has NO cache
// (verified in library source: every mount runs loadData → FreeType parse), so before this module
// existed every mounted card canvas loaded + parsed ALL 7 title fonts itself — 7 file reads + 7
// parses per canvas across 6 host call sites, 100+ duplicate SkTypeface objects live at once, and
// the async per-mount load was the recurring face-flash on every windowed scroll-in. Here each font
// loads + parses ONCE per app lifetime; `useCardSkiaCtx` (CardComposition.tsx) consumes the cache
// synchronously once warm.
//
// SKIA-BOUNDARY NOTE: `Skia.Typeface` is only touched INSIDE `loadTypeface` (never at module
// evaluation) — on web, CanvasKit must be loaded before any Skia global is dereferenced, and this
// module is only ever imported through CardFace's lazy gate AFTER LoadSkiaWeb resolves; the lazy
// property access keeps that ordering safe regardless. Same load path as `useTypeface` itself
// (`loadData` + `MakeFreeTypeFaceFromData`), so platform asset resolution is identical.

/** ctx face-id → bundled font module (decision 0063/0068 title fonts). */
const FONT_MODULES = {
  'clean-sans': ChakraPetch_700Bold, // 0063 "clean-sans" — also the builder's fallback face
  'bold-display': PaytoneOne_400Regular, // 0063 "bold-display"
  'press-start': PressStart2P_400Regular,
  bitter: Bitter_700Bold,
  'space-mono': SpaceMono_700Bold,
  pacifico: Pacifico_400Regular,
  stencil: AllertaStencil_400Regular,
} as const;

export type FaceKey = keyof typeof FONT_MODULES;
export const FACE_KEYS = Object.keys(FONT_MODULES) as FaceKey[];

/** Faces whose load SUCCEEDED — sync-readable by the hook on every render. */
const loaded = new Map<FaceKey, SkTypeface>();
/** In-flight loads — concurrent first-callers share ONE load per face (the dedupe). */
const inFlight = new Map<FaceKey, Promise<SkTypeface | null>>();

/**
 * Load one title face through the cache. Resolves the cached face immediately once loaded; dedupes
 * concurrent first calls onto one in-flight load. GRACEFUL DEGRADATION (decision 0068) is preserved:
 * a failed load resolves null (the builder falls back to `clean-sans`/skips the draw — a broken font
 * never crashes a canvas) and is dropped from the in-flight map so a LATER mount may retry — exactly
 * the old per-mount retry behavior, now only in the failure path.
 */
export function loadTypeface(key: FaceKey): Promise<SkTypeface | null> {
  const done = loaded.get(key);
  if (done) return Promise.resolve(done);
  let p = inFlight.get(key);
  if (!p) {
    p = loadData(FONT_MODULES[key], (data) => Skia.Typeface.MakeFreeTypeFaceFromData(data))
      .catch(() => null)
      .then((tf) => {
        if (tf) loaded.set(key, tf);
        else inFlight.delete(key); // failure → the next mount retries; success is cached for life
        return tf;
      });
    inFlight.set(key, p);
  }
  return p;
}

/** The face for `key` if its load has completed (undefined while loading / after a failed load). */
export function getLoadedTypeface(key: FaceKey): SkTypeface | undefined {
  return loaded.get(key);
}

/** How many faces are warm — the hook's cheap "anything still owed?" probe. */
export function loadedTypefaceCount(): number {
  return loaded.size;
}

/**
 * Warm ALL title faces (the CardFace `preloadComposedCard` warmup calls this so the Collection's
 * first composed faces render with their real typography — owner gate-5 A.1). Never rejects: each
 * face independently degrades to null.
 */
export function preloadCardTypefaces(): Promise<void> {
  return Promise.all(FACE_KEYS.map(loadTypeface)).then(() => undefined);
}
