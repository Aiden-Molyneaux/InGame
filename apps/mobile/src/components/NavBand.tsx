import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { NavKeycap } from './NavKeycap';

// NavBand (component-map §5.1) — the shell band holding the 5 NavKeycaps. It is transparent so it
// reads as the lower part of the ONE teal plastic body (the DeviceShell), and is a FIXED 128px tall so
// the usable screen area above it is sized correctly. `locked` (logged-out / pre-auth) greys it out +
// makes it non-interactive. F-04: nav legibility beats customization (the 5 keys stay legible).
export interface NavTab {
  key: string;
  label: string;
  accent?: 'default' | 'collection' | 'store';
  /** false ⇒ a placeholder tab (M3+ screen not built) — shown but inert. */
  built?: boolean;
}

const NAV_BAND = 128; // mockup `.nav-band` height — fixes the usable screen area

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
        { height: NAV_BAND + bottomInset, paddingBottom: bottomInset },
        locked && styles.bandLocked,
      ]}
      accessibilityRole="tablist"
    >
      {tabs.map((tab) => (
        <NavKeycap
          key={tab.key}
          label={tab.label}
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
    paddingTop: 16, // mockup `.nav-band` padding — keys sit toward the top of the band
  },
  bandLocked: { opacity: 0.45 }, // component-map §5.1 NavBand `locked` (gray + non-interactive)
});
