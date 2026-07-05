import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { CollectionItem } from '@ingame/shared';
import { GameCard } from '../GameCard';
import { ScreenButton } from '../ScreenButton';
import { EquipReadout } from './EquipReadout';
import { theme } from '../../theme';
import { steppedRectPath } from '../../theme/steppedPath';

// CardSwitcher (component-map §9 · OQ-056/CARD-24) — the CARDS tab: your cards for THIS game (COL-06),
// state-tagged, tap-select with inline options. **SUBSTRATE-LIMITED (OQ-133):** with no card_designs
// feed the grid renders the ONE CARD-18 default card (client-derived from entry.card, EQUIPPED) + the
// DESIGN NEW tile. Multi-card SELECT / SET-AS-MAIN / DELETE / EDIT-IN-STYLER + the community gallery
// are structure-present, behaviour-EXPECTED (Styler §3.2 / M5). Board `:599–659`.
const CELL_W = 96;
const CELL_H = 134;
const RING = 4;

export function CardSwitcher({
  entry,
  onEditInStyler,
  onDesignNew,
}: {
  entry: CollectionItem;
  onEditInStyler: () => void;
  onDesignNew: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.sectionRow}>
        <Text style={styles.sectionHead}>YOUR CARDS FOR {entry.title.toUpperCase()} — 1</Text>
      </View>

      <View style={styles.grid}>
        {/* the equipped default card, selected (the lone card at M4) */}
        <View style={styles.cellWrap}>
          <SelectRing />
          <View style={styles.tag}>
            <Text style={styles.tagText}>◆ EQUIPPED</Text>
          </View>
          <GameCard title={entry.title} size="cell" />
        </View>

        {/* DESIGN NEW — gold dashed, card-creating (F-02). Target = the Styler (§3.2, EXPECTED). */}
        <Pressable
          style={styles.newTile}
          accessibilityRole="button"
          accessibilityLabel="Design a new card"
          onPress={onDesignNew}
        >
          <Text style={styles.newPlus}>＋</Text>
          <Text style={styles.newLabel}>DESIGN NEW</Text>
        </Pressable>
      </View>

      {/* the selected card's inline options (no drawer — surfaced on the screen) */}
      <View style={styles.opts}>
        <Text style={styles.optsTitle}>Your default {entry.title} card</Text>
        <EquipReadout card={entry.card} />
        <View style={styles.actions}>
          <ScreenButton label="Set as main" variant="secondary" disabled style={styles.miniBtn} />
          <ScreenButton label="Edit in Styler" variant="secondary" onPress={onEditInStyler} disabled style={styles.miniBtn} />
          {/* DELETE is a deferred, non-functional affordance at M4 (default card is non-deletable) — render
              it greyed like its siblings, NOT danger-red (which reads as actionable). It becomes the
              destructive variant once the card-delete substrate lands (OQ-133 · 0058 §7 · board `:625`). */}
          <ScreenButton label="Delete" variant="secondary" disabled style={styles.miniBtn} />
        </View>
        <Text style={styles.note}>
          More cards — and SET-AS-MAIN · EDIT-IN-STYLER · DELETE — arrive with the card editor and the
          card_designs store (Styler §3.2 · OQ-133). The default card is always your equipped MAIN
          (CARD-18) and can't be deleted.
        </Text>
      </View>

      {/* community gallery + adopt — the whole browse→adopt is M5 (decision 0062 §2) */}
      <View style={styles.community}>
        <Text style={styles.communityText}>BROWSE THE COMMUNITY</Text>
        <Text style={styles.communityNote}>Adopt other players' cards — arrives in M5.</Text>
      </View>
    </View>
  );
}

// SelectRing — the tap-select indicator (board `:207–209`): a thin accent STEPPED ring around the
// selected cell, via the shared F-02 stepped-path helper. At M4 the lone card is always selected.
function SelectRing() {
  const w = CELL_W + RING * 2;
  const h = CELL_H + RING * 2;
  return (
    <Svg width={w} height={h} style={[StyleSheet.absoluteFill, { left: -RING, top: -RING }]} pointerEvents="none">
      <Path
        d={steppedRectPath(w, h, theme.step / 2, { tl: true, br: true })}
        fill="none"
        stroke={theme.scr.accent}
        strokeWidth={2}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.space.lg },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionHead: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.lg },
  cellWrap: { width: CELL_W, height: CELL_H, position: 'relative' },
  tag: {
    position: 'absolute',
    top: 4,
    left: 4,
    zIndex: 3,
    backgroundColor: theme.scr.accent,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  tagText: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.accentInk, letterSpacing: 0.5 },
  newTile: {
    width: CELL_W,
    height: CELL_H,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.scr.accent,
    backgroundColor: 'rgba(255,159,67,0.05)',
  },
  newPlus: { fontFamily: theme.font.screenBold, fontSize: theme.type.display, color: theme.scr.accent },
  newLabel: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.accent, letterSpacing: 1 },
  opts: {
    padding: theme.space.lg,
    backgroundColor: theme.scr.panel,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    gap: theme.space.md,
  },
  optsTitle: { fontFamily: theme.font.screenBold, fontSize: theme.type.body, color: theme.scr.ink, letterSpacing: 0.5 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  miniBtn: { paddingVertical: theme.space.md, paddingHorizontal: theme.space.md },
  note: { fontFamily: theme.font.screen, fontSize: theme.type.micro, color: theme.scr.faint, lineHeight: 15 },
  community: {
    padding: theme.space.lg,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    gap: theme.space.xs,
  },
  communityText: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1.5 },
  communityNote: { fontFamily: theme.font.screen, fontSize: theme.type.micro, color: theme.scr.faint },
});
