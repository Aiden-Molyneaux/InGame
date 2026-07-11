import { View, Text, Pressable, StyleSheet } from 'react-native';
import { CardFace } from '../CardFace';
import { StatsBack } from './StatsBack';
import { theme } from '../../theme';
import type { CardComposition } from '../../render/composition';

// DualFaceHero (component-map §9) — the Game-page hero: your card's FACE + the standardized stats
// BACK side-by-side, no flip (the dual-face survives the merge, board `:465–485`). Tapping the FACE
// enlarges it to the CardDetail inspect (CARD-23 mode 3 INSPECT / decision 0048 — the whole card is
// the tap-target). At M4 the FACE renders the CARD-18 default placeholder (decision 0058 §6 — the
// composed CARD-15 render is EXPECTED). `statsLabel` becomes "↻ UPDATES LIVE" in EDIT so the back
// visibly reflects the in-progress form.
export function DualFaceHero({
  title,
  composition = null,
  hours,
  percent,
  status,
  since,
  artist,
  statsLabel = 'YOUR STATS',
  onInspect,
}: {
  title: string;
  /** The equipped design's composition (owner-side live render, 0066) — null → the default face. */
  composition?: CardComposition | null;
  hours: number;
  percent: number | null;
  status: string;
  since: string | null;
  artist: string | null;
  statsLabel?: string;
  onInspect: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.face}
        accessibilityRole="button"
        accessibilityLabel={`Inspect your ${title} card`}
        onPress={onInspect}
      >
        {/* /grid (161×225) — one size up from /pick per the owner's gate-5 B.5. `animate`: the
            game-page hero is the shelf's showpiece — animated cosmetics run here (0068 opt-in). */}
        <CardFace title={title} composition={composition} size="grid" animate />
        <Text style={styles.label}>THE FACE</Text>
      </Pressable>
      <View style={styles.face}>
        <StatsBack hours={hours} percent={percent} status={status} since={since} artist={artist} width={161} height={225} />
        <Text style={[styles.label, styles.labelAcc]}>{statsLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: theme.space.lg,
    paddingVertical: theme.space.sm, // tightened toward the title/facts block (gate-5 B.5)
  },
  face: { alignItems: 'center', gap: theme.space.sm },
  label: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1.5 },
  labelAcc: { color: theme.scr.accent },
});
