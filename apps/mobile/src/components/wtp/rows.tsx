import { View, Text, Pressable } from 'react-native';
import type { QueueItem, RecommendationItem, TrendingCardView, CollectionItem } from '@ingame/shared';
import { EntryCard } from '../EntryCard';
import { FlatCardImage } from '../game/FlatCardImage';
import { ScreenButton } from '../ScreenButton';
import { RankChip } from '../RankChip';
import { themedStyles, useTheme } from '../../theme';

// P10 WTP row vocabulary (component-map §12 — QueueRow · RecRow · ReleaseRow · AdoptCount; discover board).
// Non-commerce surfaces: counts, never PIXELS/prices (0069) — the one blessed gold is ADD FROM COLLECTION
// (the 2026-06-23 audit carve-out), rendered by the caller's ScreenButton/add, not here.

const STATUS_LABEL: Record<string, string> = {
  playing: 'PLAYING',
  beaten: 'BEATEN',
  completed: 'COMPLETED',
  backlog: 'BACKLOG',
  dropped: 'DROPPED',
  wishlist: 'WISHLIST',
};

// The board's 6-dot drag grip (`.grip`) — the drag handle on a reorderable row.
export function Grip() {
  const styles = useStyles();
  return (
    <View style={styles.grip} accessibilityElementsHidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={styles.gripDot} />
      ))}
    </View>
  );
}

/** AdoptCount (▲ N) — the non-commerce clout count on a trending card (never a price). */
export function AdoptCount({ count }: { count: number }) {
  const styles = useStyles();
  return <Text style={styles.adopt}>▲ {fmtCount(count)}</Text>;
}

// QueueRow (WTP-01/02) — grip + rank + card thumb + title + sub (hours·status, or REC'D BY @user + note) +
// the right source tag (IN COLLECTION `owned` · ★ WISHLIST unowned). `arranging` shows the grip; read mode
// hides it and taps through to the game.
export function QueueRow({
  item,
  rank,
  arranging,
  onPress,
  onOverflow,
}: {
  item: QueueItem;
  rank: number;
  arranging?: boolean;
  onPress?: () => void;
  onOverflow?: () => void;
}) {
  const styles = useStyles();
  const recBy = item.source === 'friend_rec' ? item.recommendedBy : undefined;
  const sub = recBy
    ? `REC'D BY @${recBy.username}${item.note ? ` · ${item.note}` : ''}`
    : ''; // hours/status aren't on the queue shape; a self-add shows its source tag only (board sub is context)
  return (
    <Pressable
      style={styles.qrow}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, rank ${rank}`}
      onPress={onPress}
      disabled={arranging}
    >
      {arranging ? <Grip /> : null}
      <Text style={styles.qrank}>{rank}</Text>
      <EntryCard title={item.title} card={item.card} size="thumb" />
      <View style={styles.qmeta}>
        <Text style={styles.qtitle} numberOfLines={1}>{item.title.toUpperCase()}</Text>
        {sub ? <Text style={styles.qsub} numberOfLines={2}>{sub}</Text> : null}
      </View>
      {onOverflow && !arranging ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`${item.title} options`} onPress={onOverflow} hitSlop={8}>
          <Text style={styles.ovf}>⋯</Text>
        </Pressable>
      ) : null}
      <View style={item.owned ? styles.tagSrc : styles.tagWish}>
        <Text style={item.owned ? styles.tagSrcText : styles.tagWishText}>
          {item.owned ? 'IN COLLECTION' : '★ WISHLIST'}
        </Text>
      </View>
    </Pressable>
  );
}

// RecRow (SOC-05) — the FROM-FRIENDS recommendation: thumb + REC'D BY @user + title + note + accept/dismiss.
export function RecRow({
  rec,
  onQueue,
  onDismiss,
  onPress,
  busy,
}: {
  rec: RecommendationItem;
  onQueue: () => void;
  onDismiss: () => void;
  onPress?: () => void;
  busy?: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={styles.recRow}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open ${rec.game.title}`} onPress={onPress}>
        <FlatCardImage title={rec.game.title} imageUrl={rec.game.card.thumbUrl} size="thumb" />
      </Pressable>
      <View style={styles.recMeta}>
        <Text style={styles.recWho}>REC&apos;D BY <Text style={styles.recWhoBold}>@{rec.fromUser.username}</Text></Text>
        <Text style={styles.recTitle} numberOfLines={1}>{rec.game.title.toUpperCase()}</Text>
        {rec.note ? <Text style={styles.recNote} numberOfLines={2}>&ldquo;{rec.note}&rdquo;</Text> : null}
      </View>
      <View style={styles.recActions}>
        <ScreenButton label={busy ? '…' : '+ Queue'} variant="action-alt" size="mini" onPress={onQueue} disabled={busy} />
        <Pressable accessibilityRole="button" accessibilityLabel={`Dismiss ${rec.game.title}`} onPress={onDismiss} hitSlop={6}>
          <Text style={styles.dismiss}>DISMISS</Text>
        </Pressable>
      </View>
    </View>
  );
}

