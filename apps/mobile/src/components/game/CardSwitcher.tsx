import { useMemo, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { CollectionItem } from '@ingame/shared';
import { CardFace, parseComposition } from '../CardFace';
import { ScreenButton } from '../ScreenButton';
import { EquipReadout } from './EquipReadout';
import { theme } from '../../theme';
import { steppedRectPath } from '../../theme/steppedPath';
import { useGetEntryCardsQuery, useUpdateEntryMutation } from '../../store/api';

// CardSwitcher (component-map §9 · CARD-24c/COL-06) — the CARDS tab: MY designs for THIS game from
// the switcher feed (GET /me/collection/:entryId/cards). The blank default face is IMPLICIT (owner
// gate-5 C.10): it is never listed as a tile and never counted — a game with no designs shows the
// design-nudge empty state instead. Tap-select (CARD-23 ACT-IN-PLACE) → inline options: SET AS MAIN /
// UNEQUIP (COL-06; unequip = back to the blank default) · EDIT IN STYLER (§3.2) · DELETE (0040 —
// confirm HOISTED to the page root so the sheet docks to the in-app bottom, gate-5 D.27; the worn
// design stays refused until unequipped, 409 CARD_EQUIPPED). ◆ marks the equipped tile as a glyph
// chip beside the status tag (gate-5 C.11). Community gallery + adopt stay M5.
const CELL_W = 120; // "a bit bigger" than /cell 96 (gate-5 C.10)
const CELL_H = 168;
const RING = 4;

type Row = {
  id: string;
  name: string;
  status: 'draft' | 'private' | 'published';
  composition: ReturnType<typeof parseComposition>;
  equipped: boolean;
};

export function CardSwitcher({
  entry,
  onEditInStyler,
  onDesignNew,
  onRequestDelete,
  deleteError,
  onClearDeleteError,
}: {
  entry: CollectionItem;
  onEditInStyler: (cardId: string) => void;
  onDesignNew: () => void;
  /** The 0040 confirm renders at the PAGE root (D.27) — the switcher only asks. */
  onRequestDelete: (cardId: string, name: string) => void;
  deleteError?: string | null;
  /** Selection changed — the page clears its delete error so it can't blame the wrong card. */
  onClearDeleteError?: () => void;
}) {
  const { data, isLoading } = useGetEntryCardsQuery(entry.entryId);
  const [updateEntry, equipState] = useUpdateEntryMutation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const rows = useMemo<Row[]>(
    () =>
      (data?.items ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status as Row['status'],
        composition: parseComposition(c.composition),
        equipped: entry.card.id === c.id,
      })),
    [data, entry],
  );

  const selected = rows.find((r) => r.id === selectedId) ?? rows.find((r) => r.equipped) ?? rows[0] ?? null;
  const count = rows.length; // real designs only — the implicit blank default is not a card (C.10)

  async function setMain(designId: string | null) {
    setInlineError(null);
    try {
      await updateEntry({ entryId: entry.entryId, activeCardDesignId: designId }).unwrap();
    } catch (e) {
      setInlineError(errMsg(e, 'Could not equip it. Try again.'));
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.scr.accent} accessibilityLabel="Loading your cards" />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.sectionRow}>
        <Text style={styles.sectionHead}>
          YOUR CARDS FOR {entry.title.toUpperCase()} — {count}
        </Text>
        {/* board `:610` draws ⇅ SORT in the head; ordering lands with the at-scale roster
            (CARD-17) — present-but-disabled, the surface's posture for deferred actions */}
        <Pressable accessibilityRole="button" accessibilityLabel="Sort your cards" accessibilityState={{ disabled: true }} disabled>
          <Text style={styles.sortLink}>⇅ SORT</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {rows.map((row) => {
          const sel = selected !== null && row.id === selected.id;
          return (
            <Pressable
              key={row.id}
              style={styles.cellWrap}
              accessibilityRole="button"
              accessibilityLabel={`Select ${row.name}`}
              accessibilityState={{ selected: sel }}
              onPress={() => {
                // CARD-23 ACT-IN-PLACE — select, never navigate; stale errors don't follow the
                // selection onto a different card (murr, gate-5 round 2)
                setSelectedId(row.id);
                setInlineError(null);
                onClearDeleteError?.();
              }}
            >
              {sel ? <SelectRing /> : null}
              <View style={[styles.tag, TAG_STYLE[row.status]]}>
                <Text style={[styles.tagText, TAG_TEXT[row.status]]}>{TAG_LABEL[row.status]}</Text>
              </View>
              {row.equipped ? (
                // the worn marker is a GLYPH chip, not a word — it coexists with the status tag (C.11)
                <View style={styles.wornChip} accessibilityLabel="Equipped">
                  <Text style={styles.wornGlyph}>◆</Text>
                </View>
              ) : null}
              <CardFace title={row.name} composition={row.composition} size="cell" width={CELL_W} height={CELL_H} />
            </Pressable>
          );
        })}

        {/* DESIGN NEW — gold dashed, card-creating (F-02) → the Styler (§3.2). */}
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

      {rows.length === 0 ? (
        <Text style={styles.emptyLine}>
          No cards designed yet — the blank default face is on duty until you make one.
        </Text>
      ) : selected ? (
        <View style={styles.opts}>
          <Text style={styles.optsTitle}>
            {selected.name} — {TAG_LABEL[selected.status]}
          </Text>
          <EquipReadout card={{ ...entry.card, isCustom: true }} composition={selected.composition} />
          <View style={styles.actions}>
            {selected.equipped ? (
              <ScreenButton
                label={equipState.isLoading ? '…' : 'Unequip'}
                variant="secondary"
                disabled={equipState.isLoading}
                onPress={() => void setMain(null)} // back to the implicit blank default (C.10)
                style={styles.miniBtn}
              />
            ) : (
              <ScreenButton
                label={equipState.isLoading ? '…' : 'Set as main'}
                variant="secondary"
                disabled={selected.status === 'draft' || equipState.isLoading}
                onPress={() => void setMain(selected.id)}
                style={styles.miniBtn}
              />
            )}
            <ScreenButton
              label="Edit in Styler"
              variant="secondary"
              onPress={() => onEditInStyler(selected.id)}
              style={styles.miniBtn}
            />
            <ScreenButton
              label="Delete"
              variant={selected.equipped ? 'secondary' : 'destructive'}
              disabled={selected.equipped}
              onPress={() => onRequestDelete(selected.id, selected.name)}
              style={styles.miniBtn}
            />
          </View>
          {selected.status === 'draft' ? (
            <Text style={styles.note}>A draft resumes in the Styler — finish it (KEEP or SAVE PRIVATE) to equip it.</Text>
          ) : selected.equipped ? (
            <Text style={styles.note}>Your shelf wears this card. Unequip it before deleting it.</Text>
          ) : null}
          {inlineError || deleteError ? <Text style={styles.err}>{inlineError ?? deleteError}</Text> : null}
        </View>
      ) : null}

      {/* community gallery + adopt — M5 (decision 0062 §2) */}
      <View style={styles.community}>
        <Text style={styles.communityText}>BROWSE THE COMMUNITY</Text>
        <Text style={styles.communityNote}>Adopt other players' cards — arrives in a later release.</Text>
      </View>
    </View>
  );
}

