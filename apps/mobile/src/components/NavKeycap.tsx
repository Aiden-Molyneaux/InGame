import { Pressable, Text, View, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { PipLight } from './PipLight';

// NavKeycap (component-map §5.1) — a SHELL keycap (3D — F-03: a hard drop edge that travels when
// pressed). The key is a cream 54×54 (r15) cap on the teal plastic (F-04: nav legibility beats
// customization); `accent` tints the identity keys (Collection pink, Store gold). `active` lights the
// PipLight (round pink LED, F-05) that sits BELOW the key on the plastic. The decorative per-key glyph
// (grid/person/…) is the iteration lane — the label carries the key for now.
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
  const keyTint =
    accent === 'store' ? theme.brand.gold : accent === 'collection' ? theme.brand.accent : theme.shell.silk;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.item}
    >
      {({ pressed }) => (
        <>
          <View
            style={[
              styles.key,
              { backgroundColor: keyTint },
              (pressed || active) && styles.keyPressed, // travel (F-03)
            ]}
          >
            <Text style={styles.label} numberOfLines={1}>
              {label}
            </Text>
          </View>
          <View style={styles.pipRow}>{active ? <PipLight size={6} /> : null}</View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: { flex: 1, alignItems: 'center', marginHorizontal: 2 },
  key: {
    width: '100%',
    maxWidth: 62,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderRadius: theme.corner.navKey, // 15 (mockup `.nav-btn`)
    borderBottomWidth: 4, // the hard drop edge (F-03)
    borderBottomColor: theme.shell.ink,
  },
  keyPressed: { borderBottomWidth: 1, transform: [{ translateY: 3 }] }, // travels
  label: {
    fontFamily: theme.font.shell, // Paytone One on the plastic (F-08)
    fontSize: theme.type.micro, // 9
    color: theme.shell.ink, // dark ink — legible on the cream/accent cap (F-04)
    letterSpacing: 0.3,
  },
  pipRow: { height: 12, justifyContent: 'center' },
});
