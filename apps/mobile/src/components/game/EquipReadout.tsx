import { View, Text, StyleSheet } from 'react-native';
import type { CollectionCard } from '@ingame/shared';
import { theme } from '../../theme';

// EquipReadout (CARD-22) — the read-only summary of a card's equipped closed attributes (base ·
// effect · finish · frame · nameplate · font) as DISPLAY metadata, never the editable composition
// (CARD-15: viewers get the flattened image + overlays, not the layers). At M4 the only card is the
// CARD-18 DEFAULT stub (no custom attributes) so the readout shows the STANDARD/none values; the real
// per-attribute values arrive with the `card_designs` substrate (EXPECTED · Styler §3.2 / OQ-133).
export function EquipReadout({ card }: { card: CollectionCard }) {
  // Until card_designs lands, every card resolves to the default stub — one honest readout.
  const chips: Array<[string, string]> = card.isCustom
    ? [] // real closed attributes arrive with the render substrate (EXPECTED)
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
