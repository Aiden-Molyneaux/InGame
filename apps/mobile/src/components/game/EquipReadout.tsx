import { View, Text } from 'react-native';
import type { CollectionCard, EquippedReadout as EquippedLabels } from '@ingame/shared';
import { themedStyles } from '../../theme';
import { FRAMES, NAMEPLATES, FONTS } from '../../styler/roster';
import { explicitFrameRosterId, explicitPlateRosterId } from '../../styler/premium';
import type { CardComposition } from '../../render/composition';

// EquipReadout (CARD-22) — the read-only summary of a card's equipped closed attributes as DISPLAY
// metadata, never the editable layers (CARD-15). With a parsed composition (an owner-side custom
// design) the labels derive from its closed attributes; without one, the CARD-18 default reads
// STANDARD/none. Display names mirror the roster ids (0063/0068; no spec-ID strings — OQ-110).
// FRAMES resolve by kind+COLOR (several frames share a kind since 0068 — kind alone would read a
// GOLD card as "LINE"); retired kinds (pixel/grain, ledger) keep names for legacy documents.

const NAME: Record<string, string> = {
  'thin-line': 'LINE',
  'double-line': 'DOUBLE LINE',
  'ticket-notch': 'TICKET',
  'bracket-corners': 'BRACKETS',
  'pixel-border': 'PIXEL', // retired — legacy documents only
  'soft-glow': 'SOFT GLOW',
  scanline: 'SCANLINE',
  'gradient-sheen': 'SHEEN',
  dust: 'DUST',
  vignette: 'VIGNETTE',
  grain: 'GRAIN', // retired — legacy documents only
  halftone: 'HALFTONE',
  frost: 'FROST',
  embers: 'EMBERS',
  matte: 'MATTE',
  'subtle-gloss': 'SUBTLE GLOSS',
  linen: 'LINEN',
  holographic: 'HOLOGRAPHIC',
  metallic: 'METALLIC',
  slab: 'SLAB',
  ribbon: 'RIBBON',
  bevel: 'BEVEL',
  capsule: 'CAPSULE',
  tab: 'TAB',
  arch: 'ARCH',
  dogtag: 'DOGTAG',
  brass: 'BRASS',
  'clean-sans': 'CHAKRA',
  'bold-display': 'PAYTONE',
  'press-start': 'PIXEL',
  bitter: 'SLAB',
  'space-mono': 'MONO',
  pacifico: 'SCRIPT',
  stencil: 'STENCIL',
};
const label = (id: string | undefined | null, fallback: string) => (id ? (NAME[id] ?? id.toUpperCase()) : fallback);

/** The frame's roster display name — a VALIDATED explicit `cosmeticId` wins (COSM-05: a recoloured
 *  MARQUEE ULTIMATE must read as itself, and its colour matches no roster row); then kind+color
 *  (0068), kind-only as the legacy fallback. */
const frameLabel = (frame: CardComposition['frame']): string => {
  if (!frame?.kind) return 'CLEAN';
  const explicit = explicitFrameRosterId(frame);
  if (explicit) return FRAMES.find((f) => f.id === explicit)?.name ?? label(frame.kind, 'CLEAN');
  const hit = FRAMES.find((f) => f.kind === frame.kind && f.color === frame.color) ?? FRAMES.find((f) => f.kind === frame.kind);
  return hit?.name ?? label(frame.kind, 'CLEAN');
};

/** The plate's display name — explicit-id first (COSM-05: BRASS ULTIMATE shares brass's shape), then
 *  the shape label. Legacy 'none' renders as slab (OQ-135). */
const plateLabel = (nameplate: CardComposition['nameplate']): string => {
  if (!nameplate) return 'SLAB';
  const explicit = explicitPlateRosterId(nameplate);
  if (explicit) {
    const hit = NAMEPLATES.find((p) => p.id === explicit)?.name;
    if (hit) return hit;
  }
  return label(nameplate.shape === 'none' ? 'slab' : (nameplate.shape ?? 'slab'), 'SLAB');
};

