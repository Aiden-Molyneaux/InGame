import { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Share, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { ScreenHead, SCREEN_HEADER_PAD, RETURN_SEAM_PAD } from '../src/components/ScreenHead';
import { TertiaryLink } from '../src/components/TertiaryLink';
import { ScreenButton } from '../src/components/ScreenButton';
import { LoadError, Toast } from '../src/components/lifecycle';
import { QrCard } from '../src/components/social/QrCard';
import { themedStyles, useTheme } from '../src/theme';
import { useGetMeQuery } from '../src/store/api';
import { useCreateInviteMutation } from '../src/store/inviteApi';

// YOUR INVITE (P8 · find-add board P3 · SOC-07/10) — the two self-share paths: a copyable/shareable link
// and a client-rendered QrCard, both minted from the SAME token (POST /me/invites, OQ-073). An opened
// link/QR lands the other person on the InviteLanding (/invite/:token). Self-only sharing — there is no
// friend-profile SHARE (OQ-052).
export default function InviteFriends() {
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles();

  const { data: me } = useGetMeQuery();
  const [createInvite, { data: invite, isLoading, isError }] = useCreateInviteMutation();
  const [toast, setToast] = useState<string | null>(null);

  // Mint the invite once on open (fresh token, TTL 7d, ≤5 active — the server rotates the oldest).
  useEffect(() => {
    void createInvite();
  }, [createInvite]);

  async function copyLink() {
    if (!invite) return;
    // No new clipboard dep (QR is P8's single sanctioned dep): web copies via the platform clipboard;
    // native routes through the OS share sheet (which offers Copy) so a link still travels.
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(invite.url);
        setToast('Link copied');
        return;
      } catch {
        /* fall through to share */
      }
    }
    await shareLink();
  }
  async function shareLink() {
    if (!invite) return;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(invite.url);
        setToast('Link copied');
        return;
      }
      await Share.share({ message: `Add me on InGame — ${invite.url}`, url: invite.url });
    } catch {
      /* user dismissed the sheet — no-op */
    }
  }

  const username = me?.username ?? 'you';

  return (
    <View style={styles.screen}>
      <View style={styles.pad}>
        <ScreenHead title="Your invite" />
      </View>
      <View style={styles.retlink}>
        <TertiaryLink label="Add friends" chevron="leading-back" onPress={() => router.back()} />
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={t.scr.accent} />
          </View>
        ) : isError || !invite ? (
          <LoadError message="Couldn't create your invite. Check your connection and try again." onRetry={() => void createInvite()} />
        ) : (
          <>
            <Text style={styles.secTitle}>YOUR INVITE LINK</Text>
            <View style={styles.linkField}>
              <Svg width={15} height={15} viewBox="0 0 24 24">
                <Path d="M9 15l6-6M8 8H6a4 4 0 0 0 0 8h2M16 16h2a4 4 0 0 0 0-8h-2" fill="none" stroke={t.brand.navy} strokeWidth={2} strokeLinecap="round" />
              </Svg>
              <Text style={styles.linkText} numberOfLines={1}>
                {invite.url}
              </Text>
            </View>
            <View style={styles.linkKeys}>
              <ScreenButton label="Copy link" variant="secondary" onPress={() => void copyLink()} style={styles.keyBtn} />
              <ScreenButton label="Share…" variant="secondary" onPress={() => void shareLink()} style={styles.keyBtn} />
            </View>

            <Text style={styles.secTitle}>OR SCAN IN PERSON</Text>
            <QrCard value={invite.url} username={username} />

            <Text style={styles.foot}>
              The link and QR are the same invite. Anyone who opens it can add you with one tap. Expires in 7 days.
            </Text>
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
  // W-B1/B2 — the shared header/seam geometry (was xl-inset, no header bottom, sm seam bottom)
  pad: { ...SCREEN_HEADER_PAD },
  retlink: { ...RETURN_SEAM_PAD },
  body: { paddingHorizontal: t.space.xl, paddingBottom: t.space.xxl },
  center: { paddingVertical: t.space.xxl, alignItems: 'center' },
  secTitle: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2, marginTop: t.space.lg, marginBottom: t.space.md },
  linkField: { flexDirection: 'row', alignItems: 'center', gap: t.space.md, backgroundColor: t.brand.cream, paddingHorizontal: t.space.lg, paddingVertical: t.space.md },
  linkText: { flex: 1, fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.brand.navy, letterSpacing: 0.5 },
  linkKeys: { flexDirection: 'row', gap: t.space.md, marginTop: t.space.md },
  keyBtn: { flex: 1 },
  foot: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.4, lineHeight: 14, marginTop: t.space.lg },
}));
