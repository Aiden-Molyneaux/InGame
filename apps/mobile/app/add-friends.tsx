import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import type { FriendRequestItem } from '@ingame/shared';
import { ScreenHead, SCREEN_HEADER_PAD, RETURN_SEAM_PAD } from '../src/components/ScreenHead';
import { TertiaryLink } from '../src/components/TertiaryLink';
import { SearchField } from '../src/components/SearchField';
import { ScreenButton } from '../src/components/ScreenButton';
import { Toast } from '../src/components/lifecycle';
import { PersonRow } from '../src/components/social/PersonRow';
import { RequestRow } from '../src/components/social/RequestRow';
import { themedStyles, useTheme } from '../src/theme';
import {
  useLazySearchUsersQuery,
  useGetFriendRequestsQuery,
  useAcceptFriendRequestMutation,
  useDeclineFriendRequestMutation,
} from '../src/store/friendApi';

// The ADD FRIENDS hub (P8 · find-add board P1/P2/P2b/P6) — the destination of the Friends header key.
// FIND SOMEONE (exact-username search → PersonRow spine / no-result invite bridge) · your INVITE LINK +
// QR (→ /invite-friends) · the INCOMING requests preview (ACCEPT/DECLINE-silent → the full inbox for
// SENT + cooldown). The SearchField docks at the foot (OQ-035). Non-commerce — no gold, no SHARE.
export default function AddFriends() {
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles();

  const [query, setQuery] = useState('');
  const [runSearch, searchState] = useLazySearchUsersQuery();
  const [searchedFor, setSearchedFor] = useState<string | null>(null);
  // walk2-N5 — refetch on foreground/tab-switch so cross-device request changes appear without a reset.
  const { data: requests } = useGetFriendRequestsQuery(undefined, { refetchOnFocus: true, refetchOnMountOrArgChange: true });
  const [accept, acceptState] = useAcceptFriendRequestMutation();
  const [decline, declineState] = useDeclineFriendRequestMutation();
  const [toast, setToast] = useState<string | null>(null);

  const incoming = requests?.incoming ?? [];
  const results = searchState.data?.results ?? [];
  const busyReq = acceptState.isLoading || declineState.isLoading;

  function onSubmit() {
    const q = query.trim();
    if (!q) return;
    setSearchedFor(q);
    void runSearch(q);
  }
  function clearSearch() {
    setQuery('');
    setSearchedFor(null);
  }
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
      setToast(`Couldn't decline right now. Try again.`);
    }
  }

  const showResults = searchedFor != null;

  return (
    <View style={styles.screen}>
      <View style={styles.pad}>
        <ScreenHead title="Add friends" />
      </View>
      <View style={styles.retlink}>
        <TertiaryLink label="Friends" chevron="leading-back" onPress={() => router.back()} />
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {showResults ? (
          searchState.isFetching ? (
            <Text style={styles.searchHint}>Searching…</Text>
          ) : results.length > 0 ? (
            <>
              <Text style={styles.secTitle}>
                RESULTS FOR “{searchedFor}” · {results.length}
              </Text>
              {results.map((p) => (
                <PersonRow
                  key={p.userId}
                  person={p}
                  onProfile={(id) => router.push(`/user/${id}`)}
                  onRespondRequests={() => router.push('/friend-requests')}
                  onError={(m) => setToast(m)}
                  onManageBlocks={() => router.push('/settings/blocked')}
                />
              ))}
            </>
          ) : (
            // P2b — the invite bridge (no fuzzy discovery; the dead end becomes an invite).
            <View style={styles.noResult}>
              <View style={styles.noResultCard}>
                <Svg width={34} height={34} viewBox="0 0 24 24">
                  <Circle cx={11} cy={11} r={7} fill="none" stroke={t.scr.accent} strokeWidth={1.8} />
                  <Path d="M20 20l-4-4" stroke={t.scr.accent} strokeWidth={1.8} strokeLinecap="round" />
                </Svg>
              </View>
              <Text style={styles.noResultTitle}>@{searchedFor} isn't here</Text>
              <Text style={styles.noResultSub}>Check the spelling — usernames are exact. Or send your own invite link and add them once they join.</Text>
              <ScreenButton label="Share an invite link" variant="secondary" onPress={() => router.push('/invite-friends')} />
            </View>
          )
        ) : (
          <>
            <Text style={styles.secTitle}>FIND SOMEONE</Text>
            {/* walk-1 (owner ruling): ONE entry into the invite page — link + QR both live there, so two
                buttons to the same destination was noise. Combined label: INVITE A FRIEND (copy pick,
                flagged in the report — the board draws the pre-merge two-affordance row). */}
            <ScreenButton
              label="Invite a friend"
              variant="secondary"
              onPress={() => router.push('/invite-friends')}
              icon={<InviteGlyph color={t.brand.navy} />}
              block
            />

            <View style={styles.secRow}>
              <Text style={styles.secTitle}>
                REQUESTS{incoming.length ? ` · ${incoming.length}` : ''}
              </Text>
              <TertiaryLink label="All" onPress={() => router.push('/friend-requests')} />
            </View>
            {incoming.length > 0 ? (
              incoming.slice(0, 3).map((item) => (
                <RequestRow
                  key={item.requestId}
                  item={item}
                  kind="incoming"
                  onAccept={onAccept}
                  onDecline={onDecline}
                  onProfile={(id) => router.push(`/user/${id}`)}
                  busy={busyReq}
                />
              ))
            ) : (
              <Text style={styles.emptyReq}>No pending requests. Your sent requests live in the full inbox.</Text>
            )}
          </>
        )}
      </ScrollView>

      {/* the docked SearchField (OQ-035) — rides the foot; submit runs the exact-username search */}
      <View style={styles.tools}>
        <View style={styles.fieldWrap}>
          <Svg width={14} height={14} viewBox="0 0 24 24">
            <Circle cx={11} cy={11} r={7} fill="none" stroke={t.brand.navy} strokeWidth={2} />
            <Path d="M16 16l5 5" stroke={t.brand.navy} strokeWidth={2} strokeLinecap="round" />
          </Svg>
          <View style={styles.field}>
            <SearchField value={query} onChangeText={setQuery} placeholder="Find by username…" onSubmit={onSubmit} />
          </View>
          {query.length > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={clearSearch} hitSlop={8}>
              <Text style={styles.clear}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {toast ? <Toast message={toast} tone="success" onDismiss={() => setToast(null)} /> : null}
    </View>
  );
}

