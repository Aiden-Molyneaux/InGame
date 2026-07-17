import { View, Text, Pressable } from 'react-native';
import type { FriendRequestItem } from '@ingame/shared';
import { themedStyles } from '../../theme';
import { Avatar } from '../Avatar';
import { ScreenButton } from '../ScreenButton';
import { timeAgo } from './timeAgo';

// RequestRow (P8 · SOC-08 · find-add board P4 / friends P4) — a pending friend request. INCOMING →
// ACCEPT (orange /primary) / DECLINE (silent — the sender is never told; cream /secondary alt voice).
// OUTGOING → CANCEL. Both carry the transition `requestId` (the search PersonRow can't — OQ-072 — which
// is why the full lifecycle lives HERE). Tapping the avatar/name opens the person's profile.
export function RequestRow({
  item,
  kind,
  onAccept,
  onDecline,
  onCancel,
  onProfile,
  busy = false,
  gated = false,
}: {
  item: FriendRequestItem;
  kind: 'incoming' | 'outgoing';
  onAccept?: (item: FriendRequestItem) => void;
  onDecline?: (item: FriendRequestItem) => void;
  onCancel?: (item: FriendRequestItem) => void;
  onProfile: (userId: string) => void;
  busy?: boolean;
  /** SYS-10 offline — dim the write actions (kept visible, non-interactive). */
  gated?: boolean;
}) {
  const styles = useStyles();
  const p = item.person;
  const when = timeAgo(item.createdAt);
  return (
    <View style={[styles.row, kind === 'incoming' && styles.incoming]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${p.username} profile`} onPress={() => onProfile(p.userId)} hitSlop={4}>
        <Avatar username={p.username} avatarUrl={p.avatarUrl} size={38} />
      </Pressable>
      <View style={styles.meta}>
        <Text style={styles.name} numberOfLines={1}>
          {kind === 'incoming' ? `${p.username} wants to connect` : p.username}
        </Text>
        <Text style={styles.sub}>{kind === 'incoming' ? `REQUESTED ${when}` : `SENT ${when}`}</Text>
      </View>
      <View style={[styles.acts, gated && styles.gated]} pointerEvents={gated ? 'none' : 'auto'}>
        {kind === 'incoming' ? (
          <>
            <ScreenButton label="Accept" variant="primary" size="mini" onPress={() => onAccept?.(item)} disabled={busy} accessibilityLabel={`Accept ${p.username}`} />
            <ScreenButton label="Decline" variant="secondary" size="mini" onPress={() => onDecline?.(item)} disabled={busy} accessibilityLabel={`Decline ${p.username}`} />
          </>
        ) : (
          <ScreenButton label="Cancel" variant="secondary" size="mini" onPress={() => onCancel?.(item)} disabled={busy} accessibilityLabel={`Cancel request to ${p.username}`} />
        )}
      </View>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  row: {
    flexDirection: 'row',
    gap: t.space.lg,
    alignItems: 'center',
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.lg,
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    marginTop: t.space.sm,
  },
  incoming: { borderColor: t.scr.accent },
  meta: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.3 },
  sub: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  acts: { flexDirection: 'row', gap: t.space.sm, alignItems: 'center' },
  gated: { opacity: 0.4 },
}));
