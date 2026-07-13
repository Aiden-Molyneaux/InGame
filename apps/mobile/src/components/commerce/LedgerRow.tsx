import { View, Text } from 'react-native';
import type { LedgerEntry } from '@ingame/shared';
import { themedStyles } from '../../theme';
import { PixelsMark } from './PixelsMark';
import { ledgerLabel, ledgerSign, ledgerTone, ledgerWhen } from './storeCopy';

// LedgerRow (component-map §7) — one wallet transaction (ECON-07): a signed badge · what · when · the PX
// amount. Tones: earn (green +) · spend (soft −) · reversal (alert-red ⊘, refund_reversal). The operator
// `admin_adjustment` renders as a plain earn/spend row (reason never serialized — ECON-11). The amount
// shows the absolute delta beside the mark; the sign lives in the badge + the tone colour.
export function LedgerRow({ entry, last = false }: { entry: LedgerEntry; last?: boolean }) {
  const styles = useStyles();
  const tone = ledgerTone(entry);
  const toneStyle = tone === 'earn' ? styles.earn : tone === 'reversal' ? styles.rev : styles.spend;
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <View style={styles.sig}>
        <Text style={[styles.sigText, toneStyle]}>{ledgerSign(entry)}</Text>
      </View>
      <View style={styles.mid}>
        <Text style={[styles.what, tone === 'reversal' && styles.rev]} numberOfLines={1}>
          {ledgerLabel(entry)}
        </Text>
        <Text style={styles.when}>{ledgerWhen(entry.createdAt)}</Text>
      </View>
      <View style={styles.amt}>
        <Text style={[styles.amtText, toneStyle]}>
          {entry.delta >= 0 ? '+' : '−'}
          {Math.abs(entry.delta)}
        </Text>
        <PixelsMark size={10} />
      </View>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
    borderBottomWidth: 1,
    borderBottomColor: t.scr.hairline,
  },
  rowLast: { borderBottomWidth: 0 },
  sig: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.scr.panel,
  },
  sigText: { fontFamily: t.font.screenBold, fontSize: t.type.body },
  mid: { flex: 1, gap: 1 },
  what: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.5 },
  when: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  amt: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  amtText: { fontFamily: t.font.screenBold, fontSize: t.type.body },
  earn: { color: t.brand.success },
  spend: { color: t.scr.dim },
  rev: { color: t.brand.alert },
}));
