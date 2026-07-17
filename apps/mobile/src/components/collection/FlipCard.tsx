import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import type { CollectionItem } from '@ingame/shared';
import { CardFace, parseComposition } from '../CardFace';
import { StatsBack } from '../game/StatsBack';
import { ScreenButton } from '../ScreenButton';
import { STATUS_LABEL } from '../../constants/collection';
import { useReducedMotion } from '../../a11y/useReducedMotion';

// FlipCard (COL-12 · CARD-23 mode 2 FLIP) — the Collection peek-flip. The whole card is the tap-target
// (CARD-07): a TAP flips it in place to the CARD-01 stats back; a LONG-PRESS is the NAVIGATE shortcut to
// the Game page; the back's VIEW GAME control is the visible navigate path (decision 0026 kept navigation
// on the back rather than behind a hidden gesture). Transient — the flipped state lives on the Collection
// screen and is never persisted (the parent clears it on view-switch + blur).
//
// The flip is TWO faces (front rotateY 0→180, back 180→360). The opacity SWAP at the midpoint is the
// reveal (RN has no reliable cross-platform backface-visibility). But opacity 0 does NOT block touches, so
// the back's button is gated on a `settled` flag (not the raw prop) — see below. Under REDUCE-MOTION
// (CARD-16) the timing is skipped for an instant face-swap; the effect re-runs on the runtime toggle so a
// card can never freeze half-rotated (the KeepBeat lesson, 0044 §104).
//
// A11Y (CARD-16): the whole card is ONE screen-reader button (CARD-07) — a transparent tap layer whose
// label carries the CURRENT face's content, with a "View game" accessibility action exposing NAVIGATE.
// Both faces are hidden from the SR so the tap layer is the single a11y element (activate = flip; the
// View-game action = navigate — the non-gesture path). The visible VIEW GAME keycap is a sibling of the
// tap layer, not a descendant (web can't nest a <button> in a <button>).

// motion.cardFlip (0044 §104) — realised as a local constant; no shared `theme.motion` set exists yet
// (PressSheet/KeepBeat each hold their own durations). Extract a shared token when that motion pass lands.
const FLIP_MS = 320;

