import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { NavKeycap } from './NavKeycap';

// NavBand (component-map §5.1) — the shell band holding the 5 NavKeycaps. `locked` (logged-out) greys
// it out + makes it non-interactive. F-04: nav legibility beats customization (the 5 keys stay legible).
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
}: {
  tabs: NavTab[];
  activeKey: string;
  onSelect: (key: string) => void;
  locked?: boolean;
}) {
  return (
    <View style={styles.band} accessibilityRole="tablist">
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
    backgroundColor: theme.shell.lo,
    paddingHorizontal: theme.space.sm,
    paddingTop: theme.space.sm,
    paddingBottom: theme.space.md,
  },
});
