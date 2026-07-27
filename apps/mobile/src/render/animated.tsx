import { useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { NavigationContext } from '@react-navigation/native';
import { Group, Circle, Rect, LinearGradient, BlurMask, Skia } from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  useReducedMotion,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { cardStepUnit, steppedRectPath } from '../theme/steppedPath';
import type { CardComposition } from './composition';

// The MOTION layer (decision 0068) — the live half of the animated cosmetics. It is a PURE ADDITIVE
// overlay painted inside the live <Canvas>, exactly like the effect overlays (CARD-12: "runtime,
// never baked"): buildCard.ts draws every kind's STATIC keyframe (the flatten PNG + the node test see
// only that), and this layer paints the motion ON TOP — the marquee's chasing light, the embers'
// rising motes, a frost/holo/metallic sheen. So the shared builder never learns about time, the
// flatten stays a still image (CARD-15), and reduce-motion just doesn't mount this (the keyframe stands).
//
// Driven by Reanimated shared values (rn-skia 2.x reads them as animated props on the UI thread — no
// React re-render per frame). WHO animates is an EXPLICIT per-surface opt-in (`animate` on CardFace/
// CardComposition; owner iteration 2026-07-09 — the old ≥180px width heuristic left every
// out-of-Styler surface static): hero/detail surfaces pass it, grids and rails never do, so the
// clock budget stays one-or-two animated cards per screen by construction.

/** Does this composition carry any kind the motion layer animates? Gate mounting on this. */
export function hasMotion(c: CardComposition): boolean {
  return (
    c.frame?.kind === 'marquee' ||
    c.effect?.kind === 'frost' ||
    c.effect?.kind === 'embers' ||
    c.finish?.kind === 'holographic' ||
    c.finish?.kind === 'metallic'
  );
}

/**
 * P6/R4 (perf-investigation §R4 · fix-wave #2) — is the SCREEN this surface sits on focused?
 *
 * Every motion layer below runs a `withRepeat(…, -1)` UI-thread loop forever, and the opt-in surfaces
 * live on screens that never unmount (the tabs are kept mounted by design) or that pile up on the stack
 * (each pushed game page keeps its hero). Nothing gated motion on focus, so a blurred tab's and every
 * stack-retained screen's loops kept ticking — a permanent per-frame cost that grows as a session
 * accumulates screens. Gating here (ONE place) rather than per-surface covers every `animate` caller —
 * `withRepeat` exists nowhere else in the client — and can't drift as surfaces are added.
 *
 * This is deliberately NOT `@react-navigation/native`'s `useIsFocused()`: that hook calls
 * `useNavigation()`, which THROWS outside a navigator. Reading the context directly degrades instead —
 * no navigation context (a card rendered in a test, a preview harness, or any future non-screen host)
 * reads as FOCUSED, i.e. exactly today's behavior. A focused screen is therefore bit-identical to before;
 * only the blurred case changes.
 */
export function useSurfaceFocused(): boolean {
  const navigation = useContext(NavigationContext);
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!navigation) return () => {};
      const offFocus = navigation.addListener('focus', onChange);
      const offBlur = navigation.addListener('blur', onChange);
      return () => {
        offFocus();
        offBlur();
      };
    },
    [navigation],
  );
  const getSnapshot = useCallback(() => (navigation ? navigation.isFocused() : true), [navigation]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** A shared value looping 0→1 forever at a linear rate; cancelled on unmount. */
function useLoopPhase(duration: number): SharedValue<number> {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = 0;
    p.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(p);
  }, [duration, p]);
  return p;
}

/** A bright light chasing the card's rectangular border (MARQUEE frame). */
function MarqueeChase({ W, H }: { W: number; H: number }) {
  const phase = useLoopPhase(2400);
  const inset = Math.max(2, W * 0.014);
  const transform = useDerivedValue(() => {
    'worklet';
    const p = ((phase.value % 1) + 1) % 1;
    const w = W - inset * 2;
    const h = H - inset * 2;
    const perim = 2 * (w + h);
    const d = p * perim;
    let x: number;
    let y: number;
    if (d < w) {
      x = inset + d;
      y = inset;
    } else if (d < w + h) {
      x = inset + w;
      y = inset + (d - w);
    } else if (d < 2 * w + h) {
      x = inset + w - (d - w - h);
      y = inset + h;
    } else {
      x = inset;
      y = inset + h - (d - 2 * w - h);
    }
    return [{ translateX: x }, { translateY: y }];
  });
  const r = Math.max(4, W * 0.03);
  return (
    <Group transform={transform}>
      <Circle cx={0} cy={0} r={r} color="#fff2b0">
        <BlurMask blur={Math.max(3, W * 0.03)} style="solid" />
      </Circle>
      <Circle cx={0} cy={0} r={Math.max(2, W * 0.014)} color="#ffffff" />
    </Group>
  );
}

