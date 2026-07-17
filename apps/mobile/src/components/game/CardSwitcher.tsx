import { useMemo, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { CollectionItem } from '@ingame/shared';
import { CardFace, parseComposition } from '../CardFace';
import { FlatCardImage } from './FlatCardImage';
import { ScreenButton } from '../ScreenButton';
import { EquipReadout } from './EquipReadout';
import { themedStyles, useTheme } from '../../theme';
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
// CR-22 (gate-5): revert 2-up → 3-up. CELL_W=120 came from gate-5 C.10/C.11 ("a bit bigger" cells)
// but wrapped 2-per-row on a ~390pt phone; the owner wants 3-up, so this re-tensions toward smaller
// cells. 96 (with the space.lg grid gap) lays three across; height keeps the ~1.4 card ratio.
const CELL_W = 96;
const CELL_H = 134;
const RING = 4;

// A switcher row is either one of MY designs (composition rides — renders live) or a card I ADOPTED
// (COL-06/decision 0072 — foreign-owned, so it renders from the FLATTENED image + designer attribution,
// never the private layers; CARD-15). Discriminated by `origin`, mirroring the wire shape.
type OwnedRow = {
  origin: 'owned';
  id: string;
  name: string;
  status: 'draft' | 'private' | 'published';
  composition: ReturnType<typeof parseComposition>;
  equipped: boolean;
};
type AdoptedRow = {
  origin: 'adopted';
  id: string;
  name: string;
  designer: string;
  imageUrl: string | null;
  equipped: boolean;
};
type Row = OwnedRow | AdoptedRow;

/** The tag chip key — an owned design's lifecycle status, or the ADOPTED provenance. */
type TagKey = 'draft' | 'private' | 'published' | 'adopted';
const tagKeyOf = (row: Row): TagKey => (row.origin === 'adopted' ? 'adopted' : row.status);

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
  /** The 0040 confirm renders at the PAGE root (D.27) — the switcher only asks. `adopted` = the
   *  F-2b un-adopt path (REMOVE my copy; the page varies the confirm copy accordingly). */
  onRequestDelete: (cardId: string, name: string, adopted?: boolean) => void;
  deleteError?: string | null;
  /** Selection changed — the page clears its delete error so it can't blame the wrong card. */
  onClearDeleteError?: () => void;
}) {
  const t = useTheme();
  const styles = useStyles();
  const { data, isLoading } = useGetEntryCardsQuery(entry.entryId);
  const [updateEntry, equipState] = useUpdateEntryMutation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const TAG_STYLE: Record<TagKey, object> = {
    draft: { backgroundColor: 'rgba(13,11,30,0.78)', borderWidth: 1, borderColor: t.scr.hairline },
    private: { backgroundColor: t.brand.cream },
    published: { backgroundColor: t.brand.gold },
    adopted: { backgroundColor: t.scr.accent }, // an adopted grant — the accent provenance tag
  };
  const TAG_TEXT: Record<TagKey, object> = {
    draft: { color: t.scr.dim },
    private: { color: t.brand.navy },
    published: { color: t.brand.goldInk },
    adopted: { color: t.scr.accentInk },
  };

  const rows = useMemo<Row[]>(
    () =>
      (data?.items ?? []).map((c): Row =>
        c.origin === 'adopted'
          ? {
              origin: 'adopted',
              id: c.id,
              name: c.name,
              designer: c.designer.username,
              imageUrl: c.imageUrl,
              equipped: entry.card.id === c.id,
            }
          : {
              origin: 'owned',
              id: c.id,
              name: c.name,
              status: c.status,
              composition: parseComposition(c.composition),
              equipped: entry.card.id === c.id,
            },
      ),
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
        <ActivityIndicator color={t.scr.accent} accessibilityLabel="Loading your cards" />
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
              <View style={[styles.tag, TAG_STYLE[tagKeyOf(row)]]}>
                <Text style={[styles.tagText, TAG_TEXT[tagKeyOf(row)]]}>{TAG_LABEL[tagKeyOf(row)]}</Text>
              </View>
              {row.equipped ? (
                // the worn marker is a GLYPH chip, not a word — it coexists with the status tag (C.11)
                <View style={styles.wornChip} accessibilityLabel="Equipped">
                  <Text style={styles.wornGlyph}>◆</Text>
                </View>
              ) : null}
              {row.origin === 'adopted' ? (
                // a foreign card renders from its FLATTENED published image, never live skia (CARD-15)
                <FlatCardImage title={row.name} imageUrl={row.imageUrl} size="cell" width={CELL_W} height={CELL_H} />
              ) : (
                <CardFace title={row.name} composition={row.composition} size="cell" width={CELL_W} height={CELL_H} />
              )}
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
            {selected.name} — {TAG_LABEL[tagKeyOf(selected)]}
          </Text>
          {selected.origin === 'adopted' ? (
            // CARD-15 — an adopted card is the IMAGE, not the layers; no per-attribute readout to show.
            <Text style={styles.note}>Adopted from {selected.designer} — the image, not the layers.</Text>
          ) : (
            <EquipReadout card={{ ...entry.card, isCustom: true }} composition={selected.composition} />
          )}
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
                disabled={(selected.origin === 'owned' && selected.status === 'draft') || equipState.isLoading}
                onPress={() => void setMain(selected.id)}
                style={styles.miniBtn}
              />
            )}
            {/* Edit is OWNED-only — a foreign adopted card has no layers to edit (CARD-15). */}
            {selected.origin === 'owned' ? (
              <>
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
              </>
            ) : (
              // F-2b un-adopt — REMOVE my copy (DELETE /cards/:id on an adopted card revokes only the
              // caller's grant). Same worn guard as owned-delete (409 CARD_EQUIPPED — switch first).
              <ScreenButton
                label="Remove"
                variant={selected.equipped ? 'secondary' : 'destructive'}
                disabled={selected.equipped}
                onPress={() => onRequestDelete(selected.id, selected.name, true)}
                style={styles.miniBtn}
              />
            )}
          </View>
          {inlineError || deleteError ? <Text style={styles.err}>{inlineError ?? deleteError}</Text> : null}
        </View>
      ) : null}

      {/* the community gallery (M5 P8) renders BELOW this switcher — the game page CARDS section
          mounts `CommunityGallery` as a sibling; the old BROWSE-THE-COMMUNITY placeholder is retired. */}
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
  const t = useTheme();
  const w = CELL_W + RING * 2;
  const h = CELL_H + RING * 2;
  return (
    <Svg width={w} height={h} style={[StyleSheet.absoluteFill, { left: -RING, top: -RING }]} pointerEvents="none">
      <Path
        d={steppedRectPath(w, h, t.step / 2, { tl: true, br: true })}
        fill="none"
        stroke={t.scr.accent}
        strokeWidth={2}
      />
    </Svg>
  );
}

