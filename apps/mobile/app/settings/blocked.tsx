import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import type { BlockedPerson } from '@ingame/shared';
import { ScreenHead, SCREEN_HEADER_PAD, RETURN_SEAM_PAD } from '../../src/components/ScreenHead';
import { TertiaryLink } from '../../src/components/TertiaryLink';
import { ScreenButton } from '../../src/components/ScreenButton';
import { ConfirmSheet } from '../../src/components/ConfirmSheet';
import { Avatar } from '../../src/components/Avatar';
import { Skeleton, LoadError, Offline } from '../../src/components/lifecycle';
import { themedStyles, useTheme } from '../../src/theme';
import { resolveMediaUrl } from '../../src/store/mediaUrl';
import { useGetBlocksQuery, useUnblockUserMutation } from '../../src/store/settingsApi';

// BLOCKED users (SOC-09 · settings-states S6 · 0076 §0.10) — the actor's own blocked list + unblock. This
// is the MOD-09 non-disclosure's LONE exception: the one place a blocked relationship is disclosed, to the
// blocker themselves. UNBLOCK routes through the decision-0040 `ConfirmSheet` (calm/restorative — not red).
// `refetchOnMountOrArgChange`: a block done in a report/profile context invalidates CommunityCards, not
// Blocks (communityApi's blockUser predates the tag), so re-fetch on open to stay fresh (manifest A4).
export default function Blocked() {
  const router = useRouter();
  const styles = useStyles();
  const t = useTheme();
  const { data, isLoading, isError, refetch } = useGetBlocksQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [unblock, unblockState] = useUnblockUserMutation();
  const [target, setTarget] = useState<BlockedPerson | null>(null);

  async function doUnblock() {
    if (!target) return;
    try {
      await unblock(target.userId).unwrap();
    } catch {
      // SYS-10 — offline/transient: the list is unchanged; the sheet closes and the row stays. A dedicated
      // error Toast is owed with the P8 friends sweep (no Toast host on this lean page yet).
    }
    setTarget(null);
  }

  const blocks = data?.blocks ?? [];

  return (
    <View style={styles.screen}>
      <View style={styles.pad}>
        <ScreenHead title="Blocked" />
      </View>
      {/* W-B2 — the return seam is a FIXED row (the app-wide seam grammar). */}
      <View style={styles.retlink}>
        <TertiaryLink label="Return to settings" chevron="leading-back" onPress={() => router.back()} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* the calm contract note (SOC-09 · MOD-09 — silent) */}
        <View style={styles.note}>
          <Svg width={15} height={15} viewBox="0 0 15 15" style={styles.noteIcon}>
            <Circle cx={7.5} cy={7.5} r={5.4} fill="none" stroke={t.scr.accent} strokeWidth={1.3} />
            <Path d="M3.7 3.7l7.6 7.6" stroke={t.scr.accent} strokeWidth={1.3} />
          </Svg>
          <Text style={styles.noteText}>
            Blocked people can’t find you, message you, or see your profile — and you won’t see them.{' '}
            <Text style={styles.noteStrong}>They’re never told.</Text>
          </Text>
        </View>

        {isLoading ? (
          <Skeleton variant="tile-row" />
        ) : isError ? (
          <LoadError onRetry={() => refetch()} />
        ) : (
          <>
            {blocks.length === 0 ? (
              <Text style={styles.empty}>No one blocked. People you block will appear here.</Text>
            ) : (
              <View style={styles.group}>
                {blocks.map((b, i) => (
                  <View key={b.userId} style={[styles.row, i > 0 && styles.rowDivided]}>
                    <Avatar username={b.username} avatarUrl={resolveMediaUrl(b.avatarUrl)} avatarConfig={b.avatarConfig} size={34} />
                    <View style={styles.meta}>
                      <Text style={styles.name}>{b.username.toUpperCase()}</Text>
                      <Text style={styles.date}>BLOCKED {formatBlockedAt(b.blockedAt)}</Text>
                    </View>
                    <ScreenButton
                      label="Unblock"
                      variant="secondary"
                      size="mini"
                      onPress={() => setTarget(b)}
                      accessibilityLabel={`Unblock ${b.username}`}
                    />
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <ConfirmSheet
        visible={target !== null}
        title={`Unblock ${target?.username ?? ''}?`}
        message={`${target?.username ?? 'They'} will be able to find you and see your public profile again. You can block them again any time.`}
        confirmLabel="Unblock"
        tone="primary" // restorative — the calm accent confirm, not the red /destructive voice (S6 cream key)
        busy={unblockState.isLoading}
        onConfirm={() => void doUnblock()}
        onClose={() => setTarget(null)}
      />
    </View>
  );
}

// The block date — a short "MMM D" from the ISO stamp (board "BLOCKED JUN 9").
function formatBlockedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    .toUpperCase();
}

const useStyles = themedStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.scr.bg },
  pad: { ...SCREEN_HEADER_PAD },
  retlink: { ...RETURN_SEAM_PAD }, // W-B2
  scroll: { flex: 1 },
  body: { paddingHorizontal: t.space.lg, paddingBottom: t.space.lg, gap: t.space.lg }, // W-B2 — top pad dropped
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: t.space.md,
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    padding: t.space.lg,
  },
  noteIcon: { marginTop: 1 },
  noteText: { flex: 1, fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.3, lineHeight: 14 },
  noteStrong: { color: t.scr.ink },
  empty: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.faint, textAlign: 'center', paddingVertical: t.space.xxl },
  group: { backgroundColor: t.scr.panel, borderWidth: 1, borderColor: t.scr.hairline },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space.lg, paddingHorizontal: t.space.lg, paddingVertical: t.space.md },
  rowDivided: { borderTopWidth: 1, borderTopColor: t.scr.hairline },
  meta: { flex: 1, gap: 2 },
  name: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.5 },
  date: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
}));