/** The font's display name — the roster id IS explicit identity (fontId one-for-one), so the roster
 *  name wins ('pacifico-ultimate' → SCRIPT ULTIMATE, never the raw-id uppercase fallback). */
const fontLabel = (fontId: string | undefined): string => {
  if (!fontId) return 'CHAKRA';
  return FONTS.find((f) => f.id === fontId)?.name ?? label(fontId, 'CHAKRA');
};

// CARD-22 cross-user (P9 · OQ-146) — the friend/gallery readout arrives as PRE-COMPUTED display labels
// (`equipped`), denormalized at publish, never the composition (OQ-122 — a viewer never gets the layers).
// Every slot is optional; an absent slot (or an empty `{}` from a pre-M6 card the backfill missed) is
// simply omitted. When every slot is absent this renders NOTHING (a quiet no-readout — CARD-22 "render
// only when present"), never a crash. The `equipped` branch takes precedence when supplied.
// Slot names + set MATCH the own-composition branch below (Parvati walk-wave 🎨): the switcher flips
// between adopted and own cards, so the two paths must read as ONE readout — same NAMEPLATE label,
// and no BASE chip (the own path never shows one; base is the card's ground, not an equip slot).
const CROSS_SLOTS: Array<[keyof EquippedLabels, string]> = [
  ['frame', 'FRAME'],
  ['effect', 'EFFECT'],
  ['finish', 'FINISH'],
  ['nameplate', 'NAMEPLATE'],
  ['font', 'FONT'],
];

export function EquipReadout({
  card,
  composition,
  equipped,
}: {
  /** Optional when a composition is given (the BaseRail readout) — only consulted for the default/no-parse branches. */
  card?: CollectionCard;
  composition?: CardComposition | null;
  /** CARD-22 cross-user — pre-computed display labels (friend/gallery card). Takes precedence when given. */
  equipped?: EquippedLabels;
}) {
  const styles = useStyles();
  // Cross-user path — render the present labels verbatim (already display strings); nothing if all absent.
  if (equipped) {
    const crossChips = CROSS_SLOTS.flatMap(([slot, k]) => {
      const v = equipped[slot];
      return v ? [[k, v.toUpperCase()] as [string, string]] : [];
    });
    if (crossChips.length === 0) return null;
    return (
      <View style={styles.wrap}>
        {crossChips.map(([k, v]) => (
          <View key={k} style={styles.chip}>
            <Text style={styles.chipText}>
              {k} · <Text style={styles.chipVal}>{v}</Text>
            </Text>
          </View>
        ))}
      </View>
    );
  }
  const chips: Array<[string, string]> = composition
    ? [
        ['FRAME', frameLabel(composition.frame)],
        ['EFFECT', label(composition.effect?.kind === 'none' ? null : composition.effect?.kind, 'NONE')],
        ['FINISH', label(composition.finish?.kind === 'none' ? null : composition.finish?.kind, 'STANDARD')],
        // legacy 'none' renders as slab (OQ-135: a plate is required) — the readout tells that truth
        ['NAMEPLATE', plateLabel(composition.nameplate)],
        ['FONT', fontLabel(composition.nameplate?.fontId)],
      ]
    : card?.isCustom !== false
      ? [] // a custom card whose composition didn't parse — show nothing rather than fabricate
      : [
          ['FRAME', 'STANDARD'],
          ['EFFECT', 'NONE'],
          ['FINISH', 'NONE'],
          ['NAMEPLATE', 'STANDARD'],
        ];
  return (
    <View style={styles.wrap}>
      {chips.map(([k, v]) => (
        <View key={k} style={styles.chip}>
          <Text style={styles.chipText}>
            {k} · <Text style={styles.chipVal}>{v}</Text>
          </Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
  chip: {
    borderWidth: 1,
    borderColor: t.scr.hairline,
    backgroundColor: t.scr.panelHi,
    paddingHorizontal: t.space.md,
    paddingVertical: 3,
    borderRadius: t.corner.screen, // F-07 square
  },
  chipText: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 0.5 },
  chipVal: { fontFamily: t.font.screenBold, color: t.scr.ink },
}));
