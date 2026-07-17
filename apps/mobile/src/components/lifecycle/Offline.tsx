import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { themedStyles, useTheme } from '../../theme';
import { announce } from '../../a11y/announce';
import { StateFrame } from './StateFrame';

// Offline (component-map §5.6 · design-spec §1.6 · SYS-10) — the CALM connectivity state. NEVER an
// alarm: a muted tone that AUTO-RECOVERS; your own data stays read-only-usable, writes are gated. This
// is the GENERALIZED sibling of the device-scoped `device/OfflineStrip` (left in place — this does not
// replace it). Two postures:
//   • `strip` (default) — a compact inline banner (the OfflineStrip pattern, theme-general): the honest
//     "offline, writes wait" signal docked into a screen that still browses from cache.
//   • `full`  — the whole-view calm state (a wifi-off glyph in the dashed silhouette) for screens with
//     nothing cached to show (e.g. an auth write, which can't read from cache).
// Announces once on mount (CARD-16 / decision 0044 §105 — the offline transition is an unseen result).
export function Offline({
  variant = 'strip',
  message,
  detail,
  retrying = false,
}: {
  variant?: 'strip' | 'full';
  /** Override the default calm copy. */
  message?: string;
  /** `full` posture only — a second plain-words line. */
  detail?: string;
  /** `strip` posture — show the quiet "RETRYING…" tail while a gated write waits. */
  retrying?: boolean;
}) {
  const t = useTheme();
  const styles = useStyles();
  const label = message ?? "OFFLINE — CHANGES SYNC WHEN YOU'RE BACK";
  useEffect(() => announce(message ?? "Offline — changes sync when you're back"), [message]);

  const wifiOff = (
    <Svg width={40} height={40} viewBox="0 0 40 40">
      {/* calm wifi-off — the arcs + a slash (never a red alert) */}
      <Path d="M6 15c8-7 20-7 28 0" fill="none" stroke={t.scr.faint} strokeWidth={2} strokeLinecap="round" />
      <Path d="M11 21c5.2-4.4 12.8-4.4 18 0" fill="none" stroke={t.scr.faint} strokeWidth={2} strokeLinecap="round" />
      <Path d="M16 27c2.4-1.9 5.6-1.9 8 0" fill="none" stroke={t.scr.faint} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={20} cy={32} r={1.7} fill={t.scr.faint} />
      <Line x1={8} y1={8} x2={32} y2={34} stroke={t.scr.dim} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );

  if (variant === 'full') {
    return (
      <StateFrame title="Offline" body={detail ?? "You're offline. This waits for the connection to come back."} titleTone="dim" glyph={wifiOff} />
    );
  }

  return (
    <View style={styles.strip} accessibilityRole="alert">
      <Text style={styles.label}>{label}</Text>
      {retrying ? <Text style={styles.sync}>RETRYING…</Text> : null}
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
