import { Pressable, View, Text } from 'react-native';
import { themedStyles, theme } from '../../theme';
import { PixelsMark } from './PixelsMark';

// CurrencyCounter (component-map §7) — the persistent header PX counter (a gold keycap; F-02 economy).
// Reads the live wallet balance; tapping it opens the Wallet (the counter is a door). Two states:
//   • `negative` (balance < 0, ECON-09) → alert-red fill (a refund reversal drove it under).
//   • the `counterTick` beat (motion.counterTick): after a grant/claim the parent passes `tick={+N}`;
//     the counter glows + a `+N` chip rides beside it. Presentational — the parent owns the tick's
//     lifecycle (set on grant, clear after the dwell), so this stays pure + easily tested.
export function CurrencyCounter({
  balance,
  onPress,
  tick = null,
}: {
  balance: number;
  onPress?: () => void;
  /** the just-granted amount to flash beside the counter (motion.counterTick); null = quiet. */
  tick?: number | null;
}) {
  const styles = useStyles();
  const negative = balance < 0;
  const ticking = tick != null && tick > 0;
  return (
    <View style={styles.wrap}>
      {ticking ? (
        <View style={styles.tickChip}>
          <Text style={styles.tickText}>+{tick}</Text>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${balance} pixels — open wallet`}
        onPress={onPress}
        style={[styles.counter, negative && styles.counterNeg, ticking && styles.glow]}
      >
        <PixelsMark size={14} />
        <Text style={[styles.count, negative && styles.countNeg]}>{balance}</Text>
      </Pressable>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  wrap: { flexDirection: 'row', alignItems: 'center' },
  tickChip: {
    marginRight: 6,
    borderWidth: 1,
    borderColor: t.brand.gold,
    paddingHorizontal: 5,
    paddingVertical: 3,
    backgroundColor: 'rgba(255,210,63,0.14)',
  },
  tickText: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro,
    color: t.brand.gold,
    letterSpacing: 0.5,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: t.brand.gold,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  counterNeg: { backgroundColor: t.brand.alert },
  glow: {
    // motion.counterTick — a soft gold halo while the tick shows (no travel, F-03 posture).
    shadowColor: theme.brand.gold,
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  count: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.body, // 11 (F-06)
    color: t.brand.goldInk,
    letterSpacing: 0.5,
  },
  countNeg: { color: '#fff' },
}));
