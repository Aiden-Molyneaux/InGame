import { Pressable, View, Text } from 'react-native';
import { themedStyles, theme } from '../../theme';
import { HEADER_CONTENT_HEIGHT } from '../ScreenHead';
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
  // F-1 height harmony — the keycap must FILL the header band so it reads the same height as the
  // ScreenHead CountTag sibling (ScreenHead `right` stretches its children to HEADER_CONTENT_HEIGHT).
  // `alignItems:'stretch'` lets the counter keycap fill this wrap's cross-size (= the band when docked
  // in a stretched header; = natural height otherwise — context-adaptive, no magic number). Before this,
  // `alignItems:'center'` centred the keycap at its ~24px natural height inside the 26px band, so the
  // Pixel keycap sat ~2px shorter than the Games CountTag (owner walk regression, breaking commit c8f4fe1).
  wrap: { flexDirection: 'row', alignItems: 'stretch' },
  tickChip: {
    // alignSelf:'center' opts the +N flash OUT of the wrap's stretch so it stays compact (only the
    // keycap fills the band); without it the chip would grow to the full band height.
    alignSelf: 'center',
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
    // F-1 height harmony — self-declared fill: the keycap stretches to its band so it reads the SAME
    // height as the ScreenHead CountTag sibling (both keycaps carry `alignSelf:'stretch'` — one shared
    // fill mechanism, no per-side magic number to drift). Robust even if the wrap's alignItems changes.
    alignSelf: 'stretch',
    // walk-4 P3-d — ONE SIZE ON EVERY PAGE. `alignSelf:'stretch'` only resolves to the header band
    // where a host STRETCHES it: Collection/Profile dock the counter in ScreenHead's stretched
    // trailing cluster (26px), while Store/Device/Styler drop it into a plain centred head row, where
    // it fell back to its ~24px natural height — the two-pixel drift the owner walked. The floor is
    // the counter's OWN business, so it travels with the component instead of being re-declared at
    // each call-site: minHeight (not height) so the Collection stretch still governs and the
    // count-chip sibling's equal-band invariant is untouched (ScreenHead.test.tsx pins it).
    minHeight: HEADER_CONTENT_HEIGHT,
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
