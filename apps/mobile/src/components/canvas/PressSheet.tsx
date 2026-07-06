import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../../theme';
import { PulledSheet } from '../PulledSheet';
import { SaveOption } from '../styler/SaveOption';

// PressSheet (component-map §8b / board P7) — the Canvas finish-up sheet: "where does it go?"
// Canonical labels PUBLISH · SAVE PRIVATE · TO THE STYLER (the workshop flavors eyebrows only).
// ◆ PUBLISH + the CARD-19 checklist + CARD-20 immutability + the P8 PrintRitual are
// EXPECTED(M5 · decision 0062 §2) — PUBLISH renders present-but-disabled (the surface's standing
// posture for deferred doors). SAVE PRIVATE runs the Styler's ONE quiet-exit implementation
// (two-door model extended, never forked); TO THE STYLER is the posture switch back.

export function PressSheet({
  visible,
  onClose,
  busy,
  onSavePrivate,
  onToStyler,
}: {
  visible: boolean;
  onClose: () => void;
  busy: boolean;
  onSavePrivate: () => void;
  onToStyler: () => void;
}) {
  return (
    <PulledSheet visible={visible} onClose={onClose} title="The press — where does it go?">
      <SaveOption
        label="◆ Publish"
        sub="Adoptable by everyone — arrives with the community release."
        gold
        disabled
        onPress={() => {}}
      />
      <SaveOption
        label={busy ? '…' : 'Save private'}
        sub="Kept on your shelf — not worn. Back to the game."
        disabled={busy}
        onPress={onSavePrivate}
      />
      <SaveOption
        label="To the Styler"
        sub="Swap posture — same draft, frames and effects live there."
        disabled={busy}
        onPress={onToStyler}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={onClose} style={styles.cancel}>
        <Text style={styles.cancelText}>CANCEL</Text>
      </Pressable>
    </PulledSheet>
  );
}

const styles = StyleSheet.create({
  cancel: { alignSelf: 'center', paddingVertical: theme.space.sm },
  cancelText: { fontFamily: theme.font.screenSemi, fontSize: theme.type.body, color: theme.scr.dim, letterSpacing: 1 },
});
