import { useMemo, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { CollectionItem } from '@ingame/shared';
import { CardFace, parseComposition } from '../CardFace';
import { ScreenButton } from '../ScreenButton';
import { ConfirmSheet } from '../ConfirmSheet';
import { EquipReadout } from './EquipReadout';
import { theme } from '../../theme';
import { steppedRectPath } from '../../theme/steppedPath';
import { useGetEntryCardsQuery, useUpdateEntryMutation, useDeleteCardMutation } from '../../store/api';

// CardSwitcher (component-map §9 · CARD-24c/COL-06) — the CARDS tab: MY designs for THIS game from
// the real switcher feed (GET /me/collection/:entryId/cards — LIVE as of decision 0066; the §3.1
// default-only interim is retired). Tap-select (CARD-23 ACT-IN-PLACE) → inline options: SET AS MAIN
// (equip, private|published only) · EDIT IN STYLER (the §3.2 route) · DELETE (0040 ConfirmSheet; the
// equipped design is refused server-side with 409 CARD_EQUIPPED and disabled here). The DEFAULT face
// is always present as the un-equip target (CARD-18). Community gallery + adopt stay M5.
const CELL_W = 96;
const CELL_H = 134;
const RING = 4;

type Row = {
  id: string; // 'default' or the design id
  name: string;
  status: 'default' | 'draft' | 'private' | 'published';
  composition: ReturnType<typeof parseComposition>;
  equipped: boolean;
};

export function CardSwitcher({
  entry,
  onEditInStyler,
  onDesignNew,
}: {
  entry: CollectionItem;
  onEditInStyler: (cardId: string) => void;
  onDesignNew: () => void;
}) {
  const { data, isLoading } = useGetEntryCardsQuery(entry.entryId);
  const [updateEntry, equipState] = useUpdateEntryMutation();
  const [deleteCard, deleteState] = useDeleteCardMutation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const rows = useMemo<Row[]>(() => {
    const designs: Row[] = (data?.items ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      composition: parseComposition(c.composition),
      equipped: entry.card.id === c.id,
    }));
    // The DEFAULT face rides the roster as the CARD-18 fallback / un-equip target.
    const def: Row = {
      id: 'default',
      name: entry.title,
      status: 'default',
      composition: null,
      equipped: entry.card.id === 'default',
    };
    return [def, ...designs];
  }, [data, entry]);

  const selected = rows.find((r) => r.id === selectedId) ?? rows.find((r) => r.equipped) ?? rows[0]!;
  const count = rows.length;

  async function setAsMain(row: Row) {
    setInlineError(null);
    try {
      await updateEntry({
        entryId: entry.entryId,
        activeCardDesignId: row.id === 'default' ? null : row.id,
      }).unwrap();
    } catch (e) {
      setInlineError(errMsg(e, 'Could not equip it. Try again.'));
    }
  }

  async function doDelete(designId: string) {
    setInlineError(null);
    try {
      await deleteCard(designId).unwrap();
      setConfirmDeleteId(null);
      if (selectedId === designId) setSelectedId(null);
    } catch (e) {
      setConfirmDeleteId(null);
      setInlineError(errMsg(e, 'Could not delete it.'));
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.scr.accent} accessibilityLabel="Loading your cards" />
      </View>
    );
  }

  const confirmTarget = rows.find((r) => r.id === confirmDeleteId);

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
          const sel = row.id === selected.id;
          return (
            <Pressable
              key={row.id}
              style={styles.cellWrap}
              accessibilityRole="button"
              accessibilityLabel={`Select ${row.name}`}
              accessibilityState={{ selected: sel }}
              onPress={() => setSelectedId(row.id)} // CARD-23 ACT-IN-PLACE — select, never navigate
            >
              {sel ? <SelectRing /> : null}
              <View style={[styles.tag, TAG_STYLE[row.equipped ? 'equipped' : row.status]]}>
                <Text style={[styles.tagText, TAG_TEXT[row.equipped ? 'equipped' : row.status]]}>
                  {row.equipped ? '◆ EQUIPPED' : TAG_LABEL[row.status]}
                </Text>
              </View>
              <CardFace title={row.name} composition={row.composition} size="cell" />
            </Pressable>
          );
        })}

        {/* DESIGN NEW — gold dashed, card-creating (F-02) → the Styler (§3.2, LIVE). */}
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
        <Text style={styles.optsTitle}>
          {selected.id === 'default'
            ? `The default ${entry.title} face`
            : `${selected.name} — ${TAG_LABEL[selected.status]}`}
        </Text>
        <EquipReadout
          card={selected.id === 'default' ? { ...entry.card, isCustom: false } : { ...entry.card, isCustom: true }}
          composition={selected.composition}
        />
        <View style={styles.actions}>
          <ScreenButton
            label={equipState.isLoading ? '…' : 'Set as main'}
            variant="secondary"
            disabled={selected.equipped || selected.status === 'draft' || equipState.isLoading}
            onPress={() => void setAsMain(selected)}
            style={styles.miniBtn}
          />
          <ScreenButton
            label="Edit in Styler"
            variant="secondary"
            disabled={selected.id === 'default'}
            onPress={() => selected.id !== 'default' && onEditInStyler(selected.id)}
            style={styles.miniBtn}
          />
          <ScreenButton
            label="Delete"
            variant={selected.equipped || selected.id === 'default' ? 'secondary' : 'destructive'}
            disabled={selected.equipped || selected.id === 'default' || deleteState.isLoading}
            onPress={() => setConfirmDeleteId(selected.id)}
            style={styles.miniBtn}
          />
        </View>
        {selected.status === 'draft' ? (
          <Text style={styles.note}>A draft resumes in the Styler — finish it (KEEP or SAVE PRIVATE) to equip it.</Text>
        ) : selected.equipped && selected.id !== 'default' ? (
          <Text style={styles.note}>Your shelf wears this card. Equip another before deleting it.</Text>
        ) : null}
        {inlineError ? <Text style={styles.err}>{inlineError}</Text> : null}
      </View>

      {/* community gallery + adopt — M5 (decision 0062 §2) */}
      <View style={styles.community}>
        <Text style={styles.communityText}>BROWSE THE COMMUNITY</Text>
        <Text style={styles.communityNote}>Adopt other players' cards — arrives in a later release.</Text>
      </View>

      <ConfirmSheet
        visible={confirmDeleteId !== null}
        title="Delete this card?"
        message={`"${confirmTarget?.name ?? ''}" is deleted everywhere — the switcher and your designs shelf. This can't be undone.`}
        confirmLabel="Delete"
        busy={deleteState.isLoading}
        onConfirm={() => confirmDeleteId && void doDelete(confirmDeleteId)}
        onClose={() => setConfirmDeleteId(null)}
      />
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
  default: 'DEFAULT',
  draft: 'DRAFT',
  private: 'PRIVATE',
  published: 'PUBLISHED',
};
const TAG_STYLE: Record<'equipped' | Row['status'], object> = {
  equipped: { backgroundColor: theme.scr.accent },
  default: { backgroundColor: theme.scr.panelHi },
  draft: { backgroundColor: 'rgba(13,11,30,0.78)', borderWidth: 1, borderColor: theme.scr.hairline },
  private: { backgroundColor: theme.brand.cream },
  published: { backgroundColor: theme.brand.gold },
};
const TAG_TEXT: Record<'equipped' | Row['status'], object> = {
  equipped: { color: theme.scr.accentInk },
  default: { color: theme.scr.dim },
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
  err: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.brand.alert },
  community: { padding: theme.space.lg, borderWidth: 1, borderColor: theme.scr.hairline, gap: theme.space.xs },
  communityText: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1.5 },
  communityNote: { fontFamily: theme.font.screen, fontSize: theme.type.micro, color: theme.scr.faint },
});
