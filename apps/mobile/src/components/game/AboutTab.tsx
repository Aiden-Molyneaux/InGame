import { type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { themedStyles } from '../../theme';
import { Avatar } from '../Avatar';
import { LoadError } from '../lifecycle/LoadError';
import { useGetGameDetailQuery } from '../../store/catalogRailsApi';
import { useGetFriendsWhoOwnQuery } from '../../store/friendApi';

// AboutTab (W-D1 · component-map §9 — the Game-page ABOUT tab) — the SHARED game-detail fill rendered
// IDENTICALLY across all three postures (OWN · FRIEND · CATALOG). Sourced from the W-C5 aggregate
// GET /catalog/games/:id (`gameDetailSchema`): the canonical facts (studio/publisher/release year) ·
// genre chips · CAT-05 contributor credit (→ the contributor screen) · CAT-09 PresenceStats (collections
// / friends-have) · the CAT-09c named friends-who-own list (rows → /user/:id). This replaces the OWN tab's
// old EXPECTED stub (game/[id].tsx) and is the W-C5 ABOUT client half.
//
// friends-who-own keeps the LIVE focused read (GET /catalog/games/:id/friends-who-own, CAT-09c) — the
// walk-signed section with its PROF-03 hours-gating + avatar rows — rather than re-render from
// gameDetail.friendsWhoOwn (the same cohort; the aggregate's copy is left unconsumed, a benign
// redundancy flagged for a later consolidation). suggest-edit (CAT-06) is EXPECTED — not built.
export function AboutTab({
  gameId,
  onViewContributor,
  onOpenUser,
  beforeFriends,
}: {
  gameId: string;
  /** CAT-05 — the contributor credit routes to the contributor profile (app-wide designer-tap). */
  onViewContributor: (userId: string) => void;
  /** CAT-09c — a friends-who-own row routes to that friend's profile. */
  onOpenUser: (userId: string) => void;
  /** W-D1 D-3 — an optional slot rendered AFTER the canonical game info and BEFORE the friends-who-own
   *  list. CATALOG passes its NOT-IN-YOUR-COLLECTION band here so the section order reads
   *  info → not-in-collection (+ ADD CTA) → friends-who-own. OWN/FRIEND omit it (no band). */
  beforeFriends?: ReactNode;
}) {
  const styles = useStyles();
  const { data, isLoading, isError, refetch } = useGetGameDetailQuery(gameId);

  if (isLoading) {
    return (
      <View style={styles.wrap} accessibilityLabel="Loading">
        <View style={[styles.sk, { width: '46%', height: 21, alignSelf: 'center' }]} />
        <View style={[styles.sk, { width: '64%', height: 11, alignSelf: 'center' }]} />
        <View style={[styles.sk, { width: '90%', height: 11 }]} />
        <View style={[styles.sk, { width: '80%', height: 11 }]} />
      </View>
    );
  }
  if (isError || !data) {
    return (
      <View style={styles.wrap}>
        <LoadError
          title="Couldn't load the game facts"
          message="This section didn't answer. Try again."
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  const year = data.releaseDate ? data.releaseDate.slice(0, 4) : null;
  const metaLine = [data.studio, year, data.genres[0]?.name]
    .filter((x) => x != null && x !== '')
    .join(' · ')
    .toUpperCase();

  return (
    <View style={styles.wrap}>
      {/* canonical facts */}
      <View style={styles.facts}>
        <Text style={styles.title}>{data.name}</Text>
        {metaLine ? <Text style={styles.meta}>{metaLine}</Text> : null}
      </View>

      {/* studio chip + genre chips (DISC-02) */}
      {data.studio || data.genres.length > 0 ? (
        <View style={styles.chips}>
          {data.studio ? (
            <View style={[styles.chip, styles.chipStudio]}>
              <Text style={styles.chipText}>▸ {data.studio.toUpperCase()}</Text>
            </View>
          ) : null}
          {data.genres.map((g) => (
            <View key={g.id} style={styles.chip}>
              <Text style={styles.chipText}>{g.name.toUpperCase()}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* CAT-05 contributor credit → the contributor profile */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Added to the catalog by ${data.contributor.username} — view contributions`}
        onPress={() => onViewContributor(data.contributor.userId)}
        style={({ pressed }) => [styles.credit, pressed && styles.creditPressed]}
      >
        <Text style={styles.creditText}>
          ADDED TO THE CATALOG BY <Text style={styles.creditName}>{data.contributor.username.toUpperCase()}</Text>
        </Text>
      </Pressable>

      {/* CAT-09 PresenceStats — collections + friends-have (the community-cards count reads in the CARDS tab) */}
      <View style={styles.presence}>
        <View style={styles.pstat}>
          <Text style={styles.pv}>{data.collectionsCount.toLocaleString('en-US')}</Text>
          <Text style={styles.pl}>IN COLLECTIONS</Text>
        </View>
        <View style={styles.pstat}>
          <Text style={[styles.pv, styles.pvGold]}>{data.friendsHaveCount.toLocaleString('en-US')}</Text>
          <Text style={styles.pl}>FRIENDS HAVE IT</Text>
        </View>
      </View>

      {/* W-D1 D-3 — the CATALOG not-in-collection band slots HERE: after the game info, before friends */}
      {beforeFriends}

      {/* CAT-09c — the named friends-who-own list (LIVE focused read) */}
      <FriendsWhoOwnSection gameId={gameId} onOpenUser={onOpenUser} />
    </View>
  );
}

// FriendsWhoOwn (P9 · CAT-09c) — the ABOUT-tab named list of friends who own this game (GET /catalog/
// games/:id/friends-who-own). Friend-gated + block-filtered server-side; PROF-03 hours-gating (a friend
// who hides hours has `hours` absent → the row omits the stat). A row → their profile (`/user/:id`).
// Migrated verbatim from game/[id].tsx (W-D1 — ABOUT is now shared across postures).
function FriendsWhoOwnSection({ gameId, onOpenUser }: { gameId: string; onOpenUser: (userId: string) => void }) {
  const styles = useStyles();
  const { data, isLoading } = useGetFriendsWhoOwnQuery(gameId);
  if (isLoading) return null; // a quiet no-op while loading (the facts above already carry the tab)
  const rows = data?.friendsWhoOwn ?? [];
  return (
    <View style={styles.fwoBlock}>
      <Text style={styles.fwoHead}>FRIENDS WHO OWN IT — {data?.count ?? 0}</Text>
      {rows.length === 0 ? (
        <Text style={styles.fwoEmpty}>None of your friends own this yet.</Text>
      ) : (
        <View style={styles.fwoList}>
          {rows.map((r) => (
            <Pressable
              key={r.userId}
              accessibilityRole="button"
              accessibilityLabel={`Open ${r.username}'s profile`}
              onPress={() => onOpenUser(r.userId)}
              style={({ pressed }) => [styles.fwoRow, pressed && styles.fwoRowPressed]}
            >
              <Avatar username={r.username} avatarUrl={r.avatarUrl} size={30} />
              <Text style={styles.fwoName} numberOfLines={1}>{r.username.toUpperCase()}</Text>
              <View style={styles.fwoSpacer} />
              {r.hours !== undefined ? <Text style={styles.fwoHours}>{r.hours.toLocaleString('en-US')} HRS</Text> : null}
              <Text style={styles.fwoChev}>›</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  wrap: { gap: t.space.lg },
  sk: { backgroundColor: t.scr.panel },
  facts: { gap: t.space.xs, alignItems: 'center' },
  title: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, textAlign: 'center', letterSpacing: 0.5 },
  meta: { fontFamily: t.font.screenSemi, fontSize: t.type.body, color: t.scr.dim, textAlign: 'center', letterSpacing: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, justifyContent: 'center' },
  chip: {
    borderWidth: 1,
    borderColor: t.scr.hairline,
    backgroundColor: t.scr.panelHi,
    paddingHorizontal: t.space.md,
    paddingVertical: 3,
    borderRadius: t.corner.screen, // F-07 square
  },
  chipStudio: { borderColor: t.scr.dim },
  chipText: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  credit: { alignSelf: 'center' },
  creditPressed: { opacity: 0.7 },
  creditText: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5, textAlign: 'center' },
  creditName: { fontFamily: t.font.screenBold, color: t.scr.ink },
  presence: { flexDirection: 'row', justifyContent: 'center', gap: t.space.xl },
  pstat: { alignItems: 'center', gap: 2 },
  pv: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 0.5 },
  pvGold: { color: t.scr.value },
  pl: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  // friends-who-own
  fwoBlock: { gap: t.space.sm },
  fwoHead: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2 },
  fwoEmpty: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.3 },
  fwoList: { gap: t.space.sm },
  fwoRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.md, paddingVertical: t.space.sm },
  fwoRowPressed: { opacity: 0.7 },
  fwoName: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.5, flexShrink: 1 },
  fwoSpacer: { flex: 1 },
  fwoHours: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  fwoChev: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.faint },
}));
