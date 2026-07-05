import type { ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { theme } from '../../theme';

// GameTabDock (component-map §9 — "the bottom SectionSwitch") — the Game-page section dock: PLAY ·
// CARDS · ABOUT, docked at the BOTTOM (above the shell NavBand) in a scr.tools bed. Selection = an
// accent BORDER + accent icon/label (the SectionSwitch grammar — a border, F-09, NOT a pressed keycap
// and NOT a StateMark pip; the dock is distinct from the chip SectionSwitch). Board `:499–505`.
export type GameSection = 'play' | 'cards' | 'about';

export function GameTabDock({ value, onChange }: { value: GameSection; onChange: (v: GameSection) => void }) {
  return (
    <View style={styles.dock} accessibilityRole="tablist">
      <Seg section="play" label="PLAY" active={value === 'play'} onPress={() => onChange('play')} />
      <Seg section="cards" label="CARDS" active={value === 'cards'} onPress={() => onChange('cards')} />
      <Seg section="about" label="ABOUT" active={value === 'about'} onPress={() => onChange('about')} />
    </View>
  );
}

function Seg({
  section,
  label,
  active,
  onPress,
}: {
  section: GameSection;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const stroke = active ? theme.scr.accent : theme.scr.dim;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.seg, active && styles.segActive]}
    >
      <Svg width={18} height={18}>
        {ICON[section](stroke)}
      </Svg>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const ICON: Record<GameSection, (s: string) => ReactNode> = {
  play: (s) => <Path d="M6 4 L15 9.5 L6 15 Z" fill="none" stroke={s} strokeWidth={1.5} strokeLinejoin="round" />,
  cards: (s) => (
    <>
      <Rect x={6} y={3} width={9} height={12} rx={1.4} fill="none" stroke={s} strokeWidth={1.4} />
      <Path d="M3 5.5 V13.5 a1.4 1.4 0 0 0 1.4 1.4 H11" fill="none" stroke={s} strokeWidth={1.2} />
    </>
  ),
  about: (s) => (
    <>
      <Circle cx={9} cy={9} r={6.5} fill="none" stroke={s} strokeWidth={1.3} />
      <Path d="M9 8 V12 M9 5.6 v0.2" fill="none" stroke={s} strokeWidth={1.5} strokeLinecap="round" />
    </>
  ),
};

const styles = StyleSheet.create({
  dock: {
    flexDirection: 'row',
    gap: theme.space.md,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.lg,
    backgroundColor: theme.scr.bg,
    borderTopWidth: 1,
    borderTopColor: theme.scr.hairline,
  },
  seg: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.sm,
    paddingVertical: theme.space.md,
    backgroundColor: theme.scr.panel,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    borderRadius: theme.corner.screen, // F-07 square
  },
  segActive: { borderColor: theme.scr.accent, backgroundColor: 'rgba(255,159,67,0.10)' },
  label: { fontFamily: theme.font.screenBold, fontSize: theme.type.body, color: theme.scr.dim, letterSpacing: 1 },
  labelActive: { color: theme.scr.ink },
});
