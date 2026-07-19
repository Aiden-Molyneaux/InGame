import { useState, type ReactNode } from 'react';
import { View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { theme, themedStyles, useTheme } from '../../theme';
import { steppedRectPath } from '../../theme/steppedPath';

// StateFrame — INTERNAL to the lifecycle kit (not a §1.5 name, NOT exported from index.ts). The shared
// "dashed stepped-card silhouette" that `LoadError` / `Unavailable` / `EmptyState` all wear so the
// family reads as KIN (design-spec §1.6). `Skeleton` deliberately does NOT use it: loading uses SOLID
// fills, never dashes, so it never reads as an invitation (§1.6). Draws the F-02 TL+BR stepped rect as
// a dashed stroked SVG Path (RN has no dashed clip-path), sized from onLayout like the ScreenButton
// `add` polygon. State-title = emphasis 15 (F-06 conformance, decision 0024 / OQ-066). Square + flat
// (F-07/F-09).
const STEP_UNIT = theme.step / 2;
// N-B7 — the dashed stroke is CENTERED on its path: drawn at the exact layout bounds, half of it
// falls outside the Svg canvas and clips (on fractional layout heights the whole BOTTOM run vanished
// — the CARDS-tab empty box). Inset the silhouette one stroke-width so every dash renders fully.
const FRAME_STROKE = 1.5;

export function StateFrame({
  glyph,
  title,
  body,
  action,
  titleTone = 'ink',
  frameTone = 'kin',
  accessibilityLabel,
}: {
  /** The intent glyph (accent ! · grey person · inviting doorway) rendered above the title. */
  glyph: ReactNode;
  /** The state-title — rendered at emphasis 15 (F-06), uppercased. */
  title: string;
  /** Optional plain-words body line (11). */
  body?: string;
  /** Optional action row (a ScreenButton — RETRY / GO BACK / UNBLOCK / the empty doorway CTA). */
  action?: ReactNode;
  /** `dim` softens the title for the terminal/calm states; `ink` (default) for the retryable one. */
  titleTone?: 'ink' | 'dim';
  /** `invite` warms the dashed silhouette to accent (the EmptyState doorway); `kin` (default) = hairline. */
  frameTone?: 'kin' | 'invite';
  /** SR name for the whole state (defaults to title + body). */
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  const styles = useStyles();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((p) => (p?.w === width && p?.h === height ? p : { w: width, h: height }));
  };
  const stroke = frameTone === 'invite' ? t.scr.accent : t.scr.hairline;
  return (
    <View
      style={styles.frame}
      onLayout={onLayout}
      accessible
      accessibilityLabel={accessibilityLabel ?? [title, body].filter(Boolean).join('. ')}
    >
      {size ? (
        <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Path
            d={steppedRectPath(size.w - FRAME_STROKE * 2, size.h - FRAME_STROKE * 2, STEP_UNIT)}
            transform={`translate(${FRAME_STROKE}, ${FRAME_STROKE})`}
            fill="none"
            stroke={stroke}
            strokeWidth={FRAME_STROKE}
            strokeDasharray="5 5"
          />
        </Svg>
      ) : null}
      <View style={styles.glyph} importantForAccessibility="no-hide-descendants">
        {glyph}
      </View>
      <Text style={[styles.title, titleTone === 'dim' && { color: t.scr.dim }]}>{title.toUpperCase()}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    gap: t.space.lg,
    paddingVertical: t.space.xxl,
    paddingHorizontal: t.space.xl,
  },
  glyph: { alignItems: 'center', justifyContent: 'center', marginBottom: t.space.xs },
  title: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.title, // 15 (F-06 state-title, decision 0024 / OQ-066)
    color: t.scr.ink,
    letterSpacing: 1,
    textAlign: 'center',
  },
  body: {
    fontFamily: t.font.screen,
    fontSize: t.type.body, // 11
    color: t.scr.dim,
    letterSpacing: 0.5,
    textAlign: 'center',
    maxWidth: 260,
  },
  action: { marginTop: t.space.md, alignSelf: 'stretch', alignItems: 'center' },
}));
