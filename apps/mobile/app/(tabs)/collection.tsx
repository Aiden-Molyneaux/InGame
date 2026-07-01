import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { ScreenHead } from '../../src/components/ScreenHead';
import { SectionSwitch } from '../../src/components/SectionSwitch';
import { GameCard } from '../../src/components/GameCard';
import { theme } from '../../src/theme';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { setCollectionView, type CollectionView } from '../../src/store/prefsSlice';
import { SEED_COLLECTION, COLLECTION_TOTAL, type SeedGame } from '../../src/data/seed';

// The seeded STYLED Collection shelf (the tangible-win render). The always-visible view-switch (SHELF ·
// GRID · LIST · TOP — COL-07/COL-13) is bound to the redux-persisted pref (F20) and DOCKED in the
// bottom tools bar (mockup `.tools`, `border-top`) — fix #5 / C1. Data is scratch-seeded (the real
// /me/collection + the sort/filter drawer ride M3). The aesthetic follows the tokens + F-rules.

const VIEW_OPTIONS: { value: CollectionView; label: string }[] = [
  { value: 'shelf', label: 'Shelf' },
  { value: 'grid', label: 'Grid' },
  { value: 'list', label: 'List' },
  { value: 'top', label: 'Top' },
];

export default function Collection() {
  const dispatch = useAppDispatch();
  const view = useAppSelector((s) => s.prefs.collectionView);

  return (
    <View style={styles.screen}>
      <View style={styles.pad}>
        <ScreenHead title="Collection" count={`${SEED_COLLECTION.length} OF ${COLLECTION_TOTAL}`} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        {view === 'list' ? <ListView /> : view === 'top' ? <TopView /> : <ShelfView size={view} />}
      </ScrollView>
      {/* bottom tools bar — the docked view-switch (fix #5 / C1); border-top per the mockup `.tools` */}
      <View style={styles.tools}>
        <SectionSwitch options={VIEW_OPTIONS} value={view} onChange={(v) => dispatch(setCollectionView(v))} />
      </View>
    </View>
  );
}

function ShelfView({ size }: { size: CollectionView }) {
  const cardSize = size === 'grid' ? 'cell' : 'grid';
  return (
    <View style={styles.wrap}>
      {SEED_COLLECTION.map((g) => (
        <GameCard key={g.entryId} title={g.title} size={cardSize} nowPlaying={g.nowPlaying} foil={g.foil} />
      ))}
    </View>
  );
}

function ListView() {
  return (
    <View style={styles.list}>
      {SEED_COLLECTION.map((g) => (
        <Row key={g.entryId} game={g} />
      ))}
    </View>
  );
}

function Row({ game }: { game: SeedGame }) {
  return (
    <View style={styles.row}>
      <GameCard title={game.title} size="mini" nowPlaying={game.nowPlaying} foil={game.foil} />
      <View style={styles.rowMeta}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {game.title}
        </Text>
        <Text style={styles.rowSub}>
          {game.hours}H · {game.status.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

function TopView() {
  const top = [...SEED_COLLECTION].sort((a, b) => b.hours - a.hours).slice(0, 10);
  return (
    <View style={styles.list}>
      {top.map((g, i) => (
        <View key={g.entryId} style={[styles.topRow, i === 0 && styles.topRowFirst]}>
          <Text style={[styles.rank, i === 0 && styles.rankFirst]}>#{i + 1}</Text>
          <GameCard title={g.title} size={i === 0 ? 'cell' : 'mini'} foil={g.foil} />
          <View style={styles.rowMeta}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {g.title}
            </Text>
            <Text style={styles.rowSub}>{g.hours}H</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.scr.bg },
  pad: { paddingHorizontal: theme.space.lg, paddingTop: theme.space.lg, paddingBottom: theme.space.md },
  scroll: { flex: 1 },
  body: { padding: theme.space.lg, gap: theme.space.lg },
  tools: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    borderTopWidth: 1,
    borderTopColor: theme.scr.hairline,
    backgroundColor: theme.scr.bg,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.lg, justifyContent: 'space-between' },
  list: { gap: theme.space.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.lg,
    backgroundColor: theme.scr.panel,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    padding: theme.space.md,
  },
  rowMeta: { flex: 1, gap: 1 },
  rowTitle: { fontFamily: theme.font.screenSemi, fontSize: theme.type.title, color: theme.scr.ink },
  rowSub: { fontFamily: theme.font.screen, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.lg,
    backgroundColor: theme.scr.panel,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    padding: theme.space.md,
  },
  topRowFirst: { borderColor: theme.scr.accent },
  rank: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.scr.dim, width: 30 },
  rankFirst: { color: theme.brand.gold, fontSize: theme.type.display },
});
