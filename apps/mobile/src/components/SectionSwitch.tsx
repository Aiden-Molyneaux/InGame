import { Pressable, Text, View } from 'react-native';
import { themedStyles } from '../theme';
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
  const styles = useStyles();
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

const useStyles = themedStyles((t) => ({
  row: { flexDirection: 'row', gap: t.space.sm },
  seg: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.sm,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    borderRadius: t.corner.screen, // F-07 square
  },
  segActive: { borderColor: t.scr.accent, backgroundColor: 'rgba(255,159,67,0.10)' }, // accent-tint fill (F-09)
  label: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.micro, // 9
    color: t.scr.dim,
    letterSpacing: 1,
  },
  labelActive: { color: t.scr.accent },
}));
