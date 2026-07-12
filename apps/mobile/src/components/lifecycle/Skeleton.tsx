import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { themedStyles } from '../../theme';
import { useReducedMotion } from '../../a11y/useReducedMotion';

// Skeleton (component-map §5.6 · design-spec §1.6) — the LOADING placeholder. SOLID fills (never the
// dashed silhouette — loading must not read as an invitation, §1.6). A subtle opacity pulse breathes
// while data lands. CARD-16 / decision 0044 §104: the pulse honours OS reduce-motion via the shared
// `a11y/useReducedMotion` hook (the house pattern for plain-RN `Animated` sites — the Skia motion layer
// keeps reanimated's own hook; this is not Skia). Under reduce-motion the blocks sit at a static tone,
// no animation. The whole block group is ONE screen-reader element that reads "Loading" — the decorative
// bars are hidden from the SR (busy state on the container).
export type SkeletonVariant = 'text-lines' | 'tile-row' | 'card-cell';

export function Skeleton({
  variant = 'text-lines',
  count = 3,
  lines = 3,
  accessibilityLabel = 'Loading',
}: {
  variant?: SkeletonVariant;
  /** `tile-row` / `card-cell` repeat count. */
  count?: number;
  /** `text-lines` bar count. */
  lines?: number;
  accessibilityLabel?: string;
}) {
  const styles = useStyles();
  const reduce = useReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduce) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 720, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 720, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, pulse]);

  // Static mid-tone under reduce-motion; a live breathe otherwise (opacity only → native driver safe).
  const opacity = reduce ? 0.55 : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.85] });

  const Block = ({ style }: { style: object }) => <Animated.View style={[style, { opacity }]} />;

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
    >
      {variant === 'text-lines'
        ? Array.from({ length: lines }).map((_, i) => (
            <Block key={i} style={[styles.line, i === lines - 1 && styles.lineShort]} />
          ))
        : null}

      {variant === 'tile-row' ? (
        <View style={styles.row}>
          {Array.from({ length: count }).map((_, i) => (
            <Block key={i} style={styles.tile} />
          ))}
        </View>
      ) : null}

      {variant === 'card-cell' ? (
        <View style={styles.row}>
          {Array.from({ length: count }).map((_, i) => (
            <View key={i} style={styles.cellCol}>
              <Block style={styles.cell} />
              <Block style={styles.cellLabel} />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  wrap: { alignSelf: 'stretch', gap: t.space.md },
  row: { flexDirection: 'row', gap: t.space.md },
  // solid fills (§1.6) — one step off the panel so they read as placeholder, not chrome
  line: { height: 11, backgroundColor: t.scr.panelHi, alignSelf: 'stretch' },
  lineShort: { width: '55%' },
  tile: { width: 72, height: 72, backgroundColor: t.scr.panelHi },
  cellCol: { gap: t.space.sm, alignItems: 'center' },
  cell: { width: 96, height: 134, backgroundColor: t.scr.panelHi }, // GameCard/cell silhouette
  cellLabel: { width: 72, height: 9, backgroundColor: t.scr.panelHi },
}));
