import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

// EditBar (component-map §8b / board change-1) — undo/redo + the scoped RESET SLIP, docked just
// above the rack for thumb reach (CARD-09). Dim when there's nothing to act on. History is the
// SESSION's one stack (styler picks + canvas ops — one document, one history).

export function EditBar({
  canUndo,
  canRedo,
  canReset,
  onUndo,
  onRedo,
  onReset,
}: {
  canUndo: boolean;
  canRedo: boolean;
  canReset: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
}) {
  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reset this slip"
        accessibilityState={{ disabled: !canReset }}
        disabled={!canReset}
        onPress={onReset}
        hitSlop={6}
      >
        <Text style={[styles.reset, !canReset && styles.dim]}>RESET SLIP</Text>
      </Pressable>
      <View style={styles.spacer} />
      <Key glyph="↺" label="UNDO" enabled={canUndo} onPress={onUndo} />
      <Key glyph="↻" label="REDO" enabled={canRedo} onPress={onRedo} />
    </View>
  );
}

function Key({ glyph, label, enabled, onPress }: { glyph: string; label: string; enabled: boolean; onPress: () => void }) {
  return (
    <View style={styles.keyWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label.toLowerCase()}
        accessibilityState={{ disabled: !enabled }}
        disabled={!enabled}
        onPress={onPress}
        style={[styles.key, !enabled && styles.dim]}
      >
        <Text style={styles.keyGlyph}>{glyph}</Text>
      </Pressable>
      <Text style={styles.keyLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: theme.space.lg, paddingVertical: theme.space.sm },
  reset: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 0.5 },
  spacer: { flex: 1 },
  keyWrap: { alignItems: 'center', gap: 2 },
  key: {
    width: 30,
    height: 30,
    backgroundColor: theme.brand.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyGlyph: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.brand.navy },
  keyLabel: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1 },
  dim: { opacity: 0.4 },
});
