import { View, Text, Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { FeedItem, FeedItemType } from '@ingame/shared';
import { themedStyles, useTheme } from '../../theme';
import { Avatar } from '../Avatar';
import { EntryCard } from '../EntryCard';
import { timeAgo } from './timeAgo';

// FeedRow (P8 · SOC-06 · friends-states P1/P2) — one AGGREGATED activity item: avatar + the actor+type
// predicate line + a capped object peek (≤3) + "+N more" + relative time. The five types read as the
// board's grammar ("Riko added 12 games", "Vanta beat Hollow Knight", …). Every card face is an
// EntryCard (F-20 — never a hand-rolled imageUrl); the thumb size drops the plate (decision 0047 — the
// FEED LINE names the game). Actor tap → their profile; a peeked card tap → that game's Game page
// (CARD-23 NAVIGATE). unlocked_achievement renders a gold glyph tile from the payload label (empty
// until P6 emits the event — render-capable now).

// The bold actor + a bold object noun, woven into the predicate. `count` renders the aggregate.
function predicate(type: FeedItemType, count: number, firstTitle: string | undefined) {
  switch (type) {
    case 'added_games':
      return { verb: count === 1 ? 'added' : 'added', obj: `${count} ${count === 1 ? 'game' : 'games'}`, tail: 'to their collection' };
    case 'beat_game':
      return { verb: 'beat', obj: firstTitle ?? 'a game', tail: '' };
    case 'completed_game':
      return { verb: 'completed', obj: firstTitle ?? 'a game', tail: '' };
    case 'published_card':
      return { verb: 'published a card for', obj: firstTitle ?? 'a game', tail: '' };
    case 'unlocked_achievement':
      return { verb: 'unlocked', obj: firstTitle ?? 'an achievement', tail: '' };
  }
}

export function FeedRow({
  item,
  onActorPress,
  onObjectPress,
  onAchievementPress,
}: {
  item: FeedItem;
  onActorPress: (userId: string) => void;
  onObjectPress: (gameId: string) => void;
  /** walk-4 — an unlocked_achievement peek tap → the AchievementSheet (the screen owns the sheet). */
  onAchievementPress?: (achievementId: string | undefined) => void;
}) {
  const t = useTheme();
  const styles = useStyles();
  const isAchv = item.type === 'unlocked_achievement';
  // The achievement label rides objects[0].label; the game rows lead with objects[0].title.
  const firstLabel = item.objects[0]?.label ?? item.objects[0]?.title;
  const p = predicate(item.type, item.aggregateCount, firstLabel);
  const extra = item.aggregateCount - item.objects.length;

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.actor.username} profile`}
        onPress={() => onActorPress(item.actor.userId)}
        hitSlop={6}
      >
        <Avatar username={item.actor.username} avatarUrl={item.actor.avatarUrl} size={38} />
      </Pressable>

      <View style={styles.body}>
        <Text style={styles.line}>
          <Text style={styles.actor} onPress={() => onActorPress(item.actor.userId)}>
            {item.actor.username}
          </Text>
          <Text> {p.verb} </Text>
          <Text style={styles.strong}>{p.obj}</Text>
          {p.tail ? <Text> {p.tail}</Text> : null}
        </Text>

        {isAchv ? (
          <View style={styles.peek}>
            {/* walk-4 — the achievement tile is TAPPABLE: opens the P11 AchievementSheet (earned detail;
                a masked secret opens SEALED, OQ-148). The screen owns the sheet + the def lookup. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${firstLabel ?? 'Achievement'} details`}
              onPress={() => onAchievementPress?.(item.objects[0]?.achievementId)}
              disabled={!onAchievementPress}
              style={styles.achv}
            >
              <Svg width={16} height={16} viewBox="0 0 24 24">
                <Path
                  d="M7 4h10v4a5 5 0 0 1-10 0V4z M7 5H4v2a3 3 0 0 0 3 3 M17 5h3v2a3 3 0 0 1-3 3 M9 18h6 M10 14v4 M14 14v4"
                  fill="none"
                  stroke={t.brand.gold}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
          </View>
        ) : item.objects.length ? (
          <View style={styles.peek}>
            {/* walk-3 — the peek key carries the INDEX: keying on gameId alone collided when one
                aggregate peeks two cards for the SAME game (e.g. an actor publishes twice for one
                title in a window) → React's duplicate-key error on Friends focus. The ≤3 peek array
                is server-ordered and never reordered client-side, so the index is stable. */}
            {item.objects.slice(0, 3).map((o, i) => (
              <Pressable
                key={`${item.feedItemId}:${o.card?.id ?? o.gameId ?? 'obj'}:${i}`}
                accessibilityRole="button"
                accessibilityLabel={o.title ?? 'game'}
                disabled={!o.gameId}
                onPress={() => o.gameId && onObjectPress(o.gameId)}
              >
                <EntryCard card={{ imageUrl: o.card?.imageUrl ?? null }} title={o.title ?? ''} size="thumb" />
              </Pressable>
            ))}
            {extra > 0 ? (
              <View style={styles.more}>
                <Text style={styles.moreText}>+{extra}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.time}>{timeAgo(item.occurredAt)}</Text>
      </View>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  row: {
    flexDirection: 'row',
    gap: t.space.lg,
    alignItems: 'flex-start',
    paddingVertical: t.space.lg,
    borderBottomWidth: 1,
    borderBottomColor: t.scr.hairline,
  },
  body: { flex: 1, minWidth: 0, gap: t.space.md },
  line: { fontFamily: t.font.screenSemi, fontSize: t.type.body, color: t.scr.dim, lineHeight: 16 },
  actor: { fontFamily: t.font.screenBold, color: t.scr.ink },
  strong: { fontFamily: t.font.screenBold, color: t.scr.ink },
  peek: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  more: {
    minWidth: 30,
    height: 62,
    paddingHorizontal: t.space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.scr.hairline,
  },
  moreText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  achv: {
    width: 44,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.brand.gold,
  },
  time: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 1 },
}));
