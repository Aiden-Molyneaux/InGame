import { useState, type ReactNode } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import type { PersonSummary } from '@ingame/shared';
import type { CreateReportRequest } from '../src/store/reportApi';
import { ScreenHead, SCREEN_HEADER_PAD, RETURN_SEAM_PAD } from '../src/components/ScreenHead';
import { TertiaryLink } from '../src/components/TertiaryLink';
import { ConfirmSheet } from '../src/components/ConfirmSheet';
import { Skeleton, LoadError, EmptyState, Toast } from '../src/components/lifecycle';
import { FriendRow } from '../src/components/social/FriendRow';
import { FriendActionsSheet } from '../src/components/social/FriendActionsSheet';
import { RecommendSheet } from '../src/components/social/RecommendSheet';
import { HeaderKey } from '../src/components/social/HeaderKey';
import { ReportSheet, type ReportActionOutcome, type ReportTarget } from '../src/components/report/ReportSheet';
import { themedStyles } from '../src/theme';
import { useGetFriendsQuery, useGetFriendRequestsQuery, useUnfriendMutation } from '../src/store/friendApi';
import { useSubmitReportMutation } from '../src/store/reportApi';
import { useBlockUserMutation } from '../src/store/communityApi';

// The ALL FRIENDS roster (P8 · friends-states P3/P6/P7/P8) — the full FriendRow list reached from the
// tab's rail. Each row → their profile / COMPARE / the ⋮ actions sheet (VIEW · COMPARE · RECOMMEND ·
// UNFRIEND · REPORT · BLOCK). UNFRIEND + BLOCK route through the decision-0040 ConfirmSheet with the
// silent copy; RECOMMEND opens the minimal compose (OQ-075); REPORT opens the app-wide ReportSheet.
export default function FriendsRoster() {
  const router = useRouter();
  const styles = useStyles();

  const { data: friends, isLoading, isError, refetch } = useGetFriendsQuery();
  const { data: requests } = useGetFriendRequestsQuery();
  const [unfriend, unfriendState] = useUnfriendMutation();
  const [blockUser, blockState] = useBlockUserMutation();
  const [submitReport, reportState] = useSubmitReportMutation();

  // One person is "active" at a time across the sheet stack. Each follow-on closes the menu first.
  const [menu, setMenu] = useState<PersonSummary | null>(null);
  const [recommend, setRecommend] = useState<PersonSummary | null>(null);
  const [report, setReport] = useState<PersonSummary | null>(null);
  const [unfriendTarget, setUnfriendTarget] = useState<PersonSummary | null>(null);
  const [blockTarget, setBlockTarget] = useState<PersonSummary | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const roster = friends?.friends ?? [];
  const incoming = requests?.incoming ?? [];

  async function doUnfriend() {
    if (!unfriendTarget) return;
    const name = unfriendTarget.username;
    try {
      await unfriend(unfriendTarget.userId).unwrap();
      setUnfriendTarget(null);
      setToast(`Unfriended ${name}`);
    } catch {
      setUnfriendTarget(null);
      setToast(`Couldn't unfriend ${name}. Try again.`);
    }
  }
  async function doBlock() {
    if (!blockTarget) return;
    const name = blockTarget.username;
    try {
      await blockUser(blockTarget.userId).unwrap();
      setBlockTarget(null);
      void refetch(); // block severs the bond server-side; re-read the roster (communityApi block ≠ Friends tag)
      setToast(`Blocked ${name}`);
    } catch {
      setBlockTarget(null);
      setToast(`Couldn't block ${name}. Try again.`);
    }
  }
  async function onSubmitReport(req: CreateReportRequest): Promise<ReportActionOutcome> {
    try {
      await submitReport(req).unwrap();
      return 'ok';
    } catch (e) {
      const s = (e as { status?: unknown })?.status;
      return s === 'FETCH_ERROR' || s === 'TIMEOUT_ERROR' ? 'offline' : 'error';
    }
  }
  async function onBlockFromReport(): Promise<ReportActionOutcome> {
    if (!report) return 'error';
    try {
      await blockUser(report.userId).unwrap();
      void refetch();
      return 'ok';
    } catch (e) {
      const s = (e as { status?: unknown })?.status;
      return s === 'FETCH_ERROR' || s === 'TIMEOUT_ERROR' ? 'offline' : 'error';
    }
  }

  const reportTarget: ReportTarget | null = report ? { type: 'user', id: report.userId, name: report.username } : null;

  return (
    <Frame
      title={`Friends ${roster.length || ''}`.trim()}
      count={incoming.length}
      onBack={() => router.back()}
      onHub={() => router.push('/add-friends')}
    >
      {isLoading ? (
        <Skeleton variant="text-lines" lines={6} />
      ) : isError ? (
        <LoadError message="Couldn't load your friends. Check your connection and try again." onRetry={() => void refetch()} />
      ) : roster.length === 0 ? (
        <EmptyState
          title="No friends yet"
          message="Find people by username, share your invite, or scan a QR to build your circle."
          actionLabel="Find friends"
          onAction={() => router.push('/add-friends')}
        />
      ) : (
        <>
          <Text style={styles.count}>ALL FRIENDS · {roster.length}</Text>
          {roster.map((p) => (
            <FriendRow
              key={p.userId}
              person={p}
              onProfile={(id) => router.push(`/user/${id}`)}
              onCompare={(id) => router.push(`/compare/${id}`)}
              onOverflow={setMenu}
            />
          ))}
        </>
      )}

      {/* the row-⋮ actions menu (P6) — each follow-on closes the menu first (no stacked sheets) */}
      <FriendActionsSheet
        visible={menu != null}
        person={menu}
        onClose={() => setMenu(null)}
        onView={() => {
          const p = menu;
          setMenu(null);
          if (p) router.push(`/user/${p.userId}`);
        }}
        onCompare={() => {
          const p = menu;
          setMenu(null);
          if (p) router.push(`/compare/${p.userId}`);
        }}
        onRecommend={() => {
          setRecommend(menu);
          setMenu(null);
        }}
        onUnfriend={() => {
          setUnfriendTarget(menu);
          setMenu(null);
        }}
        onReport={() => {
          setReport(menu);
          setMenu(null);
        }}
        onBlock={() => {
          setBlockTarget(menu);
          setMenu(null);
        }}
      />

      {/* RECOMMEND (SOC-05 minimal compose · OQ-075) */}
      <RecommendSheet
        visible={recommend != null}
        toUserId={recommend?.userId ?? null}
        toUsername={recommend?.username ?? null}
        onClose={() => setRecommend(null)}
        onSent={(name) => {
          setRecommend(null);
          setToast(`Recommended to ${name}`);
        }}
        onError={(m) => setToast(m)}
      />

      {/* REPORT (MOD-01 · user target — the sheet carries its own block-alongside) */}
      <ReportSheet
        visible={reportTarget != null}
        target={reportTarget}
        onClose={() => setReport(null)}
        onSubmit={onSubmitReport}
        submitting={reportState.isLoading}
        onBlock={onBlockFromReport}
        blocking={blockState.isLoading}
        onManageBlocks={() => {
          setReport(null);
          router.push('/settings/blocked');
        }}
        onError={(m) => setToast(m)}
      />

      {/* UNFRIEND confirm (P7 · silent copy, decision 0040) */}
      <ConfirmSheet
        visible={unfriendTarget != null}
        title={`Unfriend ${unfriendTarget?.username ?? ''}?`}
        message={`You'll stop seeing each other's activity and lose the friend-only views (compare hours, hidden stats). ${unfriendTarget?.username ?? 'They'} isn't notified. You can send a new request later.`}
        confirmLabel="Unfriend"
        busy={unfriendState.isLoading}
        onConfirm={() => void doUnfriend()}
        onClose={() => setUnfriendTarget(null)}
      />

      {/* BLOCK confirm (P8 · silent · mutual-invisible copy, SOC-09) */}
      <ConfirmSheet
        visible={blockTarget != null}
        title={`Block ${blockTarget?.username ?? ''}?`}
        message={`This removes them as a friend and makes you two mutually invisible — you won't find, see, or hear from each other anywhere in InGame. ${blockTarget?.username ?? 'They'} isn't notified. Unblock from Settings › Blocked Users.`}
        confirmLabel="Block"
        busy={blockState.isLoading}
        onConfirm={() => void doBlock()}
        onClose={() => setBlockTarget(null)}
      />

      {toast ? <Toast message={toast} tone="success" onDismiss={() => setToast(null)} /> : null}
    </Frame>
  );
}

function Frame({
  title,
  count,
  onBack,
  onHub,
  children,
}: {
  title: string;
  count: number;
  onBack: () => void;
  onHub: () => void;
  children: ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.screen}>
      <View style={styles.pad}>
        <ScreenHead title={title} trailing={<HeaderKey count={count} onPress={onHub} />} />
      </View>
      <View style={styles.retlink}>
        <TertiaryLink label="Friends" chevron="leading-back" onPress={onBack} />
      </View>
      <ScrollView style={styles.flex} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
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
  count: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2, marginBottom: t.space.md, marginTop: t.space.sm },
}));
