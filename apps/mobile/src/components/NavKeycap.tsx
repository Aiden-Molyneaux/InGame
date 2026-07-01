import { Pressable, Text, View, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { PipLight } from './PipLight';

// NavKeycap (component-map §5.1) — a SHELL keycap (3D — F-03 shell physics: a hard drop edge that
// travels when pressed; the shell stays 3D even though on-screen buttons went flat). `active` shows a
// PipLight (round pink LED, F-05). `accent`: the Collection key is pink, the Store key gold.
export function NavKeycap({
  label,
  active = false,
  disabled = false,
  accent = 'default',
  onPress,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  accent?: 'default' | 'collection' | 'store';
  onPress?: () => void;
}) {
  const accentColor =
    accent === 'store' ? theme.brand.gold : accent === 'collection' ? theme.brand.accent : undefined;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.key,
        active && styles.keyActive,
        pressed && styles.keyPressed, // travel (F-03)
        disabled && styles.keyDisabled,
      ]}
    >
      <View style={styles.pipRow}>{active ? <PipLight size={5} /> : <View style={{ height: 5 }} />}</View>
      <Text
        style={[
          styles.label,
          active && styles.labelActive,
          accentColor ? { color: active ? accentColor : theme.shell.silk } : null,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  key: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: theme.space.md,
    marginHorizontal: 2,
    backgroundColor: theme.shell.plastic,
    borderRadius: theme.corner.shell, // F-07 radius on the shell
    borderBottomWidth: 4, // the hard drop edge (F-03)
    borderBottomColor: theme.shell.lo,
  },
  keyActive: { backgroundColor: theme.shell.hi },
  keyPressed: { borderBottomWidth: 1, marginTop: 3, transform: [{ translateY: 3 }] }, // travels
  keyDisabled: { opacity: 0.45 },
  pipRow: { height: 5, justifyContent: 'center' },
  label: {
    fontFamily: theme.font.shell, // Paytone One on the plastic (F-08)
    fontSize: theme.type.micro, // 9
    color: theme.shell.silk,
    letterSpacing: 0.5,
  },
  labelActive: { color: theme.shell.silk },
});
