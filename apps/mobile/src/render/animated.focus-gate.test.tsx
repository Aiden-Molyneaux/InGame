import { act, render, screen } from '@testing-library/react-native';
import { NavigationContext } from '@react-navigation/native';
import type { CardComposition as Comp } from './composition';

// P6/R4 (perf-investigation §R4 · walk-4 Murr fix) — the motion loops must NOT run on a blurred
// screen. THE BOUNDARY THAT MATTERS (the original suite missed it): AnimatedCardLayer renders inside
// a skia <Canvas>, whose children live under skia's OWN react-reconciler root — host React context
// (incl. NavigationContext) never crosses it, so a gate inside the layer reads `undefined` forever
// and silently no-ops. The gate therefore lives HOST-SIDE (CardComposition / ProofPrint call
// `useSurfaceFocused()` and don't mount the layer while blurred). These tests pin the chain in two
// honest halves:
//   1. the HOST gate — CardComposition (the real component, real useSurfaceFocused) mounts/unmounts
//      the (stubbed) motion layer on focus/blur;
//   2. the LAYER cleanup — the real AnimatedCardLayer starts its loop on mount and cancels it on
//      unmount (what the host-side unmount triggers).
// Together: blur → host unmounts layer → loop cancelled. No test renders the gate inside the Canvas
// boundary and calls it proven — that arrangement is exactly the defeated one.

const mockWithRepeat = jest.fn(() => 0);
const mockCancelAnimation = jest.fn();
let mockReduceMotion = false;

jest.mock('react-native-reanimated', () => ({
  useSharedValue: (initial: number) => ({ value: initial }),
  useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
  useReducedMotion: () => mockReduceMotion,
  withRepeat: (...args: unknown[]) => mockWithRepeat(...(args as [])),
  withTiming: () => 1,
  cancelAnimation: (...args: unknown[]) => mockCancelAnimation(...(args as [])),
  Easing: { linear: () => 0 },
}));

jest.mock('@shopify/react-native-skia', () => {
  const { View } = jest.requireActual('react-native');
  const passthrough =
    (testID: string) =>
    ({ children }: { children?: React.ReactNode }) => <View testID={testID}>{children}</View>;
  return {
    Canvas: passthrough('skia-canvas'),
    Group: passthrough('skia-group'),
    Fill: passthrough('skia-fill'),
    Circle: passthrough('skia-circle'),
    Rect: passthrough('skia-rect'),
    Oval: passthrough('skia-oval'),
    Path: passthrough('skia-path'),
    Text: passthrough('skia-text'),
    LinearGradient: passthrough('skia-gradient'),
    RadialGradient: passthrough('skia-rgradient'),
    BlurMask: passthrough('skia-blur'),
    Skia: {
      Path: {
        Make: () => ({ moveTo() {}, lineTo() {}, close() {} }),
        MakeFromSVGString: () => null,
      },
      Font: () => ({}),
    },
    useTypeface: () => null,
    // P1 typeface cache — the module-level loader rides `loadData` now; resolve null (no face) so
    // graceful degradation is exercised and the factory (which touches Skia.Typeface) never runs.
    loadData: jest.fn(() => Promise.resolve(null)),
    drawAsImage: jest.fn(),
  };
});

// The font packages pull expo-font (unresolvable under jest); their exports only feed the mocked
// useTypeface, so inert stubs suffice.
jest.mock('@expo-google-fonts/chakra-petch', () => ({ ChakraPetch_700Bold: 1 }));
jest.mock('@expo-google-fonts/paytone-one', () => ({ PaytoneOne_400Regular: 1 }));
jest.mock('@expo-google-fonts/press-start-2p', () => ({ PressStart2P_400Regular: 1 }));
jest.mock('@expo-google-fonts/bitter', () => ({ Bitter_700Bold: 1 }));
jest.mock('@expo-google-fonts/space-mono', () => ({ SpaceMono_700Bold: 1 }));
jest.mock('@expo-google-fonts/pacifico', () => ({ Pacifico_400Regular: 1 }));
jest.mock('@expo-google-fonts/allerta-stencil', () => ({ AllertaStencil_400Regular: 1 }));

// The HOST-gate tests stub the layer (a host-tree marker View) while keeping the REAL
// useSurfaceFocused + hasMotion; the LAYER-cleanup tests reach the real layer via requireActual.
jest.mock('./animated', () => {
  const actual = jest.requireActual('./animated');
  const { View } = jest.requireActual('react-native');
  return { ...actual, AnimatedCardLayer: () => <View testID="motion-layer" /> };
});

import { CardComposition } from './CardComposition';
const RealAnimatedCardLayer = jest.requireActual('./animated').AnimatedCardLayer;

// A marquee frame — `hasMotion` true; no nameplate (the builder tolerates it, no font needed).
const composition = {
  schemaVersion: 1,
  base: { fill: '#0e0b1e' },
  elements: [],
  frame: { kind: 'marquee', color: '#e8c14a', width: 0.024 },
} as unknown as Comp;

/** A minimal react-navigation screen handle: focus state + the focus/blur listeners the gate uses. */
function makeNavigation(initiallyFocused: boolean) {
  const listeners: Record<string, Array<() => void>> = { focus: [], blur: [] };
  let focused = initiallyFocused;
  return {
    isFocused: () => focused,
    addListener: (event: string, cb: () => void) => {
      listeners[event]!.push(cb);
      return () => {
        listeners[event] = listeners[event]!.filter((f) => f !== cb);
      };
    },
    emit(event: 'focus' | 'blur') {
      focused = event === 'focus';
      listeners[event]!.forEach((cb) => cb());
    },
  };
}

