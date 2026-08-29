import { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import type { CollectionItem } from '@ingame/shared';
import { EntryCard } from '../EntryCard';
import { cardArtist } from '../cardArtist';
import { StatsBack } from '../game/StatsBack';
import { ScreenButton } from '../ScreenButton';
import { STATUS_LABEL } from '../../constants/collection';
import { useReducedMotion } from '../../a11y/useReducedMotion';

// FlipCard (COL-12 · CARD-23 mode 2 FLIP) — the Collection peek-flip. The whole card is the tap-target
// (CARD-07): a TAP flips it in place to the CARD-01 stats back; a LONG-PRESS is the NAVIGATE shortcut to
// the Game page; the back's VIEW GAME control is the visible navigate path (decision 0026 kept navigation
// on the back rather than behind a hidden gesture). Transient — the flipped state lives on the Collection
// screen and is never persisted (the parent clears it on view-switch; it SURVIVES a tab round-trip —
// the walk-5 keep-flip ruling, COL-12 spec 0.70).
//
// The flip is TWO faces on a REANIMATED 3D turn (front rotateY 0→180 · back 180→360, perspective, with
// the opacity step at 90° computed in the SAME worklet — perfectly frame-synchronized on the UI thread).
// Reanimated, not RN `Animated`, deliberately: rounds 3–5 proved on-device that the Animated native
// driver's per-frame transform updates TEAR on Fabric-iOS/Expo Go around these faces (skia <Canvas> +
// react-native-svg content) — the card ripped mid-turn and the shelf row's sibling text flickered, in
// every variant (perspective turn · flat rotateY · backface-hidden). Reanimated applies props through
// its own UI-thread ShadowTree path — the same lane that already animates the skia motion layer
// (`render/animated.tsx`, decision 0068) — and the owner asked for the flip back after a transform-free
// crossfade confirmed the Animated-transform path was the artifact (round 6/7 lineage in col12-manifest).
// Touch is separate from visibility: opacity 0 does NOT block hits, so the back's button is gated on a
// `settled` flag — see below. Under REDUCE-MOTION (CARD-16) the timing is skipped for an instant
// face-swap; the effect re-runs on the runtime toggle so a card can never freeze mid-turn (the KeepBeat
// lesson, 0044 §104).
//
// A11Y (CARD-16): the whole card is ONE screen-reader button (CARD-07) — a transparent tap layer whose
// label carries the CURRENT face's content, with a "View game" accessibility action exposing NAVIGATE.
// Both faces are hidden from the SR so the tap layer is the single a11y element (activate = flip; the
// View-game action = navigate — the non-gesture path). The visible VIEW GAME keycap is a sibling of the
// tap layer, not a descendant (web can't nest a <button> in a <button>).

// motion.cardFlip (0044 §104) — realised as a local constant; no shared `theme.motion` set exists yet
// (PressSheet/KeepBeat each hold their own durations). Extract a shared token when that motion pass lands.
const FLIP_MS = 320;

// MEMOIZED (round-4 owner report — sibling text flicker on device at tap time): every flip tap swaps
// the parent's `flippedIds` Set, re-rendering ShelfView/GridView — without memo that re-rendered ALL
// rows and re-parsed every composition, redrawing every skia Metal canvas at exactly the moment the
// animation starts. With memo + the STABLE id-passing handler contract below, a tap re-renders only
// the tapped card; the other rows (and their canvases) are untouched mid-animation.
export const FlipCard = memo(function FlipCard({
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
  /** Tap the card (front or back-off-the-button) → toggle the flip. Called with the entryId — pass the
      parent's ONE stable handler (never an inline closure), or the memo is defeated. */
  onToggle: (entryId: string) => void;
  /** Long-press (either face) + the back's VIEW GAME → the Game page. Called with the gameId. */
  onNavigate: (gameId: string) => void;
  /** Fixed pixel size (shelf rows). */
  width?: number;
  height?: number;
  /** Fluid sizing (the grid's `width:'100%' · aspectRatio`). */
  style?: ViewStyle;
}) {
  const reduced = useReducedMotion();
  const toggle = () => onToggle(item.entryId);
  const navigate = () => onNavigate(item.gameId);
  const progress = useSharedValue(flipped ? 1 : 0);
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
      progress.value = flipped ? 1 : 0; // instant swap — never leave a face frozen mid-turn
      setSettled(true);
      return;
    }
    setSettled(false);
    progress.value = withTiming(
      flipped ? 1 : 0,
      { duration: FLIP_MS, easing: Easing.inOut(Easing.ease) },
      (finished) => {
        'worklet';
        if (finished) runOnJS(setSettled)(true);
      },
    );
    return () => cancelAnimation(progress);
  }, [flipped, reduced, progress]);

  // Each face's rotation + its 90°-step opacity live in ONE worklet, so the reveal is computed in the
  // same UI-thread frame as the turn (no JS↔native desync — the round-4 "half disappears" came from the
  // two drifting apart). Both faces reach opacity 0 when away — the F-02 silhouettes are notched on
  // different corners (TL+BR front, TR+BL back), so a still-opaque hidden face would peek through the
  // other's notches. `backfaceVisibility` is deliberately NOT used (broken with animated turns on
  // Fabric-iOS, round 5).
  const frontStyle = useAnimatedStyle(() => ({
    opacity: progress.value < 0.5 ? 1 : 0,
    transform: [{ perspective: 900 }, { rotateY: `${progress.value * 180}deg` }],
  }));
  const backStyle = useAnimatedStyle(() => ({
    opacity: progress.value < 0.5 ? 0 : 1,
    transform: [{ perspective: 900 }, { rotateY: `${180 + progress.value * 180}deg` }],
  }));

  // The single-element SR label: the CURRENT face's content (front = the card; back = the stats read out,
  // since the nested rows/button aren't individually focusable inside the accessible card).
  // W-A1 — the shared derivation: adopted cards attribute their DESIGNER, never the adopter.
  const artist = cardArtist(item.card);
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
        onPress={toggle}
        onLongPress={navigate}
        accessibilityRole="button"
        accessibilityLabel={flipped ? backLabel : `${item.title} card`}
        accessibilityHint={flipped ? 'Flips back to the card' : 'Flips to your stats'}
        accessibilityActions={[{ name: 'viewgame', label: 'View game' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'viewgame') navigate();
        }}
      />

      {/* FRONT — display-only; pointerEvents:none so taps fall through to the tap layer behind. Hidden
          from the screen reader (the tap layer is the single a11y element). */}
      {/* RASTERIZED while turning (frame-forensics, owner's 2026-07-13 recording): react-native-svg
          content MIS-DRAWS under an animated 3D transform on Fabric-iOS — the front's panel-coloured
          silhouette swept OVER the row's meta text (the "text disappears" — invisible against the
          same-coloured row) and the back's silhouette vanished mid-turn. Rasterizing the face during
          the animation draws the subtree ONCE into an offscreen bitmap bounded by the face, and the
          transform composites the bitmap — the svg never sees the transform. Off when settled (no
          resting memory/blur cost); reduce-motion never animates so never rasterizes. */}
      <Animated.View
        pointerEvents="none"
        aria-hidden
        shouldRasterizeIOS={!settled}
        renderToHardwareTextureAndroid={!settled}
        style={[styles.face, frontStyle]}
      >
        {/* EntryCard owns the composition-vs-flattened branch, memoizing the parse on the raw rider so
            the skia canvas' props never churn on a re-render (the round-4 canvas re-encode lesson).
            walk2 B6 ⚖ (owner ruling 2026-07-17, 0078) — NO now-playing chrome on view rows: the pin
            renders in the Collection HERO ONLY; the entry rides shelf/grid as a plain card. The board
            drew the on-card ▶ NOW tag on the pinned row (collection-states :571/:766) — the ruling
            supersedes those draws (the 0078 board ripple carries it). */}
        <EntryCard title={item.title} card={item.card} size="grid" style={styles.fill} />
      </Animated.View>

      {/* BACK — the CARD-01 stats back + the visible VIEW GAME keycap. `box-none` once SETTLED so a tap on
          the stats area falls through to the tap layer (flip back) while the keycap captures its own tap
          (navigate); `none` mid-flip so the invisible keycap can't catch a tap (opacity ≠ hit-test). */}
      <Animated.View
        pointerEvents={settled && flipped ? 'box-none' : 'none'}
        aria-hidden
        shouldRasterizeIOS={!settled}
        renderToHardwareTextureAndroid={!settled}
        style={[styles.face, backStyle]}
      >
        <StatsBack
          hours={item.hours}
          percent={item.percentComplete}
          status={STATUS_LABEL[item.status]}
          since={item.ownedSince}
          // W-A1 — the shared cardArtist derivation (designer for adopted; the GAP-D1 payload rider
          // is still owed server-side — reported).
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
              onPress={navigate}
              accessibilityLabel={`View ${item.title} game page`}
            />
          }
        />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  face: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  fill: { width: '100%', height: '100%' },
});
