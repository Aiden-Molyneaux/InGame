// P1 (perf-round2 C1) — the module-level typeface cache: fonts load + parse ONCE per app lifetime
// (not per canvas mount), concurrent first-callers dedupe onto one in-flight load, and the failure
// path degrades to null WITHOUT poisoning the cache (a later mount retries — the old per-mount
// behavior, preserved exactly where it still matters).
//
// Each `it` is INDEPENDENT: `jest.resetModules()` + a fresh require per test rebuilds the cache's
// module state, so tests never couple through load order (Murr fix-round debt — reorder/.only safe).

type Deferred = { resolve: (v: unknown) => void; reject: (e: unknown) => void };
const mockPendingLoads: Deferred[] = [];
const mockLoadData = jest.fn(
  () =>
    new Promise((resolve, reject) => {
      mockPendingLoads.push({ resolve: resolve as (v: unknown) => void, reject });
    }),
);

jest.mock('@shopify/react-native-skia', () => ({
  // The factory closure is created but must NEVER be invoked by the cache itself (the real loadData
  // applies it); a throwing stub proves the boundary holds.
  Skia: {
    get Typeface(): never {
      throw new Error('Skia must not be dereferenced outside a loadData factory invocation');
    },
  },
  loadData: (...args: unknown[]) => mockLoadData(...(args as [])),
}));
jest.mock('@expo-google-fonts/chakra-petch', () => ({ ChakraPetch_700Bold: 1 }));
jest.mock('@expo-google-fonts/paytone-one', () => ({ PaytoneOne_400Regular: 2 }));
jest.mock('@expo-google-fonts/press-start-2p', () => ({ PressStart2P_400Regular: 3 }));
jest.mock('@expo-google-fonts/bitter', () => ({ Bitter_700Bold: 4 }));
jest.mock('@expo-google-fonts/space-mono', () => ({ SpaceMono_700Bold: 5 }));
jest.mock('@expo-google-fonts/pacifico', () => ({ Pacifico_400Regular: 6 }));
jest.mock('@expo-google-fonts/allerta-stencil', () => ({ AllertaStencil_400Regular: 7 }));

type Cache = typeof import('./typefaceCache');
let cache: Cache;

beforeEach(() => {
  jest.resetModules(); // a FRESH cache module per test — no shared warm state between its
  mockPendingLoads.length = 0;
  mockLoadData.mockClear();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  cache = require('./typefaceCache') as Cache;
});

const fakeFace = (key: string) => ({ __face: key });

describe('typefaceCache — once-per-lifetime loads (P1)', () => {
  it('concurrent FIRST calls dedupe onto ONE load; both resolve the same face', async () => {
    const p1 = cache.loadTypeface('clean-sans');
    const p2 = cache.loadTypeface('clean-sans');
    expect(mockLoadData).toHaveBeenCalledTimes(1); // the dedupe — one in-flight load, two callers

    const face = fakeFace('clean-sans');
    mockPendingLoads.shift()!.resolve(face);
    await expect(p1).resolves.toBe(face);
    await expect(p2).resolves.toBe(face);
    expect(cache.getLoadedTypeface('clean-sans')).toBe(face);
  });

  it('a warm face never reloads — later "mounts" read the cache, zero new loadData calls', async () => {
    const first = cache.loadTypeface('clean-sans');
    const face = fakeFace('clean-sans');
    mockPendingLoads.shift()!.resolve(face);
    await expect(first).resolves.toBe(face);

    await expect(cache.loadTypeface('clean-sans')).resolves.toBe(face);
    await expect(cache.loadTypeface('clean-sans')).resolves.toBe(face);
    expect(mockLoadData).toHaveBeenCalledTimes(1); // memoized — no second load, ever
  });

  it('a FAILED load degrades to null (graceful degradation) and does NOT poison the cache — the next mount retries', async () => {
    const p = cache.loadTypeface('bitter');
    mockPendingLoads.shift()!.reject(new Error('font asset unreachable'));
    await expect(p).resolves.toBeNull(); // null face → the builder falls back (decision 0068)
    expect(cache.getLoadedTypeface('bitter')).toBeUndefined();

    const retry = cache.loadTypeface('bitter'); // a later mount may retry — failure is not cached
    expect(mockLoadData).toHaveBeenCalledTimes(2);
    const face = fakeFace('bitter');
    mockPendingLoads.shift()!.resolve(face);
    await expect(retry).resolves.toBe(face);
    expect(cache.getLoadedTypeface('bitter')).toBe(face);
  });

  it('preloadCardTypefaces warms EVERY face once; a re-preload adds zero loads', async () => {
    const warm = cache.preloadCardTypefaces();
    expect(mockPendingLoads.length).toBe(cache.FACE_KEYS.length); // one in-flight load per face
    while (mockPendingLoads.length > 0) mockPendingLoads.shift()!.resolve(fakeFace('x'));
    await warm;
    expect(cache.loadedTypefaceCount()).toBe(cache.FACE_KEYS.length);
    expect(mockLoadData).toHaveBeenCalledTimes(cache.FACE_KEYS.length);

    await cache.preloadCardTypefaces(); // fully warm — resolves from cache
    expect(mockLoadData).toHaveBeenCalledTimes(cache.FACE_KEYS.length); // zero new loads
  });
});