// TrendRow (DISC-04) — the trending community card: rank chip (#1 accent) + flattened thumb + title +
// BY @designer + AdoptCount. NON-COMMERCE (no price). Tap → the game / CardDetail.
export function TrendRow({ item, onPress }: { item: TrendingCardView; onPress?: () => void }) {
  const styles = useStyles();
  return (
    <Pressable style={styles.trend} accessibilityRole="button" accessibilityLabel={`${item.game.title} card by ${item.designer.username}`} onPress={onPress}>
      <Text style={[styles.trank, item.rank === 1 && styles.trankFirst]}>{item.rank}</Text>
      <FlatCardImage title={item.card.name} imageUrl={item.card.thumbUrl} size="thumb" />
      <View style={styles.tmeta}>
        <Text style={styles.ttitle} numberOfLines={1}>{item.game.title.toUpperCase()}</Text>
        <Text style={styles.tby} numberOfLines={1}>&ldquo;{item.card.name}&rdquo; · BY <Text style={styles.tbyBold}>@{item.designer.username}</Text></Text>
      </View>
      <AdoptCount count={item.adoptionCount} />
    </Pressable>
  );
}

// ReleaseRow (DISC-01/CAT-11) — an upcoming release cell (card + title + studio + date). The M6 slice ships
// the component but NOT the notify-me toggle (M7, §0.8) — the endpoint isn't live yet, so the rail renders
// EXPECTED-empty; this is kept for the moment `/catalog/upcoming` lands.
export function ReleaseRow({ title, studio, releaseLabel }: { title: string; studio?: string | null; releaseLabel?: string | null }) {
  const styles = useStyles();
  return (
    <View style={styles.rel}>
      <FlatCardImage title={title} imageUrl={null} size="cell" />
      <Text style={styles.rTitle} numberOfLines={1}>{title.toUpperCase()}</Text>
      {studio ? <Text style={styles.rStudio} numberOfLines={1}>{studio.toUpperCase()}</Text> : null}
      {releaseLabel ? <Text style={styles.datechip}>⏲ {releaseLabel}</Text> : null}
    </View>
  );
}

// NowPlayingPin (WTP-03) — the single pinned game atop the UP NEXT room: card + NOW PLAYING tag + title +
// hours·status + LOG HOURS. Reads the /me/collection nowPlaying entry.
export function NowPlayingPin({ item, onLogHours, onPress }: { item: CollectionItem; onLogHours: () => void; onPress: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.pin}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} onPress={onPress}>
        <EntryCard title={item.title} card={item.card} size="cell" nowPlaying animate />
      </Pressable>
      <View style={styles.pinMeta}>
        <Text style={styles.pinTag}>▶ NOW PLAYING</Text>
        <Text style={styles.pinTitle} numberOfLines={1}>{item.title.toUpperCase()}</Text>
        <Text style={styles.pinSub}>{item.hours} H · {STATUS_LABEL[item.status] ?? item.status.toUpperCase()}</Text>
      </View>
      <ScreenButton label="Log hours" variant="action-alt" size="mini" onPress={onLogHours} />
    </View>
  );
}

function fmtCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

const useStyles = themedStyles((t) => ({
  grip: { width: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 2, alignContent: 'center' },
  gripDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: t.scr.faint },

  adopt: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 0.5 },

  qrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.sm,
  },
  qrank: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.dim, width: 16, textAlign: 'center' },
  qmeta: { flex: 1, gap: 1, minWidth: 0 },
  qtitle: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.5 },
  qsub: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.3 },
  ovf: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.dim, paddingHorizontal: 2 },
  tagSrc: { backgroundColor: t.scr.panelHi, paddingHorizontal: 5, paddingVertical: 2 },
  tagSrcText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  tagWish: { backgroundColor: t.scr.panelHi, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: t.scr.accent },
  tagWishText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 0.5 },

  recRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.md, backgroundColor: t.scr.panel, borderWidth: 1, borderColor: t.scr.hairline, paddingHorizontal: t.space.md, paddingVertical: t.space.sm },
  recMeta: { flex: 1, gap: 1, minWidth: 0 },
  recWho: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  recWhoBold: { fontFamily: t.font.screenBold, color: t.scr.ink },
  recTitle: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.5 },
  recNote: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, fontStyle: 'italic' },
  recActions: { alignItems: 'flex-end', gap: t.space.sm },
  dismiss: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.5 },

  trend: { flexDirection: 'row', alignItems: 'center', gap: t.space.md, backgroundColor: t.scr.panel, borderWidth: 1, borderColor: t.scr.hairline, paddingHorizontal: t.space.md, paddingVertical: t.space.sm },
  trank: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.dim, width: 16, textAlign: 'center' },
  trankFirst: { color: t.scr.accent, fontSize: t.type.title },
  tmeta: { flex: 1, gap: 1, minWidth: 0 },
  ttitle: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.5 },
  tby: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.3 },
  tbyBold: { fontFamily: t.font.screenBold, color: t.scr.ink },

  rel: { width: 116, gap: 3 },
  rTitle: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.ink, letterSpacing: 0.5, marginTop: t.space.xs },
  rStudio: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  datechip: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.3 },

  pin: { flexDirection: 'row', alignItems: 'center', gap: t.space.lg, backgroundColor: t.scr.panel, borderWidth: 1, borderColor: t.scr.hairline, padding: t.space.md },
  pinMeta: { flex: 1, gap: 2, minWidth: 0 },
  pinTag: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 1.5 },
  pinTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 0.5 },
  pinSub: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
}));
