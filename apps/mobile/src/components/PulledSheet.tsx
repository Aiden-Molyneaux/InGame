import { Modal, Pressable, View, ScrollView, StyleSheet } from 'react-native';
import type { ReactNode } from 'react';
import { theme } from '../theme';

// PulledSheet (component-map §5.7) — the GRAB-HANDLE bottom drawer (sort/filter, store detail).
// One primitive; scrim tap dismisses. role=dialog per the §1.6b a11y baseline.
export function PulledSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} accessibilityLabel="Close" onPress={onClose} />
      <View style={styles.sheet} accessibilityViewIsModal accessibilityRole="none">
        <View style={styles.handle} />
        <ScrollView contentContainerStyle={styles.body}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: theme.scr.panel,
    borderTopWidth: 1,
    borderTopColor: theme.scr.hairline,
    maxHeight: '75%',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    marginTop: theme.space.md,
    backgroundColor: theme.scr.faint,
  },
  body: { padding: theme.space.xl, gap: theme.space.xl },
});
