import { View, Text } from 'react-native';
import { themedStyles } from '../../theme';

// PreviewStrip (component-map §7 · board P3) — the "◆ PREVIEWING — «name»" status shown while a premium
// screen theme is being tried on (the whole page re-themes live, DEV-04). (Distinct from the device
// editor's DevicePreviewStrip — this is the Store's commerce voice.)
//
// F-15 fix 2 (owner round-3): the label is a PASSIVE STATUS, not a control — it wears the gold economy
// voice as TEXT (F-02), never a gold FILL that reads as a hold/buy key.
// Owner declutter (round-4): the EXIT chip is gone — closing the sheet IS the exit (the preview clears
// on close/unmount, F-13 C7), so the strip is now purely informational.
export function PreviewStrip({ name }: { name: string }) {
  const styles = useStyles();
  return (
    <View style={styles.strip} accessibilityLiveRegion="polite">
      <Text style={styles.label} numberOfLines={1}>
        ◆ PREVIEWING — {name.toUpperCase()}
      </Text>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  // a flat status banner (F-09), not a filled button — a hairline delineates it above the preview stage.
  strip: {
    alignSelf: 'stretch',
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.sm,
  },
  // passive status — gold economy voice as TEXT only (F-02).
  label: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.value, letterSpacing: 1 },
}));
