import { View, Text } from 'react-native';
import { themedStyles } from '../../theme';
import { ScreenButton } from '../ScreenButton';
import { TertiaryLink } from '../TertiaryLink';
import { PixelsMark } from './PixelsMark';

// LandedMoment (component-map §7 infra · board P7) — the pack-purchase success beat: one clean centered
// moment (OQ-040 — the big rituals stay with cards; this is deliberately quiet). Centered +N at display
// scale · the from→to arithmetic · one gold rule · then BACK TO «intent» + VIEW WALLET. The header
// CurrencyCounter does the glow/tick (motion.counterTick) — this beat carries the arithmetic.
export function LandedMoment({
  granted,
  from,
  to,
  backLabel = 'Back to store',
  onBack,
  onViewWallet,
}: {
  granted: number;
  from: number;
  to: number;
  backLabel?: string;
  onBack: () => void;
  onViewWallet: () => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.wrap} accessibilityLabel={`Pack landed. Plus ${granted} pixels. ${from} to ${to}.`}>
      <Text style={styles.eyebrow}>PACK LANDED · RECEIPT VERIFIED</Text>
      <View style={styles.big}>
        <Text style={styles.bigNum}>+{granted}</Text>
        <PixelsMark size={22} />
      </View>
      <Text style={styles.fromTo}>
        {from} ➔ <Text style={styles.fromToBold}>{to}</Text>
      </Text>
      <View style={styles.rule} />
      <Text style={styles.hint}>Logged in your wallet ledger.</Text>
      <View style={styles.actions}>
        <ScreenButton label={backLabel} variant="secondary" size="mini" onPress={onBack} />
        <TertiaryLink label="View wallet" onPress={onViewWallet} />
      </View>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  wrap: { alignItems: 'center', gap: t.space.md, paddingTop: t.space.xxl, paddingHorizontal: t.space.lg },
  eyebrow: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.brand.gold, letterSpacing: 2 },
  big: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  bigNum: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.brand.gold, letterSpacing: 1 },
  fromTo: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.dim, letterSpacing: 2 },
  fromToBold: { color: t.brand.gold },
  rule: {
    alignSelf: 'stretch',
    height: 2,
    marginHorizontal: t.space.xxl,
    marginTop: t.space.md,
    backgroundColor: t.brand.gold,
    opacity: 0.6,
  },
  hint: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5, marginTop: t.space.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: t.space.lg, marginTop: t.space.md },
}));