function InviteGlyph({ color }: { color: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24">
      <Path d="M9 15l6-6M8 8H6a4 4 0 0 0 0 8h2M16 16h2a4 4 0 0 0 0-8h-2" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
const useStyles = themedStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.scr.bg },
  flex: { flex: 1 },
  // W-B1/B2 — the shared header/seam geometry (was xl-inset, no header bottom, sm seam bottom)
  pad: { ...SCREEN_HEADER_PAD },
  retlink: { ...RETURN_SEAM_PAD },
  body: { paddingHorizontal: t.space.xl, paddingBottom: t.space.xxl },
  secTitle: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2, marginTop: t.space.lg, marginBottom: t.space.md },
  secRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  searchHint: { fontFamily: t.font.screenSemi, fontSize: t.type.body, color: t.scr.dim, marginTop: t.space.lg },
  emptyReq: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.faint, lineHeight: 14, marginTop: t.space.sm },

  // no-results invite bridge
  noResult: { alignItems: 'center', gap: t.space.md, paddingTop: t.space.xxl },
  noResultCard: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center', backgroundColor: t.scr.panel, borderWidth: 2, borderStyle: 'dashed', borderColor: t.scr.faint, marginBottom: t.space.sm },
  noResultTitle: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 0.5 },
  noResultSub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, textAlign: 'center', lineHeight: 16, maxWidth: 260 },

  // docked search tools
  tools: { flexDirection: 'row', alignItems: 'center', padding: t.space.md, backgroundColor: t.scr.panel, borderTopWidth: 1, borderTopColor: t.scr.hairline },
  fieldWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: t.space.md, backgroundColor: t.brand.cream, paddingHorizontal: t.space.md },
  field: { flex: 1 },
  clear: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.brand.navy, paddingHorizontal: t.space.sm },
}));
