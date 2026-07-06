import { useRef, useState } from 'react';
import { View, Text, StyleSheet, type LayoutChangeEvent, PanResponder } from 'react-native';
import { theme } from '../../theme';

// IntensitySlider (component-map §8a — the catalog slider, named at the styler gate): flat track
// (F-09 — a plane, not a groove), accent fill, cream keycap thumb, the % value. Drives the ONE
// effect's intensity (CARD-12/OQ-048 — the value persists in the composition). Tap-to-set + drag.

export function IntensitySlider({
  value,
  onChange,
}: {
  /** 0..1 */
  value: number;
  onChange: (v: number) => void;
}) {
  const [trackW, setTrackW] = useState(0);
  const trackWRef = useRef(0);
  const onLayout = (e: LayoutChangeEvent) => {
    trackWRef.current = e.nativeEvent.layout.width;
    setTrackW(e.nativeEvent.layout.width);
  };

  const setFromX = (x: number) => {
    const w = trackWRef.current;
    if (w <= 0) return;
    onChange(Math.min(1, Math.max(0, x / w)));
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => setFromX(e.nativeEvent.locationX),
      onPanResponderMove: (e) => setFromX(e.nativeEvent.locationX),
    }),
  ).current;

  const pct = Math.round(value * 100);
  const thumbX = trackW > 0 ? value * trackW : 0;

  return (
    <View style={styles.row}>
      <Text style={styles.label}>INTENSITY</Text>
      <View
        style={styles.trackWrap}
        onLayout={onLayout}
        accessibilityRole="adjustable"
        accessibilityLabel="Effect intensity"
        accessibilityValue={{ min: 0, max: 100, now: pct }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const step = e.nativeEvent.actionName === 'increment' ? 0.05 : -0.05;
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
      <Text style={styles.value}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md, paddingVertical: theme.space.sm },
  label: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1.5 },
  trackWrap: { flex: 1, height: 28, justifyContent: 'center' },
  track: { height: 4, backgroundColor: theme.scr.panelHi, borderRadius: theme.corner.screen },
  fill: { position: 'absolute', height: 4, backgroundColor: theme.scr.accent },
  thumb: {
    position: 'absolute',
    width: 14,
    height: 18,
    backgroundColor: theme.brand.cream,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    borderRadius: theme.corner.screen, // F-07 square — a tiny cream keycap
  },
  value: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.ink, width: 34, textAlign: 'right' },
});
