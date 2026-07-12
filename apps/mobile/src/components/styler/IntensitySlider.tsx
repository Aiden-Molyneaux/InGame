import { useEffect, useRef, useState } from 'react';
import { Platform, View, Text, type LayoutChangeEvent, PanResponder } from 'react-native';
import { themedStyles } from '../../theme';
import { useScrollLock } from '../ScrollLock';

// IntensitySlider (component-map §8a — the catalog slider, named at the styler gate): flat track
// (F-09 — a plane, not a groove), accent fill, cream keycap thumb, the % value. Drives the ONE
// effect's intensity (CARD-12/OQ-048 — the value persists in the composition). Tap-to-set + drag.
// While HELD it locks the host scroll (design-spec 0.54 round 3 — a drag must not pan the page);
// on web `touchAction:none` keeps the browser from claiming the touch as a scroll.

export function IntensitySlider({
  value,
  onChange,
  onBegin,
  label = 'INTENSITY',
  accessibilityLabel = 'Effect intensity',
  valueText,
}: {
  /** 0..1 */
  value: number;
  onChange: (v: number) => void;
  /** fired ONCE per gesture (responder grant / a11y step) — callers push their one undo entry here,
   *  never per onChange frame (murr round 4 F2: per-frame begins flooded the 60-cap history) */
  onBegin?: () => void;
  /** Variant, not a fork — the Canvas EDIT sheet reuses the catalog slider as OPACITY (CARD-10). */
  label?: string;
  accessibilityLabel?: string;
  /** override the trailing read-out + the a11y value (e.g. "170°", "40%") — the TransformDrawer's
   *  rotation/size sliders aren't percentages of the track (murr M1). Omit → the default N%. */
  valueText?: string;
}) {
  const [trackW, setTrackW] = useState(0);
  const trackWRef = useRef(0);
  const onLayout = (e: LayoutChangeEvent) => {
    trackWRef.current = e.nativeEvent.layout.width;
    setTrackW(e.nativeEvent.layout.width);
  };

  // The PanResponder is created ONCE — every handler must read the CURRENT props/context through
  // refs, never its mount-time closure (murr round 3 🔴F1: a frozen `onChange` made the Transform W
  // slider write with a stale sibling dimension and the OPACITY slider write a stale slip index).
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onBeginRef = useRef(onBegin);
  onBeginRef.current = onBegin;
  const setFromX = (x: number) => {
    const w = trackWRef.current;
    if (w <= 0) return;
    onChangeRef.current(Math.min(1, Math.max(0, x / w)));
  };

  const scrollLock = useScrollLock();
  const lockRef = useRef(scrollLock);
  lockRef.current = scrollLock;
  const heldRef = useRef(false); // an unmount mid-drag never fires release — unlock in cleanup (murr F5)
  useEffect(
    () => () => {
      if (heldRef.current) lockRef.current.unlock();
    },
    [],
  );
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        heldRef.current = true;
        lockRef.current.lock();
        onBeginRef.current?.(); // ONE undo entry per gesture (murr F2)
        setFromX(e.nativeEvent.locationX);
      },
      onPanResponderMove: (e) => setFromX(e.nativeEvent.locationX),
      onPanResponderRelease: () => {
        heldRef.current = false;
        lockRef.current.unlock();
      },
      onPanResponderTerminate: () => {
        heldRef.current = false;
        lockRef.current.unlock();
      },
    }),
  ).current;

  const pct = Math.round(value * 100);
  const thumbX = trackW > 0 ? value * trackW : 0;
  const styles = useStyles();

  return (
    <View style={[styles.row, WEB_NOSELECT]}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[styles.trackWrap, WEB_TOUCH]}
        onLayout={onLayout}
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={valueText ? { text: valueText } : { min: 0, max: 100, now: pct }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const step = e.nativeEvent.actionName === 'increment' ? 0.05 : -0.05;
          onBegin?.(); // a discrete a11y step is its own gesture
          onChange(Math.min(1, Math.max(0, value + step)));
        }}
        {...pan.panHandlers}
      >
        {/* pointerEvents none — a touch landing ON a child reports locationX relative to that
            child, snapping the value toward 0; the track wrap must own every touch */}
        <View style={styles.track} pointerEvents="none" />
        <View style={[styles.fill, { width: thumbX }]} pointerEvents="none" />
        <View style={[styles.thumb, { left: Math.max(0, thumbX - 7) }]} pointerEvents="none" />
      </View>
      <Text style={styles.value}>{valueText ?? `${pct}%`}</Text>
    </View>
  );
}

// web: stop the browser claiming a slider touch as a page pan, and stop drags leaving the labels
// text-selected (parvati round 3) — native ignores both props
const WEB_TOUCH = Platform.OS === 'web' ? ({ touchAction: 'none' } as object) : null;
const WEB_NOSELECT = Platform.OS === 'web' ? ({ userSelect: 'none' } as object) : null;

const useStyles = themedStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space.md, paddingVertical: t.space.sm },
  label: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },
  trackWrap: { flex: 1, height: 28, justifyContent: 'center' },
  track: { height: 4, backgroundColor: t.scr.panelHi, borderRadius: t.corner.screen },
  fill: { position: 'absolute', height: 4, backgroundColor: t.scr.accent },
  thumb: {
    position: 'absolute',
    width: 14,
    height: 18,
    backgroundColor: t.brand.cream,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    borderRadius: t.corner.screen, // F-07 square — a tiny cream keycap
  },
  value: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.ink, width: 34, textAlign: 'right' },
}));
