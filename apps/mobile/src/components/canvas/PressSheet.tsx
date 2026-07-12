import { useRef } from 'react';
import { AccessibilityInfo, Animated, Text } from 'react-native';
import { PulledSheet } from '../PulledSheet';
import { SaveOption } from '../styler/SaveOption';
import { themedStyles } from '../../theme';

// PressSheet (component-map §8b / board P7) — the Canvas finish-up sheet: "where does it go?"
// Canonical labels PUBLISH · SAVE PRIVATE · TO THE STYLER (the workshop flavors eyebrows only).
// ◆ PUBLISH + the CARD-19 checklist + CARD-20 immutability + the P8 PrintRitual are
// EXPECTED(M5 · decision 0062 §2) — PUBLISH renders present-but-disabled (the surface's standing
// posture for deferred doors). SAVE PRIVATE runs the Styler's ONE quiet-exit implementation
// (two-door model extended, never forked); TO THE STYLER is the posture switch back.
// CR-17 (gate-5): SAVE PRIVATE carries GOLD weight + a LIGHT press beat — a quick scale flash before
// the save fires (distinct from the full M5 publish PrintRitual; reduce-motion skips it).

const BEAT_MS = 250;

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
  const styles = useStyles();
  const beat = useRef(new Animated.Value(1)).current;

  const pressPrivate = () => {
    if (busy) return;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) {
        onSavePrivate();
        return;
      }
      // a light press beat — dip + settle, then hand off to the save (no full-screen ritual)
      Animated.sequence([
        Animated.timing(beat, { toValue: 0.96, duration: BEAT_MS * 0.4, useNativeDriver: true }),
        Animated.timing(beat, { toValue: 1, duration: BEAT_MS * 0.6, useNativeDriver: true }),
      ]).start(() => onSavePrivate());
    });
  };

  return (
    <PulledSheet visible={visible} onClose={onClose} title="The press — where does it go?">
      <SaveOption
        label="◆ Publish"
        sub="Adoptable by everyone — arrives with the community release."
        gold
        disabled
        onPress={() => {}}
      />
      <Animated.View style={{ transform: [{ scale: beat }] }}>
        <SaveOption
          label={busy ? '…' : 'Save private'}
          sub="Kept on your shelf — not worn. Back to the game."
          gold
          disabled={busy}
          onPress={pressPrivate}
        />
      </Animated.View>
      <SaveOption
        label="To the Styler"
        sub="Swap posture — same draft, frames and effects live there."
        disabled={busy}
        onPress={onToStyler}
      />
      {/* CR-20 — one document: a save from the Canvas keeps the whole card, Styler work included */}
      <Text style={styles.crossPostureNote}>Saving keeps the whole card — your Styler work too.</Text>
    </PulledSheet>
  );
}

const useStyles = themedStyles((t) => ({
  crossPostureNote: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.micro,
    color: t.scr.dim,
    letterSpacing: 0.5,
    paddingTop: t.space.sm,
  },
}));
