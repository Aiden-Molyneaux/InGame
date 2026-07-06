import { View, Text, StyleSheet } from 'react-native';
import type { CollectionCard } from '@ingame/shared';
import { theme } from '../../theme';
import type { CardComposition } from '../../render/composition';

// EquipReadout (CARD-22) — the read-only summary of a card's equipped closed attributes as DISPLAY
// metadata, never the editable layers (CARD-15). With a parsed composition (an owner-side custom
// design) the labels derive from its closed attributes; without one, the CARD-18 default reads
// STANDARD/none. Display names mirror the 0063 roster ids (no spec-ID strings — OQ-110).

const NAME: Record<string, string> = {
  'thin-line': 'THIN LINE',
  'double-line': 'DOUBLE LINE',
  'ticket-notch': 'TICKET',
  'bracket-corners': 'BRACKETS',
  'pixel-border': 'PIXEL',
  'soft-glow': 'SOFT GLOW',
  scanline: 'SCANLINE',
  'gradient-sheen': 'SHEEN',
  dust: 'DUST',
  vignette: 'VIGNETTE',
  matte: 'MATTE',
  'subtle-gloss': 'SUBTLE GLOSS',
  slab: 'SLAB',
  ribbon: 'RIBBON',
  bevel: 'BEVEL',
  'clean-sans': 'CHAKRA',
  'bold-display': 'PAYTONE',
};
const label = (id: string | undefined | null, fallback: string) => (id ? (NAME[id] ?? id.toUpperCase()) : fallback);

export function EquipReadout({
  card,
  composition,
}: {
  card: CollectionCard;
  composition?: CardComposition | null;
}) {
  const chips: Array<[string, string]> = composition
    ? [
        ['FRAME', label(composition.frame?.kind, 'CLEAN')],
        ['EFFECT', label(composition.effect?.kind === 'none' ? null : composition.effect?.kind, 'NONE')],
        ['FINISH', label(composition.finish?.kind === 'none' ? null : composition.finish?.kind, 'STANDARD')],
        ['NAMEPLATE', composition.nameplate ? label(composition.nameplate.shape ?? 'slab', 'SLAB') : 'NONE'],
        ['FONT', label(composition.nameplate?.fontId, 'CHAKRA')],
      ]
    : card.isCustom
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

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  chip: {
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    backgroundColor: theme.scr.panelHi,
    paddingHorizontal: theme.space.md,
    paddingVertical: 3,
    borderRadius: theme.corner.screen, // F-07 square
  },
  chipText: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 0.5 },
  chipVal: { fontFamily: theme.font.screenBold, color: theme.scr.ink },
});
