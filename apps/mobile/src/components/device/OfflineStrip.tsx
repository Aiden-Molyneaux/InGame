import { Text, View } from 'react-native';
import { themedStyles } from '../../theme';

// OfflineStrip (D9 · C6 · SYS-10) — the CALM connectivity strip. Unlike the accent PreviewStrip, this
// never alarms: a muted panel tone that auto-recovers. Shown while a device write is failing transiently
// with a retry pending (the honest offline signal — see device.tsx). Owned changes still browse from
// cache; SAVE CURRENT + the PATCH retry re-arm on reconnect.
export function OfflineStrip() {
  const styles = useStyles();
  return (
    <View style={styles.strip} accessibilityRole="alert">
      <Text style={styles.label}>OFFLINE — CHANGES SYNC WHEN YOU'RE BACK</Text>
      <Text style={styles.sync}>RETRYING…</Text>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.space.md,
    backgroundColor: t.scr.panelHi,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: t.scr.hairline,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.sm,
  },
  label: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.micro, // 9 (F-06)
    color: t.scr.dim,
    letterSpacing: 1,
    flexShrink: 1,
  },
  sync: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.micro,
    color: t.scr.faint,
    letterSpacing: 1,
  },
}));
