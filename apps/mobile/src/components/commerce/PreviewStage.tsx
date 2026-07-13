import type { ReactNode } from 'react';
import { Pressable, View, Text } from 'react-native';
import { themedStyles } from '../../theme';

// PreviewStage (component-map §7 · board P2/P3/P4) — the item-sheet preview area: the cosmetic shown
// live on the caller's OWN stuff (their card · the one pocket device wearing a new shell · the whole
// page for screen themes). Presentational — the parent passes the rendered preview as `children` (reuse
// the M4 editors' cosmetic rendering, never invented art). The swap line ("try another of your cards")
// is optional. At M5 no premium item is acquirable, so the live content is EXPECTED(P4 roster) — this
// container is the seam that content drops into.
export function PreviewStage({
  label,
  children,
  swapLabel,
  onSwap,
}: {
  label: string;
  children?: ReactNode;
  swapLabel?: string;
  onSwap?: () => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.stage}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <View style={styles.previewSlot}>{children}</View>
      {swapLabel ? (
        <Pressable accessibilityRole="button" accessibilityLabel={swapLabel} onPress={onSwap} hitSlop={6}>
          <Text style={styles.swap}>⇄ {swapLabel.toUpperCase()}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  stage: {
    alignItems: 'center',
    gap: t.space.md,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.lg,
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.scr.hairline,
  },
  label: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 2, textAlign: 'center' },
  previewSlot: { alignItems: 'center', justifyContent: 'center' },
  swap: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.accent, letterSpacing: 0.5 },
}));
