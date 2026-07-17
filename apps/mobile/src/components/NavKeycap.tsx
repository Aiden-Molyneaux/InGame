import { Platform, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { theme, themedStyles, useTheme } from '../theme';
import { PipLight } from './PipLight';

// NavKeycap (component-map §5.1) — a SHELL keycap (3D — F-03: a hard drop edge that travels when
// pressed): a 54×54 (r15) cream cap carrying its GLYPH (mockup `.nav-btn` svg, navy ink), the
// Paytone label OUTSIDE the cap (the mockup alternates above/below per key), and the always-present
// 7px pip under the key (PipLight — lit pink when `active`, F-05). `accent` tints the identity keys
// (Collection pink, Store gold). F-04: nav legibility beats customization.

const INK = theme.brand.navy; // the glyph ink on every cap tint (mockup `.nav-btn` svg stroke)

function Glyph({ name }: { name: string }) {
  switch (name) {
    case 'store':
      return (
        <Svg width={24} height={24} viewBox="0 0 24 24">
          <Path d="M7 9V7.5a5 5 0 0 1 10 0V9" fill="none" stroke={INK} strokeWidth={2} />
          <Path
            d="M5 9h14l-1.2 10.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 9z"
            fill="none"
            stroke={INK}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'discover':
      return (
        <Svg width={24} height={24} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={9} fill="none" stroke={INK} strokeWidth={2} />
          <Path d="M15.5 8.5l-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2z" fill={INK} />
        </Svg>
      );
    case 'collection':
      return (
        <Svg width={24} height={24} viewBox="0 0 24 24">
          <Rect x={3.5} y={3.5} width={7.4} height={7.4} rx={1.8} fill={INK} />
          <Rect x={13.1} y={3.5} width={7.4} height={7.4} rx={1.8} fill={INK} />
          <Rect x={3.5} y={13.1} width={7.4} height={7.4} rx={1.8} fill={INK} />
          <Rect x={13.1} y={13.1} width={7.4} height={7.4} rx={1.8} fill={INK} />
        </Svg>
      );
    case 'profile':
      return (
        <Svg width={24} height={24} viewBox="0 0 24 24">
          <Path d="M12 2.5v3" stroke={INK} strokeWidth={2} strokeLinecap="round" />
          <Circle cx={12} cy={2.8} r={1.3} fill={INK} />
          <Rect x={4.5} y={5.5} width={15} height={12} rx={3.5} fill="none" stroke={INK} strokeWidth={2} />
          <Circle cx={9} cy={11.5} r={1.6} fill={INK} />
          <Circle cx={15} cy={11.5} r={1.6} fill={INK} />
          <Path d="M9 21h6" stroke={INK} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      );
    case 'friends':
      return (
        <Svg width={26} height={24} viewBox="0 0 26 24">
          <Circle cx={9} cy={8} r={3.4} fill="none" stroke={INK} strokeWidth={2} />
          <Path d="M3 19.5a6 6 0 0 1 12 0" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
          <Circle cx={18.5} cy={9} r={2.8} fill="none" stroke={INK} strokeWidth={2} />
          <Path d="M16.5 19.5a5.4 5.4 0 0 1 6.5-5.2" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      );
    default:
      return null;
  }
}

export function NavKeycap({
  label,
  glyph,
  labelPosition = 'below',
  active = false,
  disabled = false,
  accent = 'default',
  showLabels = true,
  onPress,
}: {
  label: string;
  /** which glyph the cap carries — the tab key (store · discover · collection · profile · friends). */
  glyph: string;
  /** the mockup alternates the outside label above/below per key. */
  labelPosition?: 'above' | 'below';
  active?: boolean;
  disabled?: boolean;
  accent?: 'default' | 'collection' | 'store';
  /** TEMP: when false, the outside label + its reserved slot collapse (screen-real-estate experiment). */
  showLabels?: boolean;
  onPress?: () => void;
}) {
  const t = useTheme();
  const styles = useStyles();
  const keyTint =
    accent === 'store' ? t.brand.gold : accent === 'collection' ? t.brand.accent : t.shell.cap;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.item}
    >
      {({ pressed }) => (
        <>
          {showLabels ? (
            <View style={styles.lblSlot}>
              {labelPosition === 'above' ? (
                <Text style={[styles.lbl, styles.lblAbove]} numberOfLines={1}>
                  {label}
                </Text>
              ) : null}
            </View>
          ) : null}
          <View
            style={[
              styles.key,
              { backgroundColor: keyTint },
              (pressed || active) && styles.keyPressed, // travel (F-03)
            ]}
          >
            <Glyph name={glyph} />
          </View>
          <View style={styles.pipRow}>
            <PipLight size={7} on={active} />
          </View>
          {showLabels ? (
            <View style={styles.lblSlot}>
              {labelPosition === 'below' ? (
                <Text style={styles.lbl} numberOfLines={1}>
                  {label}
                </Text>
              ) : null}
            </View>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const useStyles = themedStyles((t) => ({
  item: { flex: 1, alignItems: 'center' },
  lblSlot: { height: 16, justifyContent: 'center' }, // mockup `.nav-lbl` slot — reserved even when empty
  lbl: {
    fontFamily: t.font.shell, // Paytone One on the plastic (F-08)
    fontSize: t.type.body, // 11 (mockup `.nav-lbl`)
    letterSpacing: 0.5,
    color: t.shell.lo, // mockup `--silk` label ink on the teal
    width: 84, // wider than the key column so COLLECTION doesn't ellipsize (mockup labels overflow too)
    textAlign: 'center',
  },
  lblAbove: { transform: [{ translateY: -13 }] }, // S1-d + R2: DISCOVER/PROFILE above-labels higher (board −8 → −11 → −13 R2)
  key: {
    width: 54,
    height: 54, // mockup `.nav-btn` 54×54
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.corner.navKey, // 15
    // The hard drop edge (F-03, mockup `box-shadow: 0 4px 0 ink`) — REAL RN shadow props on
    // native (S1-c: a borderBottom reads flat — it thickens the edge inside the radius instead of
    // dropping below the cap): hard offset shadow on iOS, elevation approximating on Android.
    // Web keeps the mockup's literal boxShadow (RN-web deprecated shadow* props).
    ...Platform.select({
      web: { boxShadow: `0 4px 0 color-mix(in srgb, ${t.shell.ink} 55%, transparent)` },
      default: {
        shadowColor: t.shell.ink,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.55, // R2 (0a) — lighter drop edge (mockup `.nav-btn` ink @ 55%), was 1
        shadowRadius: 0,
        elevation: 5,
      },
    }),
  },
  keyPressed: {
    // travels: the cap sinks 3px and the drop edge collapses to 1px (F-03)
    ...Platform.select({
      web: { boxShadow: `0 1px 0 color-mix(in srgb, ${t.shell.ink} 55%, transparent)` },
      default: { shadowOffset: { width: 0, height: 1 }, elevation: 1 }, // shadowOpacity 0.55 inherited from `key`
    }),
    transform: [{ translateY: 3 }],
  },
  pipRow: { height: 13, justifyContent: 'flex-end' }, // 6px gap + the 7px pip (mockup `.pip`)
}));
