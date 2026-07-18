import { View, Text, Pressable } from 'react-native';
import type { CompareGame } from '@ingame/shared';
import { themedStyles } from '../../theme';
import { EntryCard } from '../EntryCard';
import { StateMark } from '../StateMark';

// ComparePair / CompareRow (P9 · SOC-03) — one shared-game card-vs-card matchup (compare board P1): their
// card left, the two hour counts centered with the WINNER in orange + the gap called out, your card right.
// EntryCard for BOTH faces (F-20 — flattened cross-user images, never composition). NON-COMMERCE (no gold).
// A card tap opens the Game page: your card → your game (`onOpenYours`); their card → the friend-view
// entry detail (`onOpenTheirs`) — the SOC-11 target (compare board hint). PROF-03: `theirHours` absent
// (hours hidden) reads as a tie/hidden — but the whole matchups section is a lock-well then, so this row
// renders only when hours are visible.
export function ComparePair({
  game,
  onOpenYours,
  onOpenTheirs,
}: {
  game: CompareGame;
  onOpenYours: (gameId: string) => void;
  onOpenTheirs: (gameId: string) => void;
}) {
  const styles = useStyles();
  const youWin = game.leader === 'you';
  const theyWin = game.leader === 'them';
  const theirHours = game.theirHours;
  const gap = theirHours !== undefined ? Math.abs(game.yourHours - theirHours) : 0;

  return (
    <View style={styles.row}>
      <Pressable
        style={styles.vside}
        accessibilityRole="button"
        accessibilityLabel={`Open ${game.title} — their card`}
        onPress={() => onOpenTheirs(game.gameId)}
      >
        <EntryCard title={game.title} card={{ imageUrl: game.theirCard.imageUrl, thumbUrl: game.theirCard.thumbUrl }} size="cell" />
        <Text style={styles.owner}>THEM</Text>
      </Pressable>

      <View style={styles.mid}>
        <Text style={styles.title} numberOfLines={1}>
          {game.title}
        </Text>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={[styles.vh, theyWin && styles.vhWin]}>{fmt(theirHours)}</Text>
            <Text style={[styles.vl, theyWin && styles.vlWin]}>HRS</Text>
          </View>
          <Text style={styles.sep}>·</Text>
          <View style={styles.stat}>
            <Text style={[styles.vh, youWin && styles.vhWin]}>{fmt(game.yourHours)}</Text>
            <Text style={[styles.vl, youWin && styles.vlWin]}>HRS</Text>
          </View>
        </View>
        {game.leader !== 'tie' && theirHours !== undefined ? (
          <View style={styles.lead}>
            <StateMark size={8} />
            <Text style={styles.leadText}>{youWin ? `YOU +${gap}` : `THEM +${gap}`}</Text>
          </View>
        ) : (
          <Text style={styles.tie}>EVEN</Text>
        )}
      </View>

      <Pressable
        style={styles.vside}
        accessibilityRole="button"
        accessibilityLabel={`Open ${game.title} — your card`}
        onPress={() => onOpenYours(game.gameId)}
      >
        <EntryCard title={game.title} card={{ imageUrl: game.yourCard.imageUrl, thumbUrl: game.yourCard.thumbUrl }} size="cell" />
        <Text style={styles.owner}>YOU</Text>
      </Pressable>
    </View>
  );
}

function fmt(n: number | undefined): string {
  return n === undefined ? '—' : n.toLocaleString('en-US');
}

const useStyles = themedStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    paddingVertical: t.space.lg,
    borderBottomWidth: 1,
    borderBottomColor: t.scr.hairline,
  },
  vside: { alignItems: 'center', gap: t.space.xs },
  owner: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  mid: { flex: 1, alignItems: 'center', gap: t.space.sm },
  title: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.3, textAlign: 'center' },
  stats: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: t.space.md },
  stat: { alignItems: 'center', gap: 2 },
  vh: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink },
  vhWin: { color: t.scr.accent },
  vl: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  vlWin: { color: t.scr.accent },
  sep: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.faint, paddingTop: 4 },
  lead: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  leadText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 0.5 },
  tie: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 1 },
}));
