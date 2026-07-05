import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { theme } from '../../theme';
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
  return (
    <View style={{ width, height }} accessibilityLabel="Your stats card back">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Path
          d={steppedRectPath(width, height, theme.step, { tr: true, bl: true })}
          fill={theme.scr.panel}
          stroke={theme.scr.hairline}
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
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: { flex: 1, padding: theme.space.lg },
  title: {
    fontFamily: theme.font.screenBold,
    fontSize: theme.type.micro, // 9 (F-06 floor)
    color: theme.scr.ink,
    letterSpacing: 1,
    textAlign: 'center',
    paddingBottom: theme.space.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.scr.hairline,
  },
  rows: { flex: 1, gap: theme.space.md, paddingVertical: theme.space.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.space.sm },
  rowLabel: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 0.5 },
  rowValue: {
    fontFamily: theme.font.screenBold,
    fontSize: theme.type.body, // 11
    color: theme.scr.ink,
    letterSpacing: 0.5,
    flexShrink: 1,
    textAlign: 'right',
  },
  prov: { borderTopWidth: 1, borderTopColor: theme.scr.hairline, paddingTop: theme.space.md, gap: 1 },
  provLabel: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1 },
  provName: { fontFamily: theme.font.screenBold, fontSize: theme.type.body, color: theme.brand.gold, letterSpacing: 0.5 },
});