export function FlipCard({
  item,
  flipped,
  onToggle,
  onNavigate,
  width,
  height,
  style,
}: {
  item: CollectionItem;
  flipped: boolean;
  /** Tap the card (front or back-off-the-button) → toggle the flip. */
  onToggle: () => void;
  /** Long-press (either face) + the back's VIEW GAME → the Game page. */
  onNavigate: () => void;
  /** Fixed pixel size (shelf rows). */
  width?: number;
  height?: number;
  /** Fluid sizing (the grid's `width:'100%' · aspectRatio`). */
  style?: ViewStyle;
}) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(flipped ? 1 : 0)).current;
  // The back needs PIXEL dims (StatsBack draws an SVG silhouette); the grid card is fluid, so measure the
  // box and fall back to the intrinsic size for the first frame (the CardFace measure pattern).
  const [box, setBox] = useState<{ w: number; h: number }>({ w: width ?? 138, h: height ?? 193 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width: bw, height: bh } = e.nativeEvent.layout;
    if (bw > 0 && bh > 0) setBox((prev) => (prev.w === bw && prev.h === bh ? prev : { w: bw, h: bh }));
  };

  // `settled` = the flip finished (or reduce-motion snapped it). The back's VIEW GAME must be hit-testable
  // only once the back is FULLY presented: opacity 0 does NOT block touch in RN, so gating on the raw
  // `flipped` prop would leave the invisible button live during the ~160ms flip-in and let a fast second
  // tap NAVIGATE instead of FLIP (a CARD-23 violation). Gate on `settled && flipped` instead.
  const [settled, setSettled] = useState(true);
  useEffect(() => {
    if (reduced) {
      progress.setValue(flipped ? 1 : 0); // instant swap — never leave a face frozen mid-rotate
      setSettled(true);
      return;
    }
    setSettled(false);
    const anim = Animated.timing(progress, {
      toValue: flipped ? 1 : 0,
      duration: FLIP_MS,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: Platform.OS !== 'web', // rotateY + opacity are native-driver-safe; web has no native module
    });
    anim.start(({ finished }) => {
      if (finished) setSettled(true);
    });
    return () => anim.stop();
  }, [flipped, reduced, progress]);

  const frontRotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  // Hard opacity swap at the midpoint (the near-duplicate 0.5 stops make it a step, not a cross-fade).
  const frontOpacity = progress.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [1, 1, 0, 0] });
  const backOpacity = progress.interpolate({ inputRange: [0, 0.5, 0.51, 1], outputRange: [0, 0, 1, 1] });

  // The single-element SR label: the CURRENT face's content (front = the card; back = the stats read out,
  // since the nested rows/button aren't individually focusable inside the accessible card).
  const artist = item.card.isCustom ? 'YOU' : null;
  const backLabel =
    `${item.title} stats. ${item.hours} hours. ` +
    `${item.percentComplete == null ? 'completion not set' : `${item.percentComplete} percent complete`}. ` +
    `${STATUS_LABEL[item.status]}. ` +
    `${item.ownedSince ? `owned since ${item.ownedSince.slice(0, 4)}` : 'owned date not set'}. ` +
    `card artist ${artist ?? 'default'}.`;

  return (
    <View onLayout={onLayout} style={[width != null && height != null ? { width, height } : null, style]}>
      {/* TAP LAYER — the single a11y flip button, rendered BEHIND the faces (which pass taps through to
          it). Kept a SIBLING of the VIEW GAME keycap, never its ancestor, so the web tree never nests a
          <button> inside a <button> — an invalid-HTML hydration error that also froze the flip animation. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onToggle}
        onLongPress={onNavigate}
        accessibilityRole="button"
        accessibilityLabel={flipped ? backLabel : `${item.title} card`}
        accessibilityHint={flipped ? 'Flips back to the card' : 'Flips to your stats'}
        accessibilityActions={[{ name: 'viewgame', label: 'View game' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'viewgame') onNavigate();
        }}
      />

      {/* FRONT — display-only; pointerEvents:none so taps fall through to the tap layer behind. Hidden
          from the screen reader (the tap layer is the single a11y element). */}
      <Animated.View
        pointerEvents="none"
        aria-hidden
        style={[styles.face, { opacity: frontOpacity, transform: [{ perspective: 900 }, { rotateY: frontRotate }] }]}
      >
        <CardFace
          title={item.title}
          composition={parseComposition(item.card.composition)}
          size="grid"
          nowPlaying={item.nowPlaying}
          style={styles.fill}
        />
      </Animated.View>

      {/* BACK — the CARD-01 stats back + the visible VIEW GAME keycap. `box-none` once SETTLED so a tap on
          the stats area falls through to the tap layer (flip back) while the keycap captures its own tap
          (navigate); `none` mid-flip so the invisible keycap can't catch a tap (opacity ≠ hit-test). */}
      <Animated.View
        pointerEvents={settled && flipped ? 'box-none' : 'none'}
        aria-hidden
        style={[styles.face, { opacity: backOpacity, transform: [{ perspective: 900 }, { rotateY: backRotate }] }]}
      >
        <StatsBack
          hours={item.hours}
          percent={item.percentComplete}
          status={STATUS_LABEL[item.status]}
          since={item.ownedSince}
          // GAP-D1 — no designer rider on the collection payload; reuse the Game-page convention.
          artist={artist}
          gameTitle={item.title}
          width={box.w}
          height={box.h}
          footer={
            <ScreenButton
              label="View game ›"
              variant="secondary"
              size="mini"
              block
              onPress={onNavigate}
              accessibilityLabel={`View ${item.title} game page`}
            />
          }
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  face: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  fill: { width: '100%', height: '100%' },
});
