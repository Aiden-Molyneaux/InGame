import { useState } from 'react';
import { View, Text } from 'react-native';
import type { Relationship } from '@ingame/shared';
import { themedStyles } from '../../theme';
import { RoleTag } from '../RoleTag';
import { ScreenButton } from '../ScreenButton';
import { useCreateFriendRequestMutation } from '../../store/friendApi';

// RelationshipAction (P9 · SOC-02/08) — the relationship chip on a friend/other-user profile. Drives off
// `/users/:id` `relationship`; ADD FRIEND is a LIVE write (POST /friends/requests) with the full 409
// family. NON-ACQUISITIVE — orange `/primary`, never gold (decision 0069: social/compare are non-commerce).
//
//  • none      → ADD FRIEND (live). On success the User tag invalidates → the profile re-reads as
//                `outgoing` (or `friend` on a mutual-pending auto-accept). The 409s map:
//                  – ALREADY_FRIENDS  → the request re-reads as friend (no error shown; refetch settles it).
//                  – REQUEST_PENDING  → re-reads as outgoing.
//                  – REQUEST_COOLDOWN → a LOCAL disabled state + the cooldown microcopy ({cooldownUntil}).
//                  – SELF_TARGET      → shouldn't be reachable (you can't open your own friend-profile),
//                                       mapped to a generic error just in case.
//  • outgoing  → REQUESTED (a quiet disabled tag — the sent state).
//  • incoming  → a hint ("wants to be friends — respond in Friends"); the ACCEPT lives in the P8
//                requests inbox (the transition `requestId` isn't on /users/:id — manifest GAP-3).
//  • friend    → the FRIEND tag (static).
type ReqError = { status?: number | string; data?: { error?: { code?: string; cooldownUntil?: string } } };

export function RelationshipAction({
  userId,
  relationship,
}: {
  userId: string;
  relationship: Relationship;
}) {
  const styles = useStyles();
  const [createRequest, { isLoading }] = useCreateFriendRequestMutation();
  const [cooldownUntil, setCooldownUntil] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onAdd() {
    setError(null);
    try {
      await createRequest(userId).unwrap(); // success → User invalidates → the profile re-reads
    } catch (e) {
      const code = (e as ReqError)?.data?.error?.code;
      if (code === 'REQUEST_COOLDOWN') {
        setCooldownUntil((e as ReqError).data?.error?.cooldownUntil ?? '');
      } else if (code === 'ALREADY_FRIENDS' || code === 'REQUEST_PENDING') {
        // The authoritative state moved under us — the invalidation refetch settles the chip; no error.
      } else if (code === 'SELF_TARGET') {
        setError("You can't add yourself.");
      } else {
        setError("Couldn't send the request. Try again.");
      }
    }
  }

  if (relationship === 'friend') {
    return <RoleTag label="FRIEND" />;
  }
  if (relationship === 'outgoing') {
    return (
      <View style={styles.wrap}>
        <View style={styles.sentTag}>
          <Text style={styles.sentText}>REQUESTED</Text>
        </View>
      </View>
    );
  }
  if (relationship === 'incoming') {
    return (
      <View style={styles.wrap}>
        <Text style={styles.incoming}>WANTS TO BE FRIENDS — RESPOND IN FRIENDS</Text>
      </View>
    );
  }
  // relationship === 'none'
  if (cooldownUntil !== null) {
    return (
      <View style={styles.wrap}>
        <View style={styles.sentTag}>
          <Text style={styles.sentText}>REQUEST ON COOLDOWN</Text>
        </View>
        <Text style={styles.cooldown}>{cooldownCopy(cooldownUntil)}</Text>
      </View>
    );
  }
  return (
    <View style={styles.wrap}>
      <ScreenButton
        label={isLoading ? 'Sending…' : 'Add friend'}
        variant="primary"
        size="mini"
        icon={<Text style={styles.plus}>＋</Text>}
        onPress={() => void onAdd()}
        disabled={isLoading}
        accessibilityLabel="Add friend"
      />
      {error ? <Text style={styles.err}>{error}</Text> : null}
    </View>
  );
}

// "You can send another request after {date}" — a calm, non-scolding line (SOC-08).
function cooldownCopy(iso: string): string {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return 'You can send another request in a little while.';
  const when = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `You can send another request after ${when}.`;
}

const useStyles = themedStyles((t) => ({
  wrap: { gap: t.space.sm, alignItems: 'flex-start' },
  sentTag: {
    backgroundColor: t.scr.panelHi,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.sm,
  },
  sentText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  incoming: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 0.5 },
  cooldown: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.3 },
  err: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.brand.alert, letterSpacing: 0.3 },
  plus: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accentInk },
}));
