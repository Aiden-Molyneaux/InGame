import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { themedStyles, useTheme } from '../../theme';
import { steppedRectPath } from '../../theme/steppedPath';

// StatsBack (CARD-01) — the STANDARDIZED stats back of a game card: the auto-stats layout + printed
// provenance ("CARD ARTIST" — designer attribution ONLY, no adoption count, decision 0024). NOT a
// §1.5 catalog component — a client-composed face that reuses the shared F-02 `steppedRectPath` helper
// (the same primitive GameCard/StateMark/ScreenButton draw with) rather than forking GameCard. The
// `.flipy` silhouette (the step on TR+BL, as if the card were turned over) is that helper with those
// corners. Text obeys F-06 (9/11 only) — denser than the mockup's sub-9px back (which the app can't use).
export function StatsBack({
  hours,
  percent,
  status,
  since,
  artist,
  width = 138,
  height = 193,
}: {
  hours: number;
  percent: number | null;
  status: string;
  since: string | null;
  artist: string | null;
  width?: number;
  height?: number;
}) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={{ width, height }} accessibilityLabel="Your stats card back">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Path
          d={steppedRectPath(width, height, t.step, { tr: true, bl: true })}
          fill={t.scr.panel}
          stroke={t.scr.hairline}
          strokeWidth={1}
        />
      </Svg>
      <View style={styles.inner}>
        <Text style={styles.title}>YOUR STATS</Text>
        <View style={styles.rows}>
          <Row label="HOURS" value={String(hours)} />
          <Row label="COMPLETE" value={percent == null ? '—' : `${percent}%`} />
          <Row label="STATUS" value={status.toUpperCase()} />
          <Row label="SINCE" value={since ? since.slice(0, 4) : '—'} />
        </View>
        <View style={styles.prov}>
          <Text style={styles.provLabel}>CARD ARTIST</Text>
          <Text style={styles.provName} numberOfLines={1}>
            {artist ?? 'DEFAULT'}
          </Text>
        </View>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  inner: { flex: 1, padding: t.space.lg },
  title: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro, // 9 (F-06 floor)
    color: t.scr.ink,
    letterSpacing: 1,
    textAlign: 'center',
    paddingBottom: t.space.md,
    borderBottomWidth: 1,
    borderBottomColor: t.scr.hairline,
  },
  rows: { flex: 1, gap: t.space.md, paddingVertical: t.space.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: t.space.sm },
  rowLabel: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  rowValue: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.body, // 11
    color: t.scr.ink,
    letterSpacing: 0.5,
    flexShrink: 1,
    textAlign: 'right',
  },
  prov: { borderTopWidth: 1, borderTopColor: t.scr.hairline, paddingTop: t.space.md, gap: 1 },
  provLabel: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  provName: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.brand.gold, letterSpacing: 0.5 },
}));
