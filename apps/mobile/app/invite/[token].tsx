import { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Relationship } from '@ingame/shared';
import { ScreenButton } from '../../src/components/ScreenButton';
import { Toast } from '../../src/components/lifecycle';
import { Avatar } from '../../src/components/Avatar';
import { themedStyles, useTheme } from '../../src/theme';
import { useResolveInviteQuery } from '../../src/store/inviteApi';
import { useCreateFriendRequestMutation } from '../../src/store/friendApi';
import { SCREEN_HEADER_PAD } from '../../src/components/ScreenHead';

// InviteLanding (P8 · find-add board P5 · SOC-10) — the arrival from an opened invite link/QR. A
// FlowTakeover (✕ close top-right, resolves into the sender's world), NOT a tab. GET /invites/:token
// resolves (AUTH-LOOKUP — works for a fresh install with no session) → SenderSummary + a relationship-
// aware one-tap ADD (an already-friend/pending link resolves to the right action, not a duplicate ADD).
// INVITE_INVALID / INVITE_EXPIRED → the expired terminal. Deep-linking + the store-listing fallback are
// parked (§10); this route is dev-reachable. ✕ → back in-session, else the app home.
export default function InviteLanding() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles();

  const { data, isLoading, isError, error } = useResolveInviteQuery(token ?? '', { skip: !token });
  const [createRequest, { isLoading: adding }] = useCreateFriendRequestMutation();
  const [sent, setSent] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/collection');
  }

  async function onAdd() {
    if (!data) return;
    try {
      await createRequest(data.prefilledRequest.toUserId).unwrap();
      // Walk-2 (owner ruling 2026-07-17): NO success toast on request-send — the landing flipping to
      // its REQUEST SENT state is the sole confirmation. Supersedes the board's sent-confirm Toast;
      // the design-spec ripple rides decision 0078. Failures still toast (below).
      setSent(true);
    } catch (e) {
      const code = (e as { data?: { error?: { code?: string } } })?.data?.error?.code;
      if (code === 'ALREADY_FRIENDS' || code === 'REQUEST_PENDING') setSent(true);
      else setToast("Couldn't send the request. Try again.");
    }
  }

  const status = (error as { status?: unknown } | undefined)?.status;
  const invalid = isError && (status === 409 || status === 404);

  return (
    <View style={styles.screen}>
      <View style={styles.head}>
        <Text style={styles.headTitle}>INVITE</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} hitSlop={8} style={styles.closeKey}>
          <Text style={styles.closeX}>✕</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {isLoading || !token ? (
          <View style={styles.center}>
            <ActivityIndicator color={t.scr.accent} />
          </View>
        ) : invalid || !data ? (
          <View style={styles.land}>
            <View style={styles.errCard}>
              <Text style={styles.errBang}>!</Text>
            </View>
            <Text style={styles.eyebrow}>THIS INVITE CAN'T BE OPENED</Text>
            <Text style={styles.name}>LINK EXPIRED OR INVALID</Text>
            <Text style={styles.sub}>This invite link has expired or isn't valid anymore. Ask them to send you a fresh one.</Text>
            <View style={styles.cta}>
              <ScreenButton label="Close" variant="secondary" onPress={close} block />
            </View>
          </View>
        ) : (
          <View style={styles.land}>
            <Avatar username={data.sender.username} avatarUrl={data.sender.avatarUrl} avatarConfig={data.sender.avatarConfig} size={50} />
            <Text style={styles.eyebrow}>{eyebrowFor(data.relationship, sent)}</Text>
            <Text style={styles.name}>{data.sender.username}</Text>
            <Text style={styles.sub}>{subFor(data.relationship, sent)}</Text>
            <View style={styles.cta}>
              {primaryFor(data.relationship, sent) === 'add' ? (
                <ScreenButton
                  label={adding ? 'Sending…' : `Add ${data.sender.username}`}
                  variant="primary"
                  onPress={() => void onAdd()}
                  disabled={adding}
                  block
                />
              ) : null}
              <ScreenButton label="View their profile" variant="secondary" onPress={() => router.push(`/user/${data.sender.userId}`)} block />
            </View>
          </View>
        )}
      </ScrollView>
      {toast ? <Toast message={toast} tone="success" onDismiss={() => setToast(null)} /> : null}
    </View>
  );
}

// Relationship-aware copy — the resolve carries the resolver↔sender relation so an already-friend/pending
// link lands the right action, never a duplicate ADD.
function primaryFor(rel: Relationship, sent: boolean): 'add' | 'none' {
  if (sent) return 'none';
  return rel === 'none' ? 'add' : 'none';
}
function eyebrowFor(rel: Relationship, sent: boolean): string {
  if (sent) return 'REQUEST SENT';
  switch (rel) {
    case 'friend':
      return "YOU'RE ALREADY FRIENDS";
    case 'outgoing':
      return 'REQUEST ALREADY SENT';
    case 'incoming':
      return 'THEY WANT TO CONNECT';
    default:
      return 'INVITED YOU TO CONNECT';
  }
}
function subFor(rel: Relationship, sent: boolean): string {
  if (sent) return "You've sent them a request — they'll get it in their inbox.";
  switch (rel) {
    case 'friend':
      return "You're already friends — open their profile to see what they're playing.";
    case 'outgoing':
      return "You've already sent them a request. Open their profile any time.";
    case 'incoming':
      return 'They already requested you — respond from your Requests inbox.';
    default:
      return "Send a friend request — it's prefilled and ready, one tap.";
  }
}

const useStyles = themedStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.scr.bg },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...SCREEN_HEADER_PAD }, // W-B1 — was xl-inset
  headTitle: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 2 },
  closeKey: { width: 28, height: 28, backgroundColor: t.scr.key, alignItems: 'center', justifyContent: 'center' },
  closeX: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.brand.navy },
  body: { paddingHorizontal: t.space.xl, paddingBottom: t.space.xxl },
  center: { paddingVertical: 60, alignItems: 'center' },
  land: { alignItems: 'center', gap: t.space.md, paddingTop: t.space.xxl },
  eyebrow: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2, marginTop: t.space.sm },
  name: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 1 },
  sub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.ink, textAlign: 'center', lineHeight: 16, maxWidth: 260 },
  cta: { width: '100%', gap: t.space.md, marginTop: t.space.lg },
  errCard: { width: 92, height: 92, alignItems: 'center', justifyContent: 'center', backgroundColor: t.scr.panel, borderWidth: 2, borderStyle: 'dashed', borderColor: t.scr.faint, marginBottom: t.space.sm },
  errBang: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.accent },
}));
