import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// useReducedMotion (CARD-16 · decision 0044 §104) — the ONE reduce-motion source of truth for the
// plain-RN-`Animated` sites. Reads the OS "reduce motion" setting on mount AND subscribes to runtime
// changes. This replaces the ad-hoc per-site checks (PressSheet/KeepBeat each called
// `AccessibilityInfo.isReduceMotionEnabled()` once, so a mid-session toggle didn't take — KeepBeat
// never re-checked after mount). The Skia motion layer (`render/animated.tsx`) keeps reanimated's own
// `useReducedMotion()` (it runs on the UI thread) — same behaviour, different lane; both honour §104.
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) setReduced(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub?.remove(); // RNW returns undefined when `matchMedia` is absent (murr m5)
    };
  }, []);
  return reduced;
}
