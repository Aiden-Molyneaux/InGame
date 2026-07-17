import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import type { FriendRequestItem } from '@ingame/shared';
import { ScreenHead } from '../src/components/ScreenHead';
import { TertiaryLink } from '../src/components/TertiaryLink';
import { Skeleton, LoadError, EmptyState, Toast } from '../src/components/lifecycle';
import { RequestRow } from '../src/components/social/RequestRow';
import { themedStyles } from '../src/theme';
import {
  useGetFriendRequestsQuery,
  useAcceptFriendRequestMutation,
  useDeclineFriendRequestMutation,
  useCancelFriendRequestMutation,
} from '../src/store/friendApi';

// The full REQUESTS inbox (P8 · find-add board P4 · SOC-08) — INCOMING (ACCEPT / DECLINE-silent) + SENT
// (CANCEL). Requests carry the transition `requestId`, so the FULL lifecycle lives here (the search
// PersonRow can't — OQ-072). The board's cooldown section is EXPECTED: GET /me/friends/requests returns
// only pending incoming/outgoing — there is no endpoint that lists people you're in re-request cooldown
// with, so that section can't be populated honestly (the cooldown microcopy still shows on the search
// PersonRow + the profile ADD when you hit the window).
export default function FriendRequests() {
  const router = useRouter();
  const styles = useStyles();

  const { data, isLoading, isError, refetch } = useGetFriendRequestsQuery();
  const [accept, acceptState] = useAcceptFriendRequestMutation();
  const [decline, declineState] = useDeclineFriendRequestMutation();
  const [cancel, cancelState] = useCancelFriendRequestMutation();
  const [toast, setToast] = useState<string | null>(null);

  const incoming = data?.incoming ?? [];
  const outgoing = data?.outgoing ?? [];
  const busy = acceptState.isLoading || declineState.isLoading || cancelState.isLoading;

  async function onAccept(item: FriendRequestItem) {
    try {
      await accept({ requestId: item.requestId, userId: item.person.userId }).unwrap();
      setToast(`You're now friends with ${item.person.username}`);
    } catch {
      setToast(`Couldn't accept ${item.person.username}. Try again.`);
    }
  }
  async function onDecline(item: FriendRequestItem) {
    try {
      await decline({ requestId: item.requestId, userId: item.person.userId }).unwrap();
    } catch {
      setToast('Could not decline right now. Try again.');
    }
  }
  async function onCancel(item: FriendRequestItem) {
    try {
      await cancel({ requestId: item.requestId, userId: item.person.userId }).unwrap();
    } catch {
      setToast('Could not cancel right now. Try again.');
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.pad}>
        <ScreenHead title="Requests" />
      </View>
      <View style={styles.retlink}>
        <TertiaryLink label="Add friends" chevron="leading-back" onPress={() => router.back()} />
      </View>
      <ScrollView style={styles.flex} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <Skeleton variant="text-lines" lines={4} />
        ) : isError ? (
          <LoadError message="Couldn't load your requests. Check your connection and try again." onRetry={() => void refetch()} />
        ) : incoming.length === 0 && outgoing.length === 0 ? (
          <EmptyState
            title="Nothing pending"
            message="Requests you send and receive show up here. Find people by username or share your invite."
            actionLabel="Find someone"
            onAction={() => router.push('/add-friends')}
          />
        ) : (
          <>
            {incoming.length > 0 ? (
              <>
                <Text style={styles.secTitle}>INCOMING · {incoming.length}</Text>
                {incoming.map((item) => (
                  <RequestRow key={item.requestId} item={item} kind="incoming" onAccept={onAccept} onDecline={onDecline} onProfile={(id) => router.push(`/user/${id}`)} busy={busy} />
                ))}
              </>
            ) : null}
            {outgoing.length > 0 ? (
              <>
                <Text style={styles.secTitle}>SENT · {outgoing.length}</Text>
                {outgoing.map((item) => (
                  <RequestRow key={item.requestId} item={item} kind="outgoing" onCancel={onCancel} onProfile={(id) => router.push(`/user/${id}`)} busy={busy} />
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
      {toast ? <Toast message={toast} tone="success" onDismiss={() => setToast(null)} /> : null}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.scr.bg },
  flex: { flex: 1 },
  pad: { paddingHorizontal: t.space.xl, paddingTop: t.space.lg },
  retlink: { paddingHorizontal: t.space.xl, paddingBottom: t.space.sm },
  body: { paddingHorizontal: t.space.xl, paddingBottom: t.space.xxl },
  secTitle: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2, marginTop: t.space.lg, marginBottom: t.space.sm },
}));
