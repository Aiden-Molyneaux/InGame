import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StickerZone } from '@ingame/shared';
import { themedStyles } from '../theme';
import { useReducedMotion } from '../a11y/useReducedMotion';
import { ShellNav } from './ShellNav';
import { useBreakout } from './BreakoutContext';
import { useAppSelector } from '../store/hooks';
import { EMPTY_COMPOSITION } from './device/stickerGeometry';
import { useStickerContext } from './device/DeviceStickerContext';
import { StickerBandLayer, type ZoneGeom } from './device/StickerBandLayer';

// DeviceShell (component-map §5.1 · design-spec §1.5) — the F-03 teal plastic that **wraps every
// screen**. ONE persistent instance is mounted at the ROOT layout so the device frame containerizes
// the whole application (sign-in → tabs), never unmounting across navigation. The routed screen
// renders inside the Midnight `.screen`, framed by the fixed chrome:
//   top-band (36) · screen-bezel (pad 6, r20) → screen (r13) · nav-band (content, the NavBand).
// The fixed band/inset heights come from the canonical device in profile-states.html, so the USABLE
// screen area (viewport − top-band − nav-band − bezel padding) is correct now and every screen builds
// into the right space. Decorative F-03 chrome (grille slats, embossed logo, 3D screw/bevel
// gradients) is simplified this pass (iteration lane) — the structure + dimensions are what matter.
export function DeviceShell({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { active: breakout } = useBreakout();
  const styles = useStyles();

  // ── ARCH 2 · the sticker layer that rides the plastic bands on EVERY screen ────────────────────────
  // The persisted (optimistic) composition — the editor writes it locally on each mutation, so this
  // repaints live while editing AND persists app-wide. PASSIVE unless the /device editor publishes an
  // edit `session` (then the bands turn interactive). The 5 nav keycaps paint ABOVE every decal (F-04)
  // because the chin layer is an EARLIER sibling than ShellNav (opaque caps win the z-order by
  // construction). navWarn (a drag over a no-go area) is owned here so the forehead drag can light the
  // chin's NAV — KEEP CLEAR overlay across the two separate band layers.
  const composition = useAppSelector((s) => s.prefs.stickerComposition) ?? EMPTY_COMPOSITION;
  const { session } = useStickerContext();
  const zoneGeom = useRef<Record<StickerZone, import('./device/StickerBandLayer').WindowRect | null>>({
    forehead: null,
    chin: null,
  }) as ZoneGeom;
  const [navWarn, setNavWarn] = useState(false);
  const foreheadStickers = useMemo(
    () => composition.stickers.filter((s) => s.zone === 'forehead'),
    [composition],
  );
  const chinStickers = useMemo(() => composition.stickers.filter((s) => s.zone === 'chin'), [composition]);

  // BREAKOUT = a ZOOM (decision 0067/CR-01 · 0014 stage-3 · §2.5b). The deep Canvas editor escapes the
  // arcade: on entry the screen **zooms to full-bleed** (a scale-transform) as the chrome (top-band +
  // bezel frame + NavBand) yields; it shrinks back on exit. This REPLACES the earlier chrome-hide /
  // the retired cabinet-swing. CRITICAL INVARIANTS:
  //  • `{children}` is ALWAYS the same node in the same slot — never conditionally unmounted — so the
  //    routed /styler Stack + the rn-skia bed NEVER remount across the posture switch (CARD-24a one
  //    document; the whole session/skia surface would be destroyed otherwise).
  //  • The zoom is a TRANSFORM only. `showBreakout` (not `breakout`) drives the full-bleed layout so it
  //    persists through the shrink-back animation, then flips off when the zoom settles.
  //  • On WEB the transform is skipped (instant full-bleed): animating a layer over the large skia BED
  //    canvas promotes a compositing layer that blanks it (a rn-skia-web quirk; native is unaffected —
  //    owner-verified 2026-07-08). Web is a dev surface only (CLAUDE.md).
  // A BOUNDARY-CONTINUOUS ZOOM (round 5, design-spec 0.56 — the dip-through-background is RETIRED;
  // after two tuning rounds it still read as a blink). The trick: while the layout is FRAMED, a
  // transform (translate + non-uniform scale, all native-driver) can map the screen container's
  // rect EXACTLY onto the measured full-bleed rect — so the screen's EDGES travel smoothly from
  // in-frame to full-bleed, and the real layout swap happens only at the frame where the two
  // boundaries coincide (progress=1). Entry: framed layout animates progress 0→1 (the screen grows
  // over the chrome), then showBreakout flips + the transform drops out in the same commit — the
  // boundary doesn't move. Exit: showBreakout flips to framed WITH progress preset to 1 (boundary
  // still full-bleed), then progress animates 1→0 — the screen shrinks back into the frame. The
  // content inside stretches ~12% non-uniformly mid-motion (the two rects' aspects differ) — the
  // accepted cost; the boundary, which is what the eye tracks, never jumps and nothing goes dark.
  // Still transform-only: the route + rn-skia bed NEVER remount, and the bed relayouts exactly once
  // (at the swap), same as before. Native-only; web stays an instant swap.
  const progress = useRef(new Animated.Value(0)).current; // 0 = framed at rest · 1 = covering full-bleed
  const [showBreakout, setShowBreakout] = useState(breakout);
  const showBreakoutRef = useRef(breakout);
  showBreakoutRef.current = showBreakout;
  // CARD-16/0044 §104 — read at trigger time (ref, not a dep, so a mid-session toggle doesn't re-fire
  // a swap while the posture is stable): reduce-motion takes the same instant-swap path as web.
  const reduceMotion = useReducedMotion();
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;
  // measured rects: the framed screen + the plastic root (window coords) — captured while framed
  // AND at rest only. measureInWindow is transform-aware, so a layout that fires MID-ZOOM (the exit
  // swap renders framed with the covering transform attached) would measure the full-bleed rect and
  // poison the cache — the murr R5-1 one-cycle self-defeat. `animatingRef` gates that; the exit's
  // completion re-measures explicitly once the transform is identity again.
  const screenRef = useRef<View>(null);
  const rootRef = useRef<View>(null);
  const rectsRef = useRef<{ sx: number; sy: number; tx: number; ty: number } | null>(null);
  const animatingRef = useRef(false);
  const bkDimsRef = useRef<{ w: number; h: number } | null>(null); // breakout-layout size baseline
  const [zooming, setZooming] = useState(false); // flattens the screen radius during the motion (murr R5-5)
  const doMeasure = () => {
    // hardening (murr N3): never measure mid-zoom or in breakout, whoever calls — measureInWindow
    // is transform-aware, so any non-rest measurement poisons the cache
    if (animatingRef.current || showBreakoutRef.current) return;
    const s = screenRef.current;
    const r = rootRef.current;
    if (!s || !r) return;
    r.measureInWindow((rx, ry, rw, rh) => {
      s.measureInWindow((fx, fy, fw, fh) => {
        if (fw <= 0 || fh <= 0 || rw <= 0 || rh <= 0) return;
        rectsRef.current = {
          sx: rw / fw,
          sy: rh / fh,
          // translate the framed CENTRE onto the root centre (RN transforms pivot the view centre)
          tx: rx + rw / 2 - (fx + fw / 2),
          ty: ry + rh / 2 - (fy + fh / 2),
        };
        bkDimsRef.current = null; // fresh framed rects → restart the breakout-resize baseline (R5-4)
      });
    });
  };
  const measureFramed = (ev: { nativeEvent: { layout: { width: number; height: number } } }) => {
    if (Platform.OS === 'web') return;
    if (showBreakoutRef.current) {
      // a BREAKOUT-layout size change (rotation/fold/split-screen) makes the cached framed rects
      // stale — drop them (the next exit degrades to an instant swap, then the rest re-measure
      // heals the cycle) rather than animate a wrong boundary (murr R5-4)
      const { width, height } = ev.nativeEvent.layout;
      if (bkDimsRef.current && (bkDimsRef.current.w !== width || bkDimsRef.current.h !== height)) {
        rectsRef.current = null;
      }
      bkDimsRef.current = { w: width, h: height };
      return;
    }
    if (animatingRef.current) return; // mid-zoom layouts measure THROUGH the transform (murr R5-1)
    doMeasure();
  };
  const firstRunRef = useRef(true);
  useEffect(() => {
    if (firstRunRef.current) {
      // mount is not a transition (murr round-4 F2)
      firstRunRef.current = false;
      setShowBreakout(breakout);
      progress.setValue(0);
      return;
    }
    if (Platform.OS === 'web' || reduceMotionRef.current) {
      // web skips the transition (documented rn-skia-web compositing quirk); reduce-motion skips it by
      // contract (0044 §104) — either way an instant swap, no zoom.
      setShowBreakout(breakout);
      progress.setValue(0);
      return;
    }
    if (breakout) {
      // ENTRY — grow the framed screen until its boundary lands on the full-bleed rect, then swap.
      // (No rects measured yet → degrade to an instant swap rather than animate blind.)
      if (!rectsRef.current) {
        setShowBreakout(true);
        progress.setValue(0);
        return;
      }
      animatingRef.current = true;
      setZooming(true); // radius 13→0 for the motion so the corners can't flash chrome (murr R5-5)
      const anim = Animated.timing(progress, {
        toValue: 1,
        duration: 340,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      });
      anim.start(({ finished }) => {
        animatingRef.current = false;
        setZooming(false);
        if (!finished) return;
        setShowBreakout(true); // the boundary already IS full-bleed — the swap doesn't move it
        progress.setValue(0); // the transform is off in breakout; reset for the next exit
      });
      // NOTE the interrupt paths rely on anim.stop() firing this callback SYNCHRONOUSLY (finished:
      // false) inside the effect cleanup, so the old run's animatingRef=false lands before the next
      // effect re-arms it — RN's TimingAnimation.stop() does this today (murr round 5).
      return () => anim.stop();
    }
    // EXIT — swap to the framed layout WITH the covering transform already applied (the boundary
    // stays full-bleed across the commit), then shrink smoothly back into the frame. If the entry
    // never completed (exit tapped mid-grow), the layout is STILL framed — don't teleport progress
    // to 1; just shrink from wherever the interrupted grow sits.
    animatingRef.current = true;
    setZooming(true);
    if (showBreakoutRef.current) {
      progress.setValue(rectsRef.current ? 1 : 0);
      setShowBreakout(false);
    }
    const anim = Animated.timing(progress, {
      toValue: 0,
      duration: 340,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      animatingRef.current = false;
      setZooming(false);
      // re-measure AT REST (progress 0 = identity transform) — the swap-frame onLayout was gated
      // out above, so this is where the next cycle's rects come from (murr R5-1)
      if (finished) requestAnimationFrame(() => doMeasure());
    });
    return () => anim.stop();
  }, [breakout, progress]);

  // the boundary transform — applied only while FRAMED (in breakout the full-bleed layout IS the
  // boundary). Order matters: translate to the full-bleed centre, THEN scale about it.
  const rects = rectsRef.current;
  const zoomTransform =
    Platform.OS !== 'web' && !showBreakout && rects
      ? {
          transform: [
            { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, rects.tx] }) },
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, rects.ty] }) },
            { scaleX: progress.interpolate({ inputRange: [0, 1], outputRange: [1, rects.sx] }) },
            { scaleY: progress.interpolate({ inputRange: [0, 1], outputRange: [1, rects.sy] }) },
          ],
        }
      : null;

  return (
    <View ref={rootRef} collapsable={false} style={[styles.plastic, showBreakout && styles.plasticBreakout]}>
      {/* top-band (36px): power LED (left) · INGAME logo (center) · grille (right). The top safe-area
          inset extends the band up into the notch without shrinking its 36px content area.
          Hidden — not removed — in breakout so {children}'s index never shifts. */}
      <View
        style={[
          styles.topBand,
          { height: TOP_BAND + insets.top, paddingTop: TOP_PAD + insets.top },
          showBreakout && styles.hidden,
        ]}
      >
        <View style={styles.power}>
          <View style={styles.led} />
          <Text style={styles.powerLbl}>POWER</Text>
        </View>
        {/* the logo overlays the CONTENT box (below the notch) so it centres in line with POWER +
            the grille — absolute w/o `top` ignored the inset padding and rode up under the notch */}
        <View pointerEvents="none" style={[styles.logoWrap, { top: TOP_PAD + insets.top }]}>
          <Text style={styles.logo}>INGAME</Text>
        </View>
        <View style={styles.grille}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.slat} />
          ))}
        </View>
        {/* forehead decals — an overlay filling the top-band (hidden with the band in breakout). Last
            child so decals paint over the logo/grille (the board sits them on the plastic forehead). */}
        <StickerBandLayer
          zone="forehead"
          stickers={foreheadStickers}
          session={session}
          zoneGeom={zoneGeom}
          navWarn={navWarn}
          onNavWarn={setNavWarn}
        />
      </View>

      {/* screen-bezel (pad 9, r20) holding the Midnight screen (r13) where the routed screen renders.
          In breakout the bezel frame + screen radius flatten and the screen zooms to edge-to-edge.
          zIndex lifts the bezel above the top-band + nav so the GROWING screen covers the chrome
          during the boundary zoom (round 5) — no layout overlap at rest, so this is inert idle. */}
      <View style={[styles.bezel, showBreakout && styles.bezelBreakout]}>
        <Animated.View
          ref={screenRef}
          onLayout={measureFramed}
          style={[styles.screen, (showBreakout || zooming) && styles.screenBreakout, zoomTransform]}
        >
          {children}
        </Animated.View>
      </View>

      {/* nav-band — the trailing child: safe to conditionally drop (removing the LAST child never
          shifts {children}'s index, so no remount). Gone during the breakout zoom. The chin decal
          layer rides BEHIND ShellNav (earlier sibling) so the opaque keycaps paint over every decal —
          the F-04 z-order proof by construction. */}
      {showBreakout ? null : (
        <View style={styles.navWrap}>
          <StickerBandLayer
            zone="chin"
            stickers={chinStickers}
            session={session}
            zoneGeom={zoneGeom}
            navWarn={navWarn}
            onNavWarn={setNavWarn}
          />
          <ShellNav bottomInset={insets.bottom} />
        </View>
      )}
    </View>
  );
}

