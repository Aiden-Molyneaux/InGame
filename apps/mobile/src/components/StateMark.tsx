import { View, StyleSheet, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { theme } from '../theme';
import { steppedRectPath } from '../theme/steppedPath';

// StateMark (component-map §5.4) — the ON-SCREEN selection marker / position pip: an orange notched
// pixel-square (scr.accent), NOT the round pink shell LED (PipLight). F-05/F-09. Square + flat (F-07).
// The TL+BR pixel-step is REAL now (decision 0041 / OQ-127) — half the card step, via the shared
// steppedRectPath helper (replaces the old no-op borderTopLeftRadius fake).
export function StateMark({ size = 10, style }: { size?: number; style?: ViewStyle }) {
  const u = theme.step / 2;
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Path d={steppedRectPath(size, size, u)} fill={theme.scr.accent} />
      </Svg>
    </View>
  );
}
