import { View, Text } from 'react-native';
import type { CollectionCard } from '@ingame/shared';
import { themedStyles } from '../../theme';
import { FRAMES } from '../../styler/roster';
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

/** The frame's roster display name — kind+color first (0068), kind-only as the legacy fallback. */
const frameLabel = (frame: CardComposition['frame']): string => {
  if (!frame?.kind) return 'CLEAN';
  const hit = FRAMES.find((f) => f.kind === frame.kind && f.color === frame.color) ?? FRAMES.find((f) => f.kind === frame.kind);
  return hit?.name ?? label(frame.kind, 'CLEAN');
};

export function EquipReadout({
  card,
  composition,
}: {
  /** Optional when a composition is given (the BaseRail readout) — only consulted for the default/no-parse branches. */
  card?: CollectionCard;
  composition?: CardComposition | null;
}) {
  const chips: Array<[string, string]> = composition
    ? [
        ['FRAME', frameLabel(composition.frame)],
        ['EFFECT', label(composition.effect?.kind === 'none' ? null : composition.effect?.kind, 'NONE')],
        ['FINISH', label(composition.finish?.kind === 'none' ? null : composition.finish?.kind, 'STANDARD')],
        // legacy 'none' renders as slab (OQ-135: a plate is required) — the readout tells that truth
        ['NAMEPLATE', composition.nameplate ? label(composition.nameplate.shape === 'none' ? 'slab' : (composition.nameplate.shape ?? 'slab'), 'SLAB') : 'SLAB'],
        ['FONT', label(composition.nameplate?.fontId, 'CHAKRA')],
      ]
    : card?.isCustom !== false
      ? [] // a custom card whose composition didn't parse — show nothing rather than fabricate
      : [
          ['FRAME', 'STANDARD'],
          ['EFFECT', 'NONE'],
          ['FINISH', 'NONE'],
          ['NAMEPLATE', 'STANDARD'],
        ];
  const styles = useStyles();
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