function renderHost(nav: ReturnType<typeof makeNavigation> | null) {
  const card = <CardComposition composition={composition} width={224} height={314} effect animate />;
  return render(nav ? <NavigationContext.Provider value={nav as never}>{card}</NavigationContext.Provider> : card);
}

describe('P6/R4 — the HOST-side focus gate (CardComposition, the real boundary)', () => {
  beforeEach(() => {
    mockWithRepeat.mockClear();
    mockCancelAnimation.mockClear();
    mockReduceMotion = false;
  });

  it('a FOCUSED screen mounts the motion layer (bit-identical to before the gate)', () => {
    renderHost(makeNavigation(true));
    expect(screen.getByTestId('motion-layer')).toBeTruthy();
  });

  it('a BLURRED screen never mounts the motion layer', () => {
    renderHost(makeNavigation(false));
    expect(screen.queryByTestId('motion-layer')).toBeNull();
  });

  it('BLURRING a live screen unmounts the layer; RE-FOCUSING remounts it', () => {
    const nav = makeNavigation(true);
    renderHost(nav);
    expect(screen.getByTestId('motion-layer')).toBeTruthy();

    act(() => nav.emit('blur'));
    expect(screen.queryByTestId('motion-layer')).toBeNull();

    act(() => nav.emit('focus'));
    expect(screen.getByTestId('motion-layer')).toBeTruthy();
  });

  it('with NO navigation context the layer mounts (degrades to today’s behaviour, never throws)', () => {
    renderHost(null);
    expect(screen.getByTestId('motion-layer')).toBeTruthy();
  });

  it('a static composition never mounts the layer regardless of focus (hasMotion gate intact)', () => {
    const still = { ...composition, frame: { kind: 'thin-line', color: '#ffffff', width: 0.01 } } as unknown as Comp;
    render(
      <NavigationContext.Provider value={makeNavigation(true) as never}>
        <CardComposition composition={still} width={224} height={314} effect animate />
      </NavigationContext.Provider>,
    );
    expect(screen.queryByTestId('motion-layer')).toBeNull();
  });
});

describe('P6/R4 — the LAYER half: unmount cancels the loop (what a host blur triggers)', () => {
  beforeEach(() => {
    mockWithRepeat.mockClear();
    mockCancelAnimation.mockClear();
    mockReduceMotion = false;
  });

  it('mounting starts the loop; unmounting cancels it (useLoopPhase cleanup)', () => {
    const { unmount } = render(<RealAnimatedCardLayer composition={composition} width={224} height={314} />);
    expect(mockWithRepeat).toHaveBeenCalledTimes(1); // the marquee chase loop is running
    unmount();
    expect(mockCancelAnimation).toHaveBeenCalledTimes(1); // …and the unmount cancelled it
  });

  it('reduce-motion still wins (CARD-16 §104 unchanged): no loop, no draw', () => {
    mockReduceMotion = true;
    const { toJSON } = render(<RealAnimatedCardLayer composition={composition} width={224} height={314} />);
    expect(mockWithRepeat).not.toHaveBeenCalled();
    expect(toJSON()).toBeNull();
  });
});

// R5×R4 (Murr, e642c01 major 2) — under `freezeOnBlur` the HOST gate's unmount is a RENDER, and a
// blurred screen's renders defer until refocus: the unmount that cancelled the loops may never come
// while blurred. The layer therefore carries its own IMPERATIVE brake — the host passes the
// navigation handle as a PROP (props cross the skia reconciler boundary, context does not) and the
// layer's blur/focus listeners stop/restart the loops directly, no render involved. These pin the
// brake AND its inertness when the render path does win the race.
describe('R5×R4 — the IMPERATIVE brake (freeze can defer the host-side unmount)', () => {
  beforeEach(() => {
    mockWithRepeat.mockClear();
    mockCancelAnimation.mockClear();
    mockReduceMotion = false;
  });

  it('a blur event stops the loops IN PLACE (no unmount); refocus restarts them', () => {
    const nav = makeNavigation(true);
    render(<RealAnimatedCardLayer composition={composition} width={224} height={314} navigation={nav} />);
    expect(mockWithRepeat).toHaveBeenCalledTimes(1); // running while focused
    act(() => nav.emit('blur'));
    expect(mockCancelAnimation).toHaveBeenCalledTimes(1); // braked imperatively — the layer never re-rendered
    act(() => nav.emit('focus'));
    expect(mockWithRepeat).toHaveBeenCalledTimes(2); // restarted on refocus
  });

  it('mounted on an already-BLURRED screen (the freeze race): parked until focus', () => {
    const nav = makeNavigation(false);
    render(<RealAnimatedCardLayer composition={composition} width={224} height={314} navigation={nav} />);
    expect(mockWithRepeat).not.toHaveBeenCalled(); // never starts blurred
    act(() => nav.emit('focus'));
    expect(mockWithRepeat).toHaveBeenCalledTimes(1);
  });

  it('brake + render-path unmount coexist inertly: exactly one cancel per running loop', () => {
    const nav = makeNavigation(true);
    const { unmount } = render(
      <RealAnimatedCardLayer composition={composition} width={224} height={314} navigation={nav} />,
    );
    act(() => nav.emit('blur')); // the brake fires first…
    expect(mockCancelAnimation).toHaveBeenCalledTimes(1);
    unmount(); // …then the render path catches up — the guarded stop() must not double-cancel
    expect(mockCancelAnimation).toHaveBeenCalledTimes(1);
  });
});
