import { View } from 'react-native';
import { themedStyles } from '../../theme';

// HueStrip (M6 W-5 · decision 0080 ruling 3 · draft §4.1) — the colour-freedom tell for a colorCustomizable
// (Ultimate) design: a compact 5-step spectrum bar, square-cornered (F-07 — NOT a rainbow circle). It
// pairs with the "ANY COLOUR — YOURS TO PICK" copy line in the item sheet, and rides the badge corner on
// store tiles/rows. The five blocks are illustrative spectrum ART (the CosmeticSwatch precedent — literal
// colours, not chrome tokens): they SAY "any hue", they aren't themed surface. A single a11y label
// stands for the whole glyph so screen readers hear the meaning, not five nameless swatches.

// the 5-step spectrum — red → amber → green → blue → violet (an even sweep so it reads as "any colour").
const HUE_STEPS = ['#e34b5a', '#e8b23f', '#5ec26a', '#4a9de8', '#b45ae8'] as const;

export function HueStrip({ size = 7 }: { size?: number }) {
  const styles = useStyles();
  return (
    <View
      style={styles.strip}
      accessibilityRole="image"
      accessibilityLabel="Any colour — colour-customizable"
    >
      {HUE_STEPS.map((c) => (
        <View key={c} style={{ width: size, height: size, backgroundColor: c }} />
      ))}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  // a hairline frames the strip so the pale steps read on any surface (F-07 square corners — no radius).
  strip: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: t.scr.hairline,
  },
}));