function errMsg(e: unknown, fallback: string): string {
  const err = (e as { data?: { error?: { message?: string } } })?.data?.error;
  return err?.message ?? fallback;
}

// SelectRing — the tap-select indicator (board `:207–209`): a thin accent STEPPED ring around the
// selected cell, via the shared F-02 stepped-path helper.
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

const TAG_LABEL: Record<Row['status'], string> = {
  draft: 'DRAFT',
  private: 'PRIVATE',
  published: 'PUBLISHED',
};
const TAG_STYLE: Record<Row['status'], object> = {
  draft: { backgroundColor: 'rgba(13,11,30,0.78)', borderWidth: 1, borderColor: theme.scr.hairline },
  private: { backgroundColor: theme.brand.cream },
  published: { backgroundColor: theme.brand.gold },
};
const TAG_TEXT: Record<Row['status'], object> = {
  draft: { color: theme.scr.dim },
  private: { color: theme.brand.navy },
  published: { color: theme.brand.goldInk },
};

const styles = StyleSheet.create({
  wrap: { gap: theme.space.lg },
  loading: { paddingVertical: theme.space.xxl, alignItems: 'center' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionHead: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1.5 },
  sortLink: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.faint, letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.lg },
  cellWrap: { width: CELL_W, height: CELL_H, position: 'relative' },
  tag: { position: 'absolute', top: 4, left: 4, zIndex: 3, paddingHorizontal: 4, paddingVertical: 2 },
  tagText: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, letterSpacing: 0.5 },
  wornChip: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 3,
    backgroundColor: theme.scr.accent,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  wornGlyph: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.accentInk },
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
  emptyLine: { fontFamily: theme.font.screen, fontSize: theme.type.body, color: theme.scr.faint, lineHeight: 16 },
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
  err: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.brand.alert },
  community: { padding: theme.space.lg, borderWidth: 1, borderColor: theme.scr.hairline, gap: theme.space.xs },
  communityText: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1.5 },
  communityNote: { fontFamily: theme.font.screen, fontSize: theme.type.micro, color: theme.scr.faint },
});
