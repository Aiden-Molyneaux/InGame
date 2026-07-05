import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { NavKeycap } from './NavKeycap';

// NavBand (component-map §5.1) — the shell band holding the 5 NavKeycaps. It is transparent so it
// reads as the lower part of the ONE teal plastic body (the DeviceShell). The band is CONTENT-sized
// (pad-top 16 · keys · pad-bottom) — owner ruling 2026-07-01: the keys ride just above the device
// bottom (~½cm), not atop a fixed 128px well of dead plastic (the mockup's 128 includes the outside
// key labels this build carries inside the caps). Because the band is content-sized with flex-start
// keys, the bottom pad drives the key position 1:1 — S1-b (M3-R) nudges it DOWN ~¼cm by subtracting
// ~8 from the home-indicator inset, clamped to a 10px floor so no-inset/web + small-inset devices
// never touch the edge (R2-tunable on device). `locked` (logged-out / pre-auth) greys it out + makes
// it non-interactive. F-04: the 5 keys stay legible.
export interface NavTab {
  key: string;
  label: string;
  accent?: 'default' | 'collection' | 'store';
  /** false ⇒ a placeholder tab (M3+ screen not built) — shown but inert. */
  built?: boolean;
}

export function NavBand({
  tabs,
  activeKey,
  onSelect,
  locked = false,
  bottomInset = 0,
}: {
  tabs: NavTab[];
  activeKey: string;
  onSelect: (key: string) => void;
  locked?: boolean;
  /** the bottom safe-area inset — extends the band below the home indicator without shrinking it. */
  bottomInset?: number;
}) {
  return (
    <View
      style={[
        styles.band,
        { paddingBottom: Math.max(bottomInset - 8, 10) }, // S1-b: keys ~¼cm lower (inset − 8, floor 10)
        locked && styles.bandLocked,
      ]}
      accessibilityRole="tablist"
    >
      {tabs.map((tab, i) => (
        <NavKeycap
          key={tab.key}
          label={tab.label}
          glyph={tab.key}
          labelPosition={i % 2 === 1 ? 'above' : 'below'} // mockup alternation (DISCOVER/PROFILE above)
          accent={tab.accent}
          active={!locked && tab.key === activeKey}
          disabled={locked || tab.built === false}
          onPress={() => onSelect(tab.key)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 6,
    paddingTop: 16,
  },
  bandLocked: { opacity: 0.45 }, // component-map §5.1 NavBand `locked` (gray + non-interactive)
});
