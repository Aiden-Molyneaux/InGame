import { useState, type ReactNode } from 'react';
import { View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenHead, SCREEN_HEADER_PAD, RETURN_SEAM_PAD } from '../src/components/ScreenHead';
import { TertiaryLink } from '../src/components/TertiaryLink';
import { Skeleton, LoadError, EmptyState } from '../src/components/lifecycle';
import { RankingsBoard, useFriendRankings, type RankingsMetric } from '../src/components/social/FriendRankings';
import { themedStyles } from '../src/theme';

// THE RANKINGS page (walk-5 relocation) — the whole-circle ladder that used to sit at the foot of the
// Compare screen. Reached from the Friends tab's door-row. Read-only; NON-COMMERCE (no gold, F-02).
//
// Route name: `/friends-rankings`, a sibling of `/friends-roster` — deliberately, so ShellNav's existing
// `pathname.startsWith('/friends')` predicate lights the FRIENDS keycap with no ShellNav edit.
export default function FriendsRankings() {
  const router = useRouter();
  const { rows, isLoading, isError, refetch, hasFriends } = useFriendRankings();
  const [metric, setMetric] = useState<RankingsMetric>('hours');

  return (
    <Frame onBack={() => router.back()}>
      {isLoading ? (
        <Skeleton variant="text-lines" lines={6} />
      ) : isError ? (
        <LoadError
          message="Couldn't load the rankings. Check your connection and try again."
          onRetry={() => void refetch()}
        />
      ) : !hasFriends || rows.length === 0 ? (
        <EmptyState
          title="No rankings yet"
          message="Rankings need a circle — add a few friends and the ladder fills in."
          actionLabel="Find friends"
          onAction={() => router.push('/add-friends')}
        />
      ) : (
        <RankingsBoard
          rows={rows}
          metric={metric}
          onMetric={setMetric}
          onOpenUser={(userId) => router.push(`/user/${userId}`)}
          title="Your circle"
        />
      )}
    </Frame>
  );
}

function Frame({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.screen}>
      <View style={styles.pad}>
        <ScreenHead title="Rankings" />
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
  pad: { ...SCREEN_HEADER_PAD },
  retlink: { ...RETURN_SEAM_PAD },
  body: { paddingHorizontal: t.space.xl, paddingBottom: t.space.xxl },
}));
