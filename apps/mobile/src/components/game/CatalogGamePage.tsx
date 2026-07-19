import { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { CommunityGallery } from './CommunityGallery';
import { AboutTab } from './AboutTab';
import { GameTabDock, type GameSection } from './GameTabDock';
import { ScreenButton } from '../ScreenButton';
import { TertiaryLink } from '../TertiaryLink';
import { Toast } from '../lifecycle/Toast';
import { themedStyles } from '../../theme';
import { useAddToCollectionMutation } from '../../store/api';
import { useAddQueueItemMutation } from '../../store/queueApi';
import { SCREEN_HEADER_PAD, RETURN_SEAM_PAD } from '../ScreenHead';

// CatalogGamePage (W-D1 · game-page board M6) — the CATALOG posture of the adaptive Game page: a game you
// DON'T own and reached WITHOUT friend context (Discover / friendsWhoOwn / the Add-Game INSPECT chevron).
//
//   PLAY  — LOCKED (an inline padlock on the dock); not a reachable tab until you own it. Default = ABOUT.
//   CARDS — the COMMUNITY GALLERY, BROWSE-ONLY (Q4 — NO adopt: you can't adopt a card for a game you don't
//           own; adoption routes through Add-Game, W-C10). `canAdopt={false}` makes the adopt path
//           STRUCTURALLY absent — the sheet is never mountable here. Empty gallery → the be-first door
//           (DESIGN THE FIRST CARD, gold/card-creating, CAT-05).
//   ABOUT — the shared game-detail fill (identical to OWN/FRIEND). D-3: the NOT-IN-YOUR-COLLECTION band
//           rides AboutTab's `beforeFriends` slot, so the order reads info → the band (+ ADD/UP-NEXT) →
//           friends-who-own. The band renders in AboutTab's loading/error branches too (F1), so the key
//           action (ADD TO COLLECTION) is never lost to a facts-fetch failure.
//
// ADD TO COLLECTION is the GOLD stepped `add` grammar (F-02, matching the Add-Game rail — owner
// reversed the D-4 orange→gold 2026-07-19). On
// success the resolver's Collection re-read lands `myEntry` → the page UPGRADES IN PLACE to OWN at the
// same URL (§1). UP NEXT adds the game to the WTP queue as a wishlist item (WTP-02, source='discovery').
export function CatalogGamePage({ gameId }: { gameId: string }) {
  const router = useRouter();
  const styles = useStyles();

  const [addToCollection, addState] = useAddToCollectionMutation();
  const [addQueueItem, queueState] = useAddQueueItemMutation();
  const [section, setSection] = useState<GameSection>('about'); // ABOUT default; PLAY is locked
  const [queued, setQueued] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setSection('about');
    setQueued(false);
    setToast(null);
  }, [gameId]);

  async function onAdd() {
    try {
      // On success the resolver refetches Collection → entry resolves → this unmounts, OWN mounts.
      await addToCollection({ gameId }).unwrap();
    } catch {
      setToast({ tone: 'error', message: 'Couldn’t add this to your collection right now.' });
    }
  }
  async function onUpNext() {
    try {
      await addQueueItem({ gameId, source: 'discovery' }).unwrap();
      setQueued(true);
    } catch (e) {
      const code = (e as { data?: { error?: { code?: string } } })?.data?.error?.code;
      setToast({
        tone: 'error',
        message: code === 'LIST_FULL' ? 'Your Up Next list is full.' : 'Couldn’t add to Up Next right now.',
      });
    }
  }

  return (
    <View style={styles.flex}>
      <View style={styles.screen}>
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">GAME</Text>
        </View>
        <View style={styles.retlink}>
          <TertiaryLink label="Return to collection" chevron="leading-back" onPress={() => router.back()} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {section === 'cards' ? (
            // BROWSE-ONLY (Q4) — no adopt path; the be-first door (DESIGN THE FIRST CARD) survives for an empty gallery.
            <CommunityGallery
              gameId={gameId}
              canAdopt={false}
              onInspect={() => {}}
              onDesignACard={() => router.push(`/styler/${gameId}`)}
              onViewDesigner={(userId) => router.push(`/contributor/${userId}`)}
            />
          ) : (
            // W-D1 D-3 — the ABOUT order reads info → NOT-IN-COLLECTION band → friends-who-own: the band
            // rides AboutTab's `beforeFriends` slot (was pinned above the whole tab). The ADD CTA sits
            // right under the game facts, still above the fold and never hidden behind a tab.
            <AboutTab
              gameId={gameId}
              onViewContributor={(userId) => router.push(`/contributor/${userId}`)}
              onOpenUser={(userId) => router.push(`/user/${userId}`)}
              beforeFriends={
                <View style={styles.band}>
                  <Text style={styles.bandHead}>NOT IN YOUR COLLECTION</Text>
                  <Text style={styles.bandSub}>Add it to track your play, design its card, and compare with friends.</Text>
                  <View style={styles.bandActions}>
                    {/* W-D1 D-4 (owner reversed orange→gold 2026-07-19) — ADD TO COLLECTION now wears the
                        GOLD stepped `add` grammar (F-02 gold + intrinsic steppedRectPath), matching the
                        Add-Game rail's ADD exactly (the D-4 orange /primary is retired). */}
                    <ScreenButton
                      label={addState.isLoading ? 'Adding…' : '+ Add to collection'}
                      variant="add"
                      onPress={() => void onAdd()}
                      disabled={addState.isLoading}
                      block
                    />
                    <ScreenButton
                      label={queued ? 'On your Up Next ✓' : queueState.isLoading ? 'Adding…' : '+ Up Next'}
                      variant="secondary"
                      onPress={() => void onUpNext()}
                      disabled={queued || queueState.isLoading}
                      block
                    />
                  </View>
                </View>
              }
            />
          )}
        </ScrollView>

        {/* PLAY locked (board M6/M8) — an inline padlock; not reachable until you own the game */}
        <GameTabDock value={section} onChange={setSection} lockPlay />
      </View>

      {toast ? <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} /> : null}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: t.scr.bg },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...SCREEN_HEADER_PAD },
  title: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.ink, letterSpacing: 1.5 },
  retlink: { ...RETURN_SEAM_PAD },
  body: { paddingHorizontal: t.space.lg, paddingBottom: t.space.xl, gap: t.space.lg },

  band: {
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    padding: t.space.lg,
    gap: t.space.md,
  },
  bandHead: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.ink, letterSpacing: 1 },
  bandSub: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.dim, lineHeight: 16 },
  bandActions: { gap: t.space.md },
}));
