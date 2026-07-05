import { View, Text, StyleSheet } from 'react-native';
import { PulledSheet } from './PulledSheet';
import { ScreenButton } from './ScreenButton';
import { theme } from '../theme';

// ConfirmSheet (decision 0040 — the destructive-action confirm grammar) — the pre-confirm gate every
// irreversible/hard-to-reverse action routes through (collection remove COL-01, card delete CARD-14,
// SOC block/unfriend). Composed from `PulledSheet` (the one in-screen drawer primitive) + the
// destructive `ScreenButton`: CANCEL is the safe/default weight (secondary), the destructive action is
// explicit and named. First introduced at the M4 Game page (§3.1); reused app-wide thereafter.
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
  busy = false,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
}) {
  return (
    <PulledSheet visible={visible} onClose={onClose} title={title}>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.actions}>
        <ScreenButton
          label={busy ? '…' : confirmLabel}
          variant="destructive"
          onPress={onConfirm}
          disabled={busy}
          block
        />
        <ScreenButton label="Cancel" variant="secondary" onPress={onClose} disabled={busy} block />
      </View>
    </PulledSheet>
  );
}

const styles = StyleSheet.create({
  message: {
    fontFamily: theme.font.screen,
    fontSize: theme.type.body, // 11 (F-06)
    color: theme.scr.dim,
    lineHeight: 16,
  },
  actions: { gap: theme.space.md },
});
