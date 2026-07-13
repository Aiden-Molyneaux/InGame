import { View, Text } from 'react-native';
import { themedStyles } from '../../theme';
import { ScreenButton } from '../ScreenButton';
import { PixelsMark } from './PixelsMark';

// DailyBonusBar (component-map §7) — the Store's daily ritual (OQ-043/ECON-02; the Newcomer Ladder,
// decision 0074): one CLAIM button throughout, but the reward escalates while the user is new. Reads
// `/me/wallet.dailyBonus`. When `ladderStep`/`ladderReward` are present the user is ON the ladder (the
// escalation is drawn); once they're absent the bar renders EXACTLY the standing +1/day view (zero
// visual change for veterans — the signed P6 board states must be reproducible). States:
//   • ladder, available   → "DAY N OF 7 · CLAIM +X PX" (+ a free-item tease when a slot is filled).
//   • ladder, claimed      → quiet, teasing tomorrow's step ("DAY N OF 7 TOMORROW · +Y PX").
//   • standing, available  → "DAILY BONUS READY — +1 PX" + a gold CLAIM keycap (F-02 economy).
//   • standing, claimed    → "✓ CLAIMED — BACK TOMORROW".
// Presentational — the parent owns the POST + the header counter tick (motion.counterTick).
export function DailyBonusBar({
  available,
  amount,
  ladderStep,
  ladderReward,
  onClaim,
  claiming = false,
}: {
  available: boolean;
  amount: number;
  ladderStep?: number;
  ladderReward?: { pixels: number; cosmeticId?: string };
  onClaim: () => void;
  claiming?: boolean;
}) {
  const styles = useStyles();
  const onLadder = ladderStep !== undefined && ladderReward !== undefined;
  const rewardPx = onLadder ? ladderReward.pixels : amount;
  const cosmeticTease = onLadder && ladderReward.cosmeticId !== undefined;

  if (!available) {
    // In the ladder phase the API already advanced the tease to the NEXT step — surface it as tomorrow's.
    const sub = onLadder
      ? `Day ${ladderStep} of 7 tomorrow · +${rewardPx} PX${cosmeticTease ? ' + a free item' : ''}`
      : `+${amount} PX landed in your wallet ledger`;
    return (
      <View style={[styles.bar, styles.barClaimed]} accessibilityRole="text">
        <PixelsMark size={16} />
        <View style={styles.text}>
          <Text style={styles.titleQuiet}>✓ CLAIMED — BACK TOMORROW</Text>
          <Text style={styles.sub}>{sub}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.bar}>
      <PixelsMark size={16} />
      <View style={styles.text}>
        <Text style={styles.title}>
          {onLadder
            ? `DAY ${ladderStep} OF 7 · CLAIM +${rewardPx} PX`
            : `DAILY BONUS READY — +${rewardPx} PX`}
        </Text>
        {cosmeticTease ? <Text style={styles.sub}>+ a free newcomer item</Text> : null}
      </View>
      <ScreenButton
        label={`Claim +${rewardPx}`}
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
