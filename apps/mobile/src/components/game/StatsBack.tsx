import type { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { themedStyles, useTheme } from '../../theme';
import { cardStepUnit, steppedRectPath } from '../../theme/steppedPath';

// StatsBack (CARD-01) — the STANDARDIZED stats back of a game card: the auto-stats layout + printed
// provenance ("CARD ARTIST" — designer attribution ONLY, no adoption count, decision 0024). NOT a
// §1.5 catalog component — a client-composed face that reuses the shared F-02 `steppedRectPath` helper
// (the same primitive GameCard/StateMark/ScreenButton draw with) rather than forking GameCard. The
// `.flipy` silhouette (the step on TR+BL, as if the card were turned over) is that helper with those
// corners. Text obeys F-06 (9/11 only) — denser than the mockup's sub-9px back (which the app can't use).
//
// `gameTitle` + `footer` are the COL-12 peek-flip additions (the collection flip back needs the game
// name + a VIEW GAME control that the Game-page dual-face doesn't). BOTH default to the game-page render:
// unset → the header is the single "YOUR STATS" title and there is no footer (a byte-identical tree), so
// `DualFaceHero` is unchanged. One back component, no drift (component-map §9).
export function StatsBack({
  hours,
  percent,
  status,
  since,
  artist,
  gameTitle,
  footer,
  statsTitle = 'YOUR STATS',
  width = 138,
  height = 193,
}: {
  hours: number;
  percent: number | null;
  status: string;
  since: string | null;
  artist: string | null;
  /** COL-12 — the game name on the flip back; the stats-title demotes to an eyebrow above it. */
  gameTitle?: string;
  /** COL-12 — a slot below the provenance (the VIEW GAME keycap). */
  footer?: ReactNode;
  /** The back's heading — "YOUR STATS" for OWN (default), "{NAME}'S STATS" for a friend's read-only back
   *  (W-D1 D-1). Defaults to the OWN value so every existing call renders a byte-identical tree. */
  statsTitle?: string;
  width?: number;
  height?: number;
}) {
  const t = useTheme();
  const styles = useStyles();
  // COMPACT (COL-12) — the flip back carries the extra head + footer, so on a small card (the shelf's fixed
  // 138×193) the default game-page spacing overflows and the flex `rows` shrinks below its content into the
  // provenance block. When a `footer` is present (the collection flip; the game page passes none) tighten
  // the vertical rhythm so the full content fits. Gated on `footer` so the game-page render is untouched.
  const compact = footer != null;
  // PASS-THROUGH (COL-12) — when a `footer` is present (the collection flip back), the WHOLE hit-tree
  // except the footer keycap must decline touches: root box-none · the silhouette Svg none · inner
  // box-none · the stats wrapper none. On NATIVE, hit-testing never falls through to a sibling behind a
  // view that absorbs the touch — marking only the stats wrapper none still left the root View + the
  // absoluteFill Svg as dead-zone targets, so a settled back couldn't be tapped to flip home (owner
  // report, 2026-07-12). With the full chain declining, a stats-area tap reaches the FlipCard's flip
  // layer behind (→ flip back) while VIEW GAME keeps its own tap. The game-page render (no footer) is
  // untouched — everything stays default `auto`.
  const stats = (
    <>
      {gameTitle ? (
        <View style={[styles.head, compact && styles.headCompact]}>
          <Text style={styles.eyebrow}>{statsTitle}</Text>
          <Text style={styles.gameTitle} numberOfLines={1}>
            {gameTitle.toUpperCase()}
          </Text>
        </View>
      ) : (
        <Text style={styles.title}>{statsTitle}</Text>
      )}
      <View style={[styles.rows, compact && styles.rowsCompact]}>
        <Row label="HOURS" value={String(hours)} />
        <Row label="COMPLETE" value={percent == null ? '—' : `${percent}%`} />
        <Row label="STATUS" value={status.toUpperCase()} />
        <Row label="SINCE" value={since ? since.slice(0, 4) : '—'} />
      </View>
      <View style={[styles.prov, compact && styles.provCompact]}>
        <Text style={styles.provLabel}>CARD ARTIST</Text>
        <Text style={styles.provName} numberOfLines={1}>
          {artist ?? 'DEFAULT'}
        </Text>
      </View>
    </>
  );
  return (
    <View
      style={{ width, height }}
      accessibilityLabel="Your stats card back"
      pointerEvents={compact ? 'box-none' : 'auto'}
    >
      {/* The silhouette Svg is WRAPPED in a plain View: react-native-svg's NATIVE view runs a custom
          hitTest that doesn't reliably honor pointerEvents on the Svg itself (the round-2 escape — on
          device the absoluteFill Svg kept absorbing back-taps), but a core RN View with 'none' prunes
          the entire subtree from hit-testing before the Svg is ever consulted. The Svg keeps its own
          'none' for web, where CSS pointer-events is per-element (a child could re-enable). */}
      <View style={StyleSheet.absoluteFill} pointerEvents={compact ? 'none' : 'auto'}>
        <Svg width={width} height={height} pointerEvents={compact ? 'none' : 'auto'}>
          <Path
            d={steppedRectPath(width, height, cardStepUnit(width), { tr: true, bl: true })}
            fill={t.scr.panel}
            stroke={t.scr.hairline}
            strokeWidth={1}
          />
        </Svg>
      </View>
      <View
        style={[styles.inner, compact && styles.innerCompact]}
        pointerEvents={compact ? 'box-none' : 'auto'}
      >
        {footer ? (
          <View style={styles.statsFill} pointerEvents="none">
            {stats}
          </View>
        ) : (
          stats
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
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
  // COL-12 — the pass-through stats wrapper (fills above the footer; `none` so stats taps flip the card back).
  statsFill: { flex: 1 },
  // COL-12 compact — tighter rhythm so head + rows + prov + footer fit the shelf's 138×193 back.
  innerCompact: { padding: t.space.md },
  headCompact: { paddingBottom: t.space.sm },
  rowsCompact: { gap: t.space.sm, paddingVertical: t.space.sm },
  provCompact: { paddingTop: t.space.sm },
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
  // COL-12 — the game-title header (the board's eyebrow + `cb-title`); carries the same divider as `title`.
  head: { paddingBottom: t.space.md, borderBottomWidth: 1, borderBottomColor: t.scr.hairline, gap: 1 },
  eyebrow: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro, // 9
    color: t.scr.dim,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  gameTitle: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.body, // 11 (F-06)
    color: t.scr.ink,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  footer: { marginTop: t.space.sm }, // COL-12 — the VIEW GAME keycap slot (only rendered in the compact flip back)
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
