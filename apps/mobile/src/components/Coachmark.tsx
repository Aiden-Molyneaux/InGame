import { View, Text, Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { themedStyles, useTheme } from '../theme';

// Coachmark (CARD-16) — a one-time, dismissible hint strip. The approachability affordance the spec
// asks for wherever a non-obvious interaction ships without a persistent on-face indicator (COL-12's
// peek-flip is the first caller: "no on-face indicator" is an owner directive, so discoverability is
// carried here). Panel-toned, F-06 type (9/11), square on-screen chrome (F-07). The host owns the
// "seen" gate (a persisted flag) — this component is pure presentation + a dismiss action.
export function Coachmark({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <View style={styles.glyph}>
        <Svg width={14} height={14} viewBox="0 0 14 14">
          {/* a ↺ flip cue — an arced arrow, echoing "turn the card over" */}
          <Path
            d="M11 7a4 4 0 1 1-1.2-2.9"
            fill="none"
            stroke={t.scr.accent}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
          <Path d="M11 2v3H8" fill="none" stroke={t.scr.accent} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
      <Text style={styles.text}>{text}</Text>
      <Pressable
        onPress={onDismiss}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Dismiss hint"
        style={styles.dismiss}
      >
        <Text style={styles.dismissText}>GOT IT</Text>
      </Pressable>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
    backgroundColor: t.scr.panelHi,
    borderWidth: 1,
    borderColor: t.scr.hairline,
  },
  glyph: { width: 16, alignItems: 'center', justifyContent: 'center' },
  text: {
    flex: 1,
    fontFamily: t.font.screen,
    fontSize: t.type.body, // 11
    color: t.scr.dim,
    letterSpacing: 0.5,
  },
  dismiss: { paddingHorizontal: t.space.sm },
  dismissText: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro, // 9
    color: t.scr.accent,
    letterSpacing: 1,
  },
}));
