import { View, Text } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { CompareTotals } from '@ingame/shared';
import { themedStyles, useTheme } from '../../theme';
import { Avatar } from '../Avatar';

// FaceOff (P9 · SOC-03) — CompareHeader + CompareTotals fused into the duel hero (compare board P1). Both
// totals big and side-by-side, a single split-margin bar, the verdict pill (NowTag orange-fill grammar,
// NON-COMMERCE — no gold), then the games sub-face-off. PROF-03 omission (ARCH A2): when hours are hidden
// (`theirHours`/`leader` absent) the hours duel drops out cleanly — HOURS PRIVATE verdict, no split bar,
// the games face-off still settles. When the collection is hidden (`theirGames` absent) the games row omits.
export function FaceOff({
  you,
  friend,
  totals,
}: {
  you: { username: string; avatarUrl: string | null };
  friend: { username: string; avatarUrl: string | null };
  totals: CompareTotals;
}) {
  const styles = useStyles();
  const t = useTheme();
  const hoursHidden = totals.theirHours === undefined;
  const yourLead = totals.leader === 'you';
  const theirLead = totals.leader === 'them';
  // The split-margin bar: your share of the combined hours (guarded vs divide-by-zero → 50/50).
  const combined = totals.yourHours + (totals.theirHours ?? 0);
  const yourPct = combined > 0 ? Math.round((totals.yourHours / combined) * 100) : 50;

  return (
    <View style={styles.faceoff}>
      <View style={styles.top}>
        <View style={styles.side}>
          <Avatar username={you.username} avatarUrl={you.avatarUrl} size={50} />
          <Text style={styles.who}>YOU</Text>
          <Text style={[styles.hrs, yourLead && styles.hrsLead]}>{fmt(totals.yourHours)}</Text>
          <Text style={styles.unit}>HOURS</Text>
        </View>
        <Text style={styles.vs}>VS</Text>
        <View style={styles.side}>
          <Avatar username={friend.username} avatarUrl={friend.avatarUrl} size={50} />
          <Text style={styles.who}>@{friend.username.toUpperCase()}</Text>
          {hoursHidden ? (
            <View style={styles.hidRow}>
              <LockGlyph color={t.scr.faint} />
              <Text style={styles.hid}>HIDDEN</Text>
            </View>
          ) : (
            <Text style={[styles.hrs, theirLead && styles.hrsLead]}>{fmt(totals.theirHours!)}</Text>
          )}
          <Text style={styles.unit}>HOURS</Text>
        </View>
      </View>

      {!hoursHidden ? (
        <View style={styles.bar}>
          <View style={[styles.barYou, { width: `${yourPct}%` }]} />
          <View style={[styles.barThem, { width: `${100 - yourPct}%` }]} />
        </View>
      ) : null}

      <View style={styles.verdictRow}>
        {hoursHidden ? (
          <View style={[styles.badge, styles.badgeMuted]}>
            <LockGlyph color={t.scr.faint} small />
            <Text style={styles.badgeMutedText}>HOURS PRIVATE</Text>
          </View>
        ) : (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{verdict(totals, friend.username)}</Text>
          </View>
        )}
      </View>

      {totals.theirGames !== undefined ? (
        <View style={styles.sub}>
          <View style={styles.g}>
            <Text style={[styles.gv, totals.yourGames >= totals.theirGames && styles.gvLead]}>
              {totals.yourGames}
            </Text>
            <Text style={styles.gl}>YOUR GAMES</Text>
          </View>
          <Text style={styles.gmid}>{gamesGap(totals.yourGames, totals.theirGames, friend.username)}</Text>
          <View style={styles.g}>
            <Text style={[styles.gv, totals.theirGames > totals.yourGames && styles.gvLead]}>
              {totals.theirGames}
            </Text>
            <Text style={styles.gl}>{friend.username.toUpperCase()}&apos;S GAMES</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function verdict(totals: CompareTotals, friendName: string): string {
  if (totals.theirHours === undefined || totals.leader === undefined) return '';
  if (totals.leader === 'tie') return 'DEAD EVEN';
  const delta = Math.abs(totals.yourHours - totals.theirHours);
  return totals.leader === 'you'
    ? `YOU LEAD · +${fmt(delta)} HRS`
    : `${friendName.toUpperCase()} LEADS · +${fmt(delta)} HRS`;
}

function gamesGap(yours: number, theirs: number, friendName: string): string {
  const d = Math.abs(yours - theirs);
  if (d === 0) return 'EVEN';
  return yours > theirs ? `+${d} YOU` : `+${d} ${friendName.toUpperCase()}`;
}

function LockGlyph({ color, small }: { color: string; small?: boolean }) {
  const s = small ? 12 : 14;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Rect x={5} y={11} width={14} height={9} rx={1.5} fill="none" stroke={color} strokeWidth={2} />
      <Path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

const useStyles = themedStyles((t) => ({
  faceoff: {
    backgroundColor: t.scr.panelHi,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    padding: t.space.lg,
    gap: t.space.md,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  side: { flex: 1, alignItems: 'center', gap: t.space.sm },
  who: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },
  hrs: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 0.5 },
  hrsLead: { color: t.scr.accent },
  unit: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },
  hidRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.xs },
  hid: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.faint, letterSpacing: 1 },
  vs: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.accent, alignSelf: 'center', paddingHorizontal: t.space.sm },
  bar: { flexDirection: 'row', height: 9, backgroundColor: t.scr.bg, overflow: 'hidden' },
  barYou: { backgroundColor: t.scr.accent },
  barThem: { backgroundColor: t.scr.faint },
  verdictRow: { alignItems: 'center' },
  badge: { backgroundColor: t.scr.accent, paddingHorizontal: t.space.lg, paddingVertical: t.space.sm },
  badgeText: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.accentInk, letterSpacing: 0.8 },
  badgeMuted: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm, backgroundColor: t.scr.panel },
  badgeMutedText: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.dim, letterSpacing: 0.8 },
  sub: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: t.space.md,
    borderTopWidth: 1,
    borderTopColor: t.scr.hairline,
  },
  g: { flex: 1, alignItems: 'center' },
  gv: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink },
  gvLead: { color: t.scr.accent },
  gl: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1, marginTop: 2 },
  gmid: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 1, paddingHorizontal: t.space.md },
}));
