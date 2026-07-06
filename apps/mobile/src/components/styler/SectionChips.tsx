import { View, Text, Pressable, StyleSheet } from 'react-native';
import { StateMark } from '../StateMark';
import { theme } from '../../theme';

// SectionChips (component-map §8a / the board `.schips`) — the five attribute chips + the ALWAYS-
// PRESENT sixth ⤢ CANVAS chip (orange — a posture switch, not a section; owner ruling 2026-06-13).
// Chip-TAP is the non-gesture section switch (the CARD-16 baseline beside the swipe). F-09 selection:
// accent border + pip; F-07 square.

export type StylerSection = 'frame' | 'effect' | 'finish' | 'plate' | 'title';
export const STYLER_SECTIONS: Array<{ id: StylerSection; label: string }> = [
  { id: 'frame', label: 'FRAME' },
  { id: 'effect', label: 'EFFECT' },
  { id: 'finish', label: 'FINISH' },
  { id: 'plate', label: 'PLATE' },
  { id: 'title', label: 'TITLE' },
];

export function SectionChips({
  value,
  onChange,
  onCanvas,
}: {
  value: StylerSection;
  onChange: (s: StylerSection) => void;
  /** The Canvas posture door — undefined = disabled (the Canvas arrives at §3.4). */
  onCanvas?: () => void;
}) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {STYLER_SECTIONS.map((s) => {
        const active = s.id === value;
        return (
          <Pressable
            key={s.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(s.id)}
            style={[styles.chip, active && styles.chipActive]}
          >
            {active ? <StateMark size={6} style={{ marginRight: 4 }} /> : null}
            <Text style={[styles.label, active && styles.labelActive]}>{s.label}</Text>
          </Pressable>
        );
      })}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open the Canvas"
        accessibilityState={{ disabled: !onCanvas }}
        disabled={!onCanvas}
        onPress={onCanvas}
        style={[styles.chip, styles.canvasChip, !onCanvas && styles.canvasDisabled]}
      >
        <Text style={styles.canvasLabel}>⤢ CANVAS</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm, justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    backgroundColor: theme.scr.panel,
    borderRadius: theme.corner.screen, // F-07 square
  },
  chipActive: { borderColor: theme.scr.accent, backgroundColor: 'rgba(255,159,67,0.10)' },
  label: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1 },
  labelActive: { color: theme.scr.ink },
  canvasChip: { borderColor: theme.scr.accent, backgroundColor: 'rgba(255,159,67,0.06)' },
  canvasDisabled: { opacity: 0.45 },
  canvasLabel: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.accent, letterSpacing: 1 },
});