// S1-a (M3-R) + R2: top bar up. The band is fixed-height with vertically-CENTRED content whose centre
// sits at (TOP_PAD + TOP_BAND)/2 below the inset — so both drop together to raise it. R1-5 took 64/16 →
// 56/8 (~8px up); the R2 device pass asked for ~12px more, so 36/4 (centre 20 below the inset, from 32).
// Content box = TOP_BAND − TOP_PAD = 32 (POWER ~23 · grille 23 still fit centred). Owner re-checks at R2.
const TOP_BAND = 36;
const TOP_PAD = 4;

const useStyles = themedStyles((t) => ({
  plastic: {
    flex: 1, // fills the viewport (the shell IS the device body)
    backgroundColor: t.shell.plastic,
    borderRadius: t.corner.device, // ~30 (mockup `.device`)
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  // breakout overrides — the plastic body becomes the flat workshop field (no teal, no radius, no
  // side padding). The `{children}` chain is unchanged; only these styles differ. The dark bg also
  // backs the ~8% margin around the zooming screen so no teal chrome flashes during the zoom.
  plasticBreakout: { backgroundColor: t.scr.bg, borderRadius: 0, paddingHorizontal: 0 },
  hidden: { display: 'none' },
  bezelBreakout: { backgroundColor: t.scr.bg, borderRadius: 0, padding: 0 },
  screenBreakout: { borderRadius: 0 },
  topBand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 5, // R2 — a 5px teal gap between the top bar and the screen (lifts the top bar off the bezel)
  },
  power: { alignItems: 'flex-start', gap: 3 },
  led: {
    width: 9,
    height: 9,
    borderRadius: 5, // round LED (F-05 shell light)
    backgroundColor: t.shell.led,
  },
  powerLbl: {
    fontFamily: t.font.shell, // Paytone One on the plastic (F-08)
    fontSize: t.type.micro, // 9
    color: t.shell.silk,
    opacity: 0.75,
    letterSpacing: 0.5,
  },
  logoWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontFamily: t.font.shell, // Paytone One (F-08)
    fontSize: t.type.display, // 21
    letterSpacing: 7,
    color: t.shell.lo, // faint emboss on the plastic (full 3D emboss = iteration lane)
  },
  grille: { flexDirection: 'row', gap: 6 },
  slat: {
    width: 5,
    height: 23,
    borderRadius: 2,
    backgroundColor: t.shell.lo,
    transform: [{ skewX: '-22deg' }],
  },
  bezel: {
    flex: 1,
    minHeight: 0,
    backgroundColor: t.shell.bezel,
    borderRadius: t.corner.bezel, // 20 (mockup `.screen-bezel`)
    padding: 6, // S6-b (M3-R): thinner black frame/screen border (board is 9) — R2-tunable
    zIndex: 2, // the growing screen covers the chrome during the boundary zoom (round 5)
  },
  screen: {
    flex: 1,
    backgroundColor: t.scr.bg, // the Midnight screen
    borderRadius: t.corner.glass, // 13 (mockup `.screen`)
    overflow: 'hidden',
  },
  // wraps ShellNav so the chin decal layer can absolute-fill BEHIND it (keycaps paint above — F-04).
  navWrap: { position: 'relative' },
}));
