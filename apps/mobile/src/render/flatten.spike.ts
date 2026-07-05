// Node verify harness for the CARD-15 render module (M4 §1 spike, throwaway). Runs the SHARED
// buildCardElements against the headless / canvaskit skia build → flattens the sample composition
// across the PROOF size-ladder (+ the effect overlay) → PNGs. This is what proves the factored
// render module actually flattens (the RN <Canvas> path reuses the same builder).
//   Run: npx tsx apps/mobile/src/render/flatten.spike.ts [outDir]
/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCardElements } from './buildCard';
import { SAMPLE_COMPOSITION } from './composition';

async function main() {
  const { LoadSkiaWeb } = require('@shopify/react-native-skia/lib/commonjs/web/LoadSkiaWeb');
  await LoadSkiaWeb();
  const hs = require('@shopify/react-native-skia/lib/commonjs/headless');
  const { getSkiaExports, makeOffscreenSurface, drawOffscreen, Group, Fill, Rect, Oval, Path, Text, LinearGradient } = hs;
  const { Skia } = getSkiaExports();

  let typeface: any;
  try {
    const ttf = readFileSync(join(process.cwd(), 'node_modules/@expo-google-fonts/chakra-petch/700Bold/ChakraPetch_700Bold.ttf'));
    typeface = Skia.Typeface.MakeFreeTypeFaceFromData(Skia.Data.fromBytes(new Uint8Array(ttf)));
  } catch (e) {
    console.warn('  (font skipped:', (e as Error).message, ')');
  }

  const ctx = { Group, Fill, Rect, Oval, Path, Text, LinearGradient, Skia, typeface };
  const outDir = process.argv[2] || process.cwd();
  const SIZES: Record<string, [number, number]> = { full: [224, 313], grid: [161, 225], mini: [64, 89], thumb: [48, 67] };

  for (const [name, [W, H]] of Object.entries(SIZES)) {
    const surface = makeOffscreenSurface(W, H);
    const image = await drawOffscreen(surface, buildCardElements(SAMPLE_COMPOSITION, W, H, ctx, false));
    writeFileSync(join(outDir, `card-${name}.png`), Buffer.from(image.encodeToBytes()));
  }
  const s2 = makeOffscreenSurface(224, 313);
  const img2 = await drawOffscreen(s2, buildCardElements(SAMPLE_COMPOSITION, 224, 313, ctx, true));
  writeFileSync(join(outDir, 'card-full-effect.png'), Buffer.from(img2.encodeToBytes()));

  console.log('OK — flattened', SAMPLE_COMPOSITION.elements.length, 'elements via the shared buildCardElements →', outDir);
}

main().catch((e) => {
  console.error('VERIFY FAILED:', e && e.stack ? e.stack : e);
  process.exit(1);
});
