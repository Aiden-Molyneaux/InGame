import { type ReactNode } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { TertiaryLink } from '../TertiaryLink';
import { ScreenButton } from '../ScreenButton';
import { Skeleton } from '../lifecycle/Skeleton';
import { LoadError } from '../lifecycle/LoadError';
import { Unavailable } from '../lifecycle/Unavailable';
import { themedStyles } from '../../theme';
import { SCREEN_HEADER_PAD, RETURN_SEAM_PAD } from '../ScreenHead';

// Shared chrome for the two CAT-07 VIEW ALL full-lists (/contributor/[id]/cards · /games — W-1). The
// routes own the RTK hooks + the useContributorPaging accumulation (clean inference); this owns the
// frame (header · Return-to-contributions seam · scroll), the L1 / 404 / 403 / L2 lifecycle, the empty
// read, and the Load-more seam. PROF-03: a 403 renders the honest friends-only lock (the parent's
// limited posture), not a retry.
export function ContributorViewAll({
  title,
  onBack,
  isLoading,
  isError,
  errorStatus,
  onRetry,
  isEmpty,
  emptyMessage,
  hasMore,
  moreError,
  loadingMore,
  onLoadMore,
  children,
}: {
  title: string;
  onBack: () => void;
  isLoading: boolean;
  isError: boolean;
  errorStatus?: unknown;
  onRetry: () => void;
  isEmpty: boolean;
  emptyMessage: string;
  hasMore: boolean;
  moreError: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  children: ReactNode; // the rendered rows
}) {
  const styles = useStyles();

  if (isLoading) {
    return (
      <Frame title={title} onBack={onBack}>
        <Skeleton variant="card-cell" count={4} />
      </Frame>
    );
  }
  // MOD-09 non-disclosure — a 404 collapses to the terminal Unavailable (never leaks WHICH).
  if (isError && errorStatus === 404) {
    return (
      <Frame title={title} onBack={onBack}>
        <Unavailable message="This contributor isn't available." onBack={onBack} />
      </Frame>
    );
  }
  // PROF-03 — the VIEW ALL detail is friend-only. A non-friend (or a friendship that changed after the
  // parent screen loaded) sees the honest friends-only lock — the parent's limited posture — not a retry.
  if (isError && errorStatus === 403) {
    return (
      <Frame title={title} onBack={onBack}>
        <Unavailable title="Friends only" message="This list is only visible to friends." onBack={onBack} />
      </Frame>
    );
  }
  if (isError) {
    return (
      <Frame title={title} onBack={onBack}>
        <LoadError message="Couldn't load this list. Check your connection and try again." onRetry={onRetry} />
      </Frame>
    );
  }

  return (
    <Frame title={title} onBack={onBack}>
      {isEmpty ? (
        <Text style={styles.empty}>{emptyMessage}</Text>
      ) : (
        <>
          {children}
          {hasMore ? (
            <View style={styles.loadMore}>
              {moreError ? <Text style={styles.moreErr}>Couldn&apos;t load more — try again.</Text> : null}
              <ScreenButton
                label={loadingMore ? 'Loading…' : 'Load more'}
                variant="secondary"
                onPress={onLoadMore}
                disabled={loadingMore}
              />
            </View>
          ) : (
            <Text style={styles.end}>That&apos;s everything.</Text>
          )}
        </>
      )}
    </Frame>
  );
}

// The shared screen frame (mirrors the contributor + friend-collection routes): fixed title band, the
// Return-to-contributions back-seam, then the scroll. VIEW ALL is always reached FROM the contributor
// screen, so the back-seam always returns there.
function Frame({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.flex}>
      <View style={styles.screen}>
        <View style={styles.head}>
          <Text style={styles.headTitle} accessibilityRole="header" numberOfLines={1}>
            {title.toUpperCase()}
          </Text>
        </View>
        <View style={styles.retlink}>
          <TertiaryLink label="Contributions" chevron="leading-back" onPress={onBack} />
        </View>
        <ScrollView style={styles.flex} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: t.scr.bg },
  head: { ...SCREEN_HEADER_PAD },
  headTitle: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 1.5 },
  retlink: { ...RETURN_SEAM_PAD },
  body: { paddingHorizontal: t.space.lg, paddingBottom: t.space.xxl, gap: t.space.lg },

  empty: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.faint, textAlign: 'center', paddingVertical: t.space.xl },

  loadMore: { alignItems: 'center', gap: t.space.md, marginTop: t.space.md },
  moreErr: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.dim, textAlign: 'center', letterSpacing: 0.5 },
  end: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.faint, textAlign: 'center', letterSpacing: 0.5, marginTop: t.space.md },
}));
