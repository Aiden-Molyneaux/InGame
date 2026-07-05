import { type ReactNode } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { StateMark } from './StateMark';

// ToolButton (component-map §5.3 — was ToolKeycap) — the cream utility keycap in the ToolsBar.
// ICON-ONLY (S3-n): the board's tool keycaps carry a mockup SVG glyph and NO text label
// (collection-states.html:813–816); `label` is the accessibility name only. `active` = the F-09
// StateMark pip (orange notched square — NOT the pink PipLight, F-05). Flat (F-03), square (F-07).
// OQ-034: a TAP acts (search toggles, sort flips, view cycles); a LONG-PRESS opens the drawer.
export function ToolButton({
  icon,
  label,
  active,
  onPress,
  onLongPress,
}: {
  /** The board SVG glyph (navy stroke/fill on the cream cap). */
  icon: ReactNode;
  /** Accessibility name only — the keycap renders no visible label (S3-n). */
  label: string;
  active?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      onLongPress={onLongPress}
      // The 32×30 keycap sits under the 44pt platform tap-target floor; the bar's 12px gap leaves
      // room to make up the difference outside the visible cap.
      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
      style={({ pressed }) => [styles.key, pressed && styles.pressed]}
    >
      {icon}
      {active ? <StateMark size={6} style={styles.mark} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.75 }, // F-03 — energize, no travel
  key: {
    width: 32,
    height: 30,
    backgroundColor: theme.brand.cream,
    borderRadius: theme.corner.screen, // F-07 square
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: { position: 'absolute', top: 2, right: 2 },
});
