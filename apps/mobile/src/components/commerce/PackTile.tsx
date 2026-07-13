import { View, Text } from 'react-native';
import type { StorePack } from '@ingame/shared';
import { themedStyles } from '../../theme';
import { ScreenButton } from '../ScreenButton';
import { PixelsMark } from './PixelsMark';
import { usdFor, valueLine } from './packMeta';

// PackTile (component-map §7) — a currency-pack tile. Two forms:
//   • default = the 2×2 Top-Up grid tile (amount · label · value-math · a cream $ keycap, 0069/§7).
//   • `starter` = the once/account STARTER PACK row (full-width, gold-edged; dims when `purchased`).
// The $ keycap is ScreenButton/secondary (cream, NOT gold — 0069/component-map §7: gold is the PX/value
// signal, the dollar is the neutral action). `flash` = a corner ribbon ("BEST RATE" / "COVERS IT").
export function PackTile({
  pack,
  onBuy,
  buying = false,
  flash,
}: {
  pack: StorePack;
  onBuy: () => void;
  buying?: boolean;
  flash?: string;
}) {
  const styles = useStyles();
  const usd = usdFor(pack.productId) ?? '$—';
  const value = valueLine(pack);
  const consumed = pack.oneTime && pack.purchased;

  if (pack.oneTime) {
    return (
      <View style={[styles.starter, consumed && styles.dim]}>
        {flash ? <Ribbon label={flash} /> : null}
        <View style={styles.starterMeta}>
          <Text style={styles.starterName}>STARTER PACK</Text>
          {value ? <Text style={styles.value}>{value}</Text> : null}
        </View>
        <View style={styles.amt}>
          <Text style={styles.amtNum}>{pack.pixels}</Text>
          <PixelsMark size={14} />
        </View>
        {consumed ? (
          <Text style={styles.consumed}>CLAIMED</Text>
        ) : (
          <ScreenButton label={usd} variant="secondary" size="mini" onPress={onBuy} disabled={buying} />
        )}
      </View>
    );
  }

  return (
    <View style={styles.pack}>
      {flash ? <Ribbon label={flash} /> : null}
      <View style={styles.amt}>
        <Text style={styles.amtNum}>{pack.pixels}</Text>
        <PixelsMark size={13} />
      </View>
      <Text style={styles.plbl}>PIXEL PACK</Text>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      <ScreenButton label={usd} variant="secondary" size="mini" onPress={onBuy} disabled={buying} />
    </View>
  );
}

function Ribbon({ label }: { label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.flash}>
      <Text style={styles.flashText}>{label}</Text>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  pack: {
    flex: 1,
    minWidth: '46%',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.md,
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.brand.gold,
  },
  starter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.lg,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
    backgroundColor: t.scr.panel,
    borderWidth: 1.5,
    borderColor: t.brand.gold,
  },
  dim: { opacity: 0.55 },
  starterMeta: { flex: 1, gap: 3 },
  starterName: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.brand.gold, letterSpacing: 1 },
  amt: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amtNum: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.brand.gold, letterSpacing: 1 },
  plbl: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },
  value: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.5, textAlign: 'center' },
  consumed: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  flash: {
    position: 'absolute',
    top: -7,
    right: 7,
    backgroundColor: t.brand.gold,
    paddingHorizontal: 5,
    paddingVertical: 2.5,
    zIndex: 2,
  },
  flashText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.brand.goldInk, letterSpacing: 0.5 },
}));
