import { Pressable, View, Text } from 'react-native';
import { themedStyles } from '../../theme';

// PreviewStrip (component-map §7 · board P3) — the "◆ PREVIEWING — «name»" status shown while a premium
// screen theme is being tried on (the whole page re-themes live, DEV-04); EXIT ✕ reverts to the saved
// theme. (Distinct from the device editor's DevicePreviewStrip — this is the Store's commerce voice.)
//
// F-15 fix 2 (owner round-3): the label is a PASSIVE STATUS, not a control — it wears the gold economy
// voice as TEXT (F-02), never a gold FILL that reads as a hold/buy key. Only EXIT is pressable, as a
// bounded, clearly-separate dismiss chip with its own hit target. Row layout can't overlap: the label
// shrinks (numberOfLines) while EXIT holds its bounds (flexShrink:0).
export function PreviewStrip({ name, onExit }: { name: string; onExit: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.strip} accessibilityLiveRegion="polite">
      <Text style={styles.label} numberOfLines={1}>
        ◆ PREVIEWING — {name.toUpperCase()}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Exit preview"
        onPress={onExit}
        hitSlop={8}
        style={styles.exitBtn}
      >
        <Text style={styles.exitTxt}>EXIT ✕</Text>
      </Pressable>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  // a flat status banner (F-09), not a filled button — a hairline delineates it above the preview stage.
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.space.md,
    alignSelf: 'stretch',
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.sm,
  },
  // passive status — gold economy voice as TEXT only (F-02); shrinks so it can never overrun EXIT.
  label: { flexShrink: 1, fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.value, letterSpacing: 1 },
  // EXIT — the ONE interactive control: a bounded, comfortably-tappable dismiss chip that holds its bounds.
  exitBtn: { flexShrink: 0, paddingHorizontal: t.space.md, paddingVertical: t.space.xs, borderWidth: 1, borderColor: t.scr.dim },
  exitTxt: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.ink, letterSpacing: 1 },
}));
