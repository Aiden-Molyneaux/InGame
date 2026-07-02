import { View, type ViewStyle } from 'react-native';
import { theme } from '../theme';

// StateMark (component-map §5.4) — the ON-SCREEN selection marker: an orange notched pixel-square
// (scr.accent), NOT the round pink shell LED (PipLight). F-05/F-09. Square + flat (F-07).
export function StateMark({ size = 10, style }: { size?: number; style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          backgroundColor: theme.scr.accent,
          // TL+BR pixel-step notch (the StateMark geometry) — half the card step.
          borderTopLeftRadius: 0,
          transform: [{ rotate: '0deg' }],
        },
        style,
      ]}
    />
  );
}
