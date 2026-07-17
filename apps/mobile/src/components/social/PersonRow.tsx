import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { PersonSearchResult, SearchRelationship } from '@ingame/shared';
import { themedStyles, useTheme } from '../../theme';
import { Avatar } from '../Avatar';
import { ScreenButton } from '../ScreenButton';
import { useCreateFriendRequestMutation } from '../../store/friendApi';
import { cooldownRemaining } from './timeAgo';

// PersonRow (P8 · SOC-07 · find-add board P2/P6) — the relationship SPINE: one person, one state, the
// single right action. Drives off the SEARCH relationship (6-value): none→ADD (live) · outgoing→
// REQUESTED · incoming→respond-in-requests · friend→open profile · cooldown→disabled+reason ·
// blocked→limited (never actually surfaces from search — mutually invisible; rendered for completeness).
//
// NON-ACQUISITIVE (decision 0069): ADD is orange /primary, never gold. GAP (OQ-072): the search shape
// carries no `requestId`, so an outgoing/incoming row can't inline cancel/accept here — those transitions
// live in the requests inbox (where FriendRequestItem.requestId is present); this row taps through.
type ReqError = { status?: number | string; data?: { error?: { code?: string; cooldownUntil?: string } } };

export function PersonRow({
  person,
  onProfile,
  onRespondRequests,
  onSent,
  onError,
  onManageBlocks,
}: {
  person: PersonSearchResult;
  /** friend row → open their profile. */
  onProfile: (userId: string) => void;
  /** incoming row → the requests inbox (accept/decline need the requestId, not on this shape). */
  onRespondRequests: () => void;
  /** ADD succeeded → the container raises the sent Toast. */
  onSent: (username: string) => void;
  /** a non-recoverable ADD failure → the container raises the error Toast. */
  onError?: (message: string) => void;
  /** blocked row → Settings › Blocked. */
  onManageBlocks?: () => void;
}) {
  const t = useTheme();
  const styles = useStyles();
  const [createRequest, { isLoading }] = useCreateFriendRequestMutation();
  // Local overlay over the server relationship — an ADD/cooldown result the cached search row can't see.
  const [local, setLocal] = useState<'idle' | 'sent' | 'cooldown'>('idle');
  const [cooldownUntil, setCooldownUntil] = useState<string | undefined>(person.cooldownUntil);

  const rel: SearchRelationship =
    local === 'sent' ? 'outgoing' : local === 'cooldown' ? 'cooldown' : person.relationship;

  async function onAdd() {
    try {
      await createRequest(person.userId).unwrap();
      setLocal('sent');
      onSent(person.username);
    } catch (e) {
      const code = (e as ReqError)?.data?.error?.code;
      if (code === 'REQUEST_COOLDOWN') {
        setCooldownUntil((e as ReqError).data?.error?.cooldownUntil);
        setLocal('cooldown');
      } else if (code === 'ALREADY_FRIENDS' || code === 'REQUEST_PENDING') {
        setLocal('sent'); // the state moved under us — show the settled chip, no error
      } else if (code === 'SELF_TARGET') {
        onError?.("You can't add yourself.");
      } else {
        onError?.("Couldn't send the request. Try again.");
      }
    }
  }

  return (
    <View style={[styles.row, rel === 'blocked' && styles.dimmed]}>
      <Avatar username={person.username} avatarUrl={person.avatarUrl} size={38} />
      <View style={styles.meta}>
        <Text style={[styles.name, rel === 'blocked' && styles.dimName]} numberOfLines={1}>
          {person.username}
        </Text>
        <Text style={styles.sub}>{subFor(rel, cooldownUntil)}</Text>
      </View>

      <View style={styles.act}>
        {rel === 'none' ? (
          <ScreenButton
            label={isLoading ? 'Sending…' : '+ Add'}
            variant="primary"
            size="mini"
            onPress={() => void onAdd()}
            disabled={isLoading}
            accessibilityLabel={`Add ${person.username}`}
          />
        ) : rel === 'outgoing' ? (
          <View style={styles.tag}>
            <Text style={styles.tagText}>REQUESTED</Text>
          </View>
        ) : rel === 'incoming' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Respond to ${person.username}`}
            onPress={onRespondRequests}
            style={styles.relmark}
          >
            <Text style={styles.relText}>WANTS TO CONNECT</Text>
            <Text style={styles.go}>›</Text>
          </Pressable>
        ) : rel === 'friend' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${person.username} profile`}
            onPress={() => onProfile(person.userId)}
            style={styles.relmark}
          >
            <Svg width={13} height={13} viewBox="0 0 24 24">
              <Path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke={t.scr.accent} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={[styles.relText, styles.relFriend]}>FRIENDS</Text>
            <Text style={styles.go}>›</Text>
          </Pressable>
        ) : rel === 'cooldown' ? (
          <View style={styles.cooldownWrap}>
            <Text style={styles.coolNote}>{cooldownRemaining(cooldownUntil) || 'ON COOLDOWN'}</Text>
            <ScreenButton label="+ Add" variant="secondary" size="mini" disabled accessibilityLabel="Add on cooldown" />
          </View>
        ) : (
          // blocked — mutually invisible (never actually reaches here); the only affordance is Settings.
          <Pressable accessibilityRole="button" onPress={onManageBlocks} style={styles.relmark} disabled={!onManageBlocks}>
            <Text style={styles.relText}>MANAGE IN SETTINGS</Text>
            <Text style={styles.go}>›</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function subFor(rel: SearchRelationship, cooldownUntil?: string): string {
  switch (rel) {
    case 'none':
      return 'NOT CONNECTED';
    case 'outgoing':
      return 'REQUEST PENDING';
    case 'incoming':
      return 'WANTS TO CONNECT';
    case 'friend':
      return 'ALREADY FRIENDS';
    case 'cooldown':
      return cooldownUntil ? 'RE-REQUEST COOLDOWN' : 'RE-REQUEST COOLDOWN';
    case 'blocked':
      return 'BLOCKED';
  }
}

const useStyles = themedStyles((t) => ({
  row: {
    flexDirection: 'row',
    gap: t.space.lg,
    alignItems: 'center',
    paddingVertical: t.space.lg,
    borderBottomWidth: 1,
    borderBottomColor: t.scr.hairline,
  },
  dimmed: { opacity: 0.5 },
  meta: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.3 },
  dimName: { color: t.scr.dim },
  sub: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  act: { marginLeft: 'auto', alignItems: 'flex-end', gap: t.space.xs },
  tag: {
    backgroundColor: t.scr.panelHi,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.sm,
  },
  tagText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  relmark: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm, paddingVertical: t.space.sm },
  relText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  relFriend: { color: t.scr.ink },
  go: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.faint },
  cooldownWrap: { alignItems: 'flex-end', gap: t.space.xs },
  coolNote: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.5 },
}));
