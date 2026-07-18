import { View, Text } from 'react-native';
import { PulledSheet } from './PulledSheet';
import { ScreenButton } from './ScreenButton';
import { HoldFillButton } from './commerce/HoldFillButton';
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
  holdToConfirm = false,
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
  /**
   * P12 (decision 0040 · settings-states S7b) — the CALM accent confirm for a session-ending but
   * REVERSIBLE action (sign-out) or a restorative one (unblock): the standard accent `ScreenButton`,
   * never the alert-red. The board draws sign-out with the accent seal + accent confirm, deliberately
   * NOT red — the red `/destructive` stays reserved for genuinely destructive ops (delete, remove).
   */
  tone?: 'destructive' | 'purchase' | 'primary';
  /**
   * M5 F-9 (G2) — the mock PAY on packs holds-to-activate with a FILLING sweep, so a dollar confirm
   * speaks the same hold grammar as every PX spend. The button fills gold over a hold; reduce-motion
   * collapses to a plain press (this sheet is already the confirm gate). M5 F-13 B2 (owner round-2
   * ruling): the pack PAY hold now wears the SAME look as the cosmetic HoldFillButton — GOLD default
   * fill (not the cream $-voice), ALL-CAPS label — so a pack purchase reads identically to a PX buy.
   * Only meaningful with `tone='purchase'`.
   */
  holdToConfirm?: boolean;
}) {
  const styles = useStyles();
  return (
    <PulledSheet visible={visible} onClose={onClose} title={title}>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.actions}>
        {holdToConfirm && tone === 'purchase' ? (
          <HoldFillButton label={busy ? '…' : confirmLabel.toUpperCase()} tone="gold" onComplete={onConfirm} disabled={busy} block />
        ) : (
          <ScreenButton
            label={busy ? '…' : confirmLabel}
            variant={tone === 'purchase' ? 'add' : tone === 'primary' ? 'primary' : 'destructive'}
            onPress={onConfirm}
            disabled={busy}
            block
          />
        )}
        {/* W-B4 (owner walk2, the F-21 family finish) — BUY confirms carry NO explicit CANCEL: the
            purchase tone's escape is the sheet grammar itself (scrim tap / grab handle / hardware back
            via PulledSheet → onClose). The destructive/primary tones KEEP the 0040 CANCEL — the
            safe-default weight is core to the destructive grammar, and those aren't buy pages. */}
        {tone !== 'purchase' ? (
          <ScreenButton label="Cancel" variant="secondary" onPress={onClose} disabled={busy} block />
        ) : null}
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
