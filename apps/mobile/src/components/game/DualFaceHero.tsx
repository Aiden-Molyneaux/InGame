import { View, Text, Pressable, StyleSheet } from 'react-native';
import { GameCard } from '../GameCard';
import { StatsBack } from './StatsBack';
import { theme } from '../../theme';

// DualFaceHero (component-map §9) — the Game-page hero: your card's FACE + the standardized stats
// BACK side-by-side, no flip (the dual-face survives the merge, board `:465–485`). Tapping the FACE
// enlarges it to the CardDetail inspect (CARD-23 mode 3 INSPECT / decision 0048 — the whole card is
// the tap-target). At M4 the FACE renders the CARD-18 default placeholder (decision 0058 §6 — the
// composed CARD-15 render is EXPECTED). `statsLabel` becomes "↻ UPDATES LIVE" in EDIT so the back
// visibly reflects the in-progress form.
export function DualFaceHero({
  title,
  hours,
  percent,
  status,
  since,
  artist,
  statsLabel = 'YOUR STATS',
  onInspect,
}: {
  title: string;
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
        <GameCard title={title} size="pick" />
        <Text style={styles.label}>THE FACE</Text>
      </Pressable>
      <View style={styles.face}>
        <StatsBack hours={hours} percent={percent} status={status} since={since} artist={artist} />
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
    paddingVertical: theme.space.lg,
  },
  face: { alignItems: 'center', gap: theme.space.sm },
  label: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1.5 },
  labelAcc: { color: theme.scr.accent },
});
