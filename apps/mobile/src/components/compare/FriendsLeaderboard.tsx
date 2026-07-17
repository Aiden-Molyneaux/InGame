import { View, Text, Pressable } from 'react-native';
import type { CompareLeaderboardRow } from '@ingame/shared';
import { themedStyles } from '../../theme';
import { Avatar } from '../Avatar';

// FriendsLeaderboard / LeaderRow (P9 · SOC-03) — the ranked friend ladder (compare board P1/P3), your
// row LIT with the orange accent rail (`isMe`); the bar shows each standing against the leader. Friends-
// only. NON-COMMERCE. A row tap opens that friend's profile (`onOpenUser`) — except your own row (self).
export function FriendsLeaderboard({
  rows,
  metric = 'hours',
  onOpenUser,
}: {
  rows: CompareLeaderboardRow[];
  /** Which axis the value column shows (the header tertiary flips it; leaderboard carries both). */
  metric?: 'hours' | 'games';
  onOpenUser: (userId: string) => void;
}) {
  const styles = useStyles();
  const top = rows.reduce((m, r) => Math.max(m, valueOf(r, metric)), 0) || 1;
  return (
    <View style={styles.board}>
      {rows.map((r) => (
        <LeaderRow key={r.user.userId} row={r} metric={metric} top={top} onOpenUser={onOpenUser} />
      ))}
    </View>
  );
}

function LeaderRow({
  row,
  metric,
  top,
  onOpenUser,
}: {
  row: CompareLeaderboardRow;
  metric: 'hours' | 'games';
  top: number;
  onOpenUser: (userId: string) => void;
}) {
  const styles = useStyles();
  const value = valueOf(row, metric);
  const pct = Math.round((value / top) * 100);
  const body = (
    <>
      <Text style={[styles.rank, row.isMe && styles.rankMe]}>{row.rank}</Text>
      <Avatar username={row.user.username} avatarUrl={row.user.avatarUrl} size={30} />
      <View style={styles.meta}>
        <Text style={styles.name} numberOfLines={1}>
          @{row.user.username}
          {row.isMe ? <Text style={styles.you}> YOU</Text> : null}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, row.isMe && styles.fillMe, { width: `${pct}%` }]} />
        </View>
      </View>
      <View style={styles.valWrap}>
        <Text style={[styles.val, row.isMe && styles.valMe]}>{value.toLocaleString('en-US')}</Text>
        <Text style={styles.valUnit}>{metric === 'hours' ? 'HRS' : 'GAMES'}</Text>
      </View>
    </>
  );
  // Your own row isn't a nav target (you're already you); others route to their profile.
  if (row.isMe) {
    return <View style={[styles.row, styles.rowMe]}>{body}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${row.user.username}'s profile`}
      onPress={() => onOpenUser(row.user.userId)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {body}
    </Pressable>
  );
}

function valueOf(r: CompareLeaderboardRow, metric: 'hours' | 'games'): number {
  return metric === 'hours' ? r.hours : r.games;
}

const useStyles = themedStyles((t) => ({
  board: { backgroundColor: t.scr.panelHi, borderWidth: 1, borderColor: t.scr.hairline },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.md,
    borderBottomWidth: 1,
    borderBottomColor: t.scr.hairline,
  },
  rowMe: { backgroundColor: t.scr.panel },
  rowPressed: { opacity: 0.75 },
  rank: { width: 16, textAlign: 'center', fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.faint },
  rankMe: { color: t.scr.accent },
  meta: { flex: 1, gap: t.space.sm },
  name: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.3 },
  you: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 1 },
  track: { height: 4, backgroundColor: t.scr.panel },
  fill: { height: '100%', backgroundColor: t.scr.faint },
  fillMe: { backgroundColor: t.scr.accent },
  valWrap: { alignItems: 'flex-end' },
  val: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink },
  valMe: { color: t.scr.accent },
  valUnit: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 1 },
}));
