import { View, Text } from 'react-native';
import { themedStyles } from '../../theme';
import { ScreenButton } from '../ScreenButton';
import { PixelsMark } from './PixelsMark';

// DailyBonusBar (component-map §7) — the Store's daily ritual (OQ-043/ECON-02): +N PX claimed on the
// Store screen. Reads `/me/wallet.dailyBonus`. Two states:
//   • available → "DAILY BONUS READY — +N PX" + a gold CLAIM keycap (F-02 economy).
//   • claimed (available:false) → the bar goes quiet ("✓ CLAIMED — BACK TOMORROW"); the header counter
//     did the celebrating (motion.counterTick). Presentational — the parent owns the POST + the tick.
export function DailyBonusBar({
  available,
  amount,
  onClaim,
  claiming = false,
}: {
  available: boolean;
  amount: number;
  onClaim: () => void;
  claiming?: boolean;
}) {
  const styles = useStyles();
  if (!available) {
    return (
      <View style={[styles.bar, styles.barClaimed]} accessibilityRole="text">
        <PixelsMark size={16} />
        <View style={styles.text}>
          <Text style={styles.titleQuiet}>✓ CLAIMED — BACK TOMORROW</Text>
          <Text style={styles.sub}>+{amount} PX landed in your wallet ledger</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.bar}>
      <PixelsMark size={16} />
      <View style={styles.text}>
        <Text style={styles.title}>DAILY BONUS READY — +{amount} PX</Text>
      </View>
      <ScreenButton
        label={`Claim +${amount}`}
        variant="add"
        size="mini"
        onPress={onClaim}
        disabled={claiming}
      />
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
    backgroundColor: 'rgba(255,210,63,0.09)',
    borderWidth: 1,
    borderColor: t.brand.gold,
  },
  barClaimed: {
    backgroundColor: t.scr.panel,
    borderColor: t.scr.hairline,
  },
  text: { flex: 1, gap: 2 },
  title: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro,
    color: t.brand.gold,
    letterSpacing: 1,
  },
  titleQuiet: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro,
    color: t.scr.dim,
    letterSpacing: 1,
  },
  sub: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.micro,
    color: t.scr.faint,
    letterSpacing: 0.5,
  },
}));