const TAG_LABEL: Record<TagKey, string> = {
  draft: 'DRAFT',
  private: 'PRIVATE',
  published: 'PUBLISHED',
  adopted: 'ADOPTED',
};

const useStyles = themedStyles((t) => ({
  wrap: { gap: t.space.lg },
  loading: { paddingVertical: t.space.xxl, alignItems: 'center' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionHead: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1.5 },
  sortLink: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.lg },
  cellWrap: { width: CELL_W, height: CELL_H, position: 'relative' },
  tag: { position: 'absolute', top: 4, left: 4, zIndex: 3, paddingHorizontal: 4, paddingVertical: 2 },
  tagText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, letterSpacing: 0.5 },
  wornChip: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 3,
    backgroundColor: t.scr.accent,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  wornGlyph: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.accentInk },
  // decision 0069 — DESIGN NEW is GOLD (F-02 acquisitive: it creates a card); was orange scr.accent.
  newTile: {
    width: CELL_W,
    height: CELL_H,
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.space.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: t.scr.value, // F-02 gold, themed (0070/OQ-144 — deep gold on light themes so it reads)
    backgroundColor: 'rgba(255,210,63,0.06)',
  },
  newPlus: { fontFamily: t.font.screenBold, fontSize: t.type.display, color: t.scr.value },
  newLabel: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.value, letterSpacing: 1 },
  emptyLine: { fontFamily: t.font.screen, fontSize: t.type.body, color: t.scr.faint, lineHeight: 16 },
  opts: {
    padding: t.space.lg,
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    gap: t.space.md,
  },
  optsTitle: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.5 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
  miniBtn: { paddingVertical: t.space.md, paddingHorizontal: t.space.md },
  note: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.faint, lineHeight: 15 },
  err: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.brand.alert },
}));
