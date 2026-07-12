import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { themedStyles } from '../../theme';
import { announce } from '../../a11y/announce';

// OfflineStrip (D9 · C6 · SYS-10) — the CALM connectivity strip. Unlike the accent PreviewStrip, this
// never alarms: a muted panel tone that auto-recovers. Shown while a device write is failing transiently
// with a retry pending (the honest offline signal — see device.tsx). Owned changes still browse from
// cache; SAVE CURRENT + the PATCH retry re-arm on reconnect.
export function OfflineStrip() {
  const styles = useStyles();
  // CARD-16 live-region (0044 §105): the strip only MOUNTS when the write goes offline — that
  // appearance is an async result the user can't see, so announce it ONCE on mount. `announce`
  // (announceForAccessibility) is the single cross-platform path — an `accessibilityRole="alert"` +
  // `accessibilityLiveRegion` would ALSO auto-announce on Android (double/triple-speak, murr m2).
  useEffect(() => announce("Offline — changes sync when you're back"), []);
  return (
    <View style={styles.strip}>
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
