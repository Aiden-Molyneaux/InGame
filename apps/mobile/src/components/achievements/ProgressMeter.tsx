import { View } from 'react-native';
import { themedStyles } from '../../theme';

// ProgressMeter (component-map §13 · design-spec §1.5) — the flat fill bar (NOT an edge-rail, F-09):
// a quiet track with a tier-coloured fill. Used on the in-progress BadgeTile + the D2 node-detail
// sheet. The fill CLAMPS to [0,1] — the seeded `current` can exceed `target` (pre-engine events with
// no retro-grant, ACH-08 / GAP-4), so a raw ratio would overflow the track.
export function ProgressMeter({
  current,
  target,
  color,
  height = 5,
}: {
  current: number;
  target: number;
  /** the tier colour (ACH-09) — the fill follows the achievement's tier. */
  color: string;
  height?: number;
}) {
  const styles = useStyles();
  const ratio = target > 0 ? Math.min(Math.max(current / target, 0), 1) : 0;
  return (
    <View style={[styles.track, { height }]} accessibilityRole="progressbar">
      <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  track: { width: '100%', backgroundColor: t.scr.hairline },
  fill: { height: '100%' },
}));