type MoteSeed = { x: number; off: number; r: number };
const MOTE_SEEDS: MoteSeed[] = [
  { x: 0.12, off: 0.0, r: 2.2 },
  { x: 0.26, off: 0.55, r: 1.4 },
  { x: 0.4, off: 0.2, r: 2.6 },
  { x: 0.53, off: 0.78, r: 1.6 },
  { x: 0.66, off: 0.35, r: 2.0 },
  { x: 0.78, off: 0.9, r: 1.3 },
  { x: 0.88, off: 0.5, r: 2.3 },
  { x: 0.34, off: 0.68, r: 1.5 },
];

function Mote({ seed, W, H }: { seed: MoteSeed; W: number; H: number }) {
  const phase = useLoopPhase(2800);
  const transform = useDerivedValue(() => {
    'worklet';
    const local = (phase.value + seed.off) % 1;
    const x = seed.x * W + Math.sin(local * Math.PI * 2) * W * 0.03;
    const y = H - H * 0.1 - local * H * 0.7;
    return [{ translateX: x }, { translateY: y }];
  });
  const opacity = useDerivedValue(() => {
    'worklet';
    const local = (phase.value + seed.off) % 1;
    if (local < 0.15) return local / 0.15;
    if (local > 0.8) return (1 - local) / 0.2;
    return 1;
  });
  return (
    <Group transform={transform} opacity={opacity}>
      <Circle cx={0} cy={0} r={seed.r} color="#ff9a3c">
        <BlurMask blur={2} style="solid" />
      </Circle>
    </Group>
  );
}

/** Warm motes rising from the base (EMBERS effect) — the static hearth glow is in buildCard.ts. */
function EmberRise({ W, H }: { W: number; H: number }) {
  return (
    <>
      {MOTE_SEEDS.map((seed, i) => (
        <Mote key={i} seed={seed} W={W} H={H} />
      ))}
    </>
  );
}

/** A bright band sweeping L→R — the shared motion for FROST / HOLOGRAPHIC / METALLIC. */
function SheenSweep({ W, H, color, duration }: { W: number; H: number; color: string; duration: number }) {
  const phase = useLoopPhase(duration);
  const bandW = W * 0.5;
  const transform = useDerivedValue(() => {
    'worklet';
    return [{ translateX: -bandW + (W + bandW) * phase.value }];
  });
  return (
    <Group transform={transform} blendMode="screen">
      <Rect x={0} y={0} width={bandW} height={H}>
        <LinearGradient
          start={{ x: 0, y: 0 }}
          end={{ x: bandW, y: 0 }}
          colors={['rgba(255,255,255,0)', color, 'rgba(255,255,255,0)']}
          positions={[0, 0.5, 1]}
        />
      </Rect>
    </Group>
  );
}

/**
 * The additive motion overlay for a composition. Mount it as a sibling of buildCardElements inside a
 * live <Canvas> (never in the flatten). Renders null under reduce-motion (the static keyframe stands).
 * Gate mounting on `hasMotion(c) && width >= ANIMATE_MIN_W` so static tiles never pay the clock cost.
 */
export function AnimatedCardLayer({
  composition,
  width,
  height,
}: {
  composition: CardComposition;
  width: number;
  height: number;
}) {
  const reduce = useReducedMotion();
  // P6/R4 — the FOCUS gate does NOT live here (walk-4 Murr major): this layer renders inside a skia
  // <Canvas>, whose children run under skia's OWN react-reconciler root — host React context (incl.
  // NavigationContext) never crosses that boundary, so a context read here always sees `undefined`
  // and the gate would be a silent no-op. The gate lives HOST-SIDE: the two Canvas hosts
  // (CardComposition · the PROOF print) call `useSurfaceFocused()` in the host tree and simply don't
  // mount this layer while blurred — unmounting runs `useLoopPhase`'s cleanup, cancelling every loop.
  // (`useReducedMotion` is safe here: Reanimated reads a module-level accessibility listener, not
  // React context, so it works across reconciler roots.)
  const u = cardStepUnit(width); // F-18: match the card's proportional silhouette (was fixed W>=96?6:3)
  const clip = useMemo(() => Skia.Path.MakeFromSVGString(steppedRectPath(width, height, u)), [width, height, u]);
  if (reduce) return null;

  const layers: React.ReactNode[] = [];
  if (composition.frame?.kind === 'marquee') layers.push(<MarqueeChase key="marquee" W={width} H={height} />);
  if (composition.effect?.kind === 'embers') layers.push(<EmberRise key="embers" W={width} H={height} />);
  if (composition.effect?.kind === 'frost') layers.push(<SheenSweep key="frost" W={width} H={height} color="rgba(207,234,255,0.4)" duration={3500} />);
  if (composition.finish?.kind === 'holographic') layers.push(<SheenSweep key="holo" W={width} H={height} color="rgba(255,255,255,0.45)" duration={2400} />);
  if (composition.finish?.kind === 'metallic') layers.push(<SheenSweep key="metal" W={width} H={height} color="rgba(255,240,190,0.5)" duration={2600} />);
  if (!layers.length) return null;

  return <Group clip={clip ?? undefined}>{layers}</Group>;
}
