import { Pressable, Text, View, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { StateMark } from './StateMark';

// SectionSwitch (component-map §5.3) — a flat in-screen switch. `variant`: pair · chips · rail. The
// active option = an accent BORDER + the StateMark (F-09 — a border, not a keycap; never a left-rail).
// Drives the Collection view-switch SHELF · GRID · LIST · TOP (COL-07/COL-13).
export interface SectionOption<T extends string> {
  value: T;
  label: string;
}

export function SectionSwitch<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SectionOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.value)}
            style={[styles.seg, active && styles.segActive]}
          >
            {active ? <StateMark size={7} style={{ marginRight: 5 }} /> : null}
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label.toUpperCase()}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: theme.space.sm },
  seg: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    borderRadius: theme.corner.screen, // F-07 square
  },
  segActive: { borderColor: theme.scr.accent, backgroundColor: 'rgba(255,159,67,0.10)' }, // accent-tint fill (F-09)
  label: {
    fontFamily: theme.font.screenSemi,
    fontSize: theme.type.micro, // 9
    color: theme.scr.dim,
    letterSpacing: 1,
  },
  labelActive: { color: theme.scr.accent },
});
