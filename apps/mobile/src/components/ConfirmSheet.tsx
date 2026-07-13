import { View, Text } from 'react-native';
import { PulledSheet } from './PulledSheet';
import { ScreenButton } from './ScreenButton';
import { themedStyles } from '../theme';

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
  tone = 'destructive',
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
  /**
   * The confirm-action weight. `destructive` (default) = the alert-red delete/remove voice — the
   * decision-0040 grammar. `purchase` = the acquisitive GOLD voice (F-02) for a BUY confirm (the mock
   * IAP sheet · the OQ-046 non-hold buy path), which must never read as destructive-red.
   */
  tone?: 'destructive' | 'purchase';
}) {
  const styles = useStyles();
  return (
    <PulledSheet visible={visible} onClose={onClose} title={title}>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.actions}>
        <ScreenButton
          label={busy ? '…' : confirmLabel}
          variant={tone === 'purchase' ? 'add' : 'destructive'}
          onPress={onConfirm}
          disabled={busy}
          block
        />
        <ScreenButton label="Cancel" variant="secondary" onPress={onClose} disabled={busy} block />
      </View>
    </PulledSheet>
  );
}

const useStyles = themedStyles((t) => ({
  message: {
    fontFamily: t.font.screen,
    fontSize: t.type.body, // 11 (F-06)
    color: t.scr.dim,
    lineHeight: 16,
  },
  actions: { gap: t.space.md },
}));
