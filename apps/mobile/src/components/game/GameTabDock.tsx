import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { SectionDock, type SectionDockItem } from '../SectionDock';

// GameTabDock (component-map §9) — the Game-page section dock: PLAY · CARDS · ABOUT. Now a thin adapter
// over the shared `SectionDock` (owner ruling 2026-07-10 — the Game dock + the Device rail are the same
// component, rendered the same way). This surface owns its three glyphs (drawn in an 18-unit viewBox);
// SectionDock owns the shape, the active grammar (accent border + tint, no pip), and the layout.
export type GameSection = 'play' | 'cards' | 'about';

const ITEMS: SectionDockItem<GameSection>[] = [
  {
    value: 'play',
    label: 'PLAY',
    renderIcon: (c, s) => (
      <Svg width={s} height={s} viewBox="0 0 18 18">
        <Path d="M6 4 L15 9.5 L6 15 Z" fill="none" stroke={c} strokeWidth={1.5} strokeLinejoin="round" />
      </Svg>
    ),
  },
  {
    value: 'cards',
    label: 'CARDS',
    renderIcon: (c, s) => (
      <Svg width={s} height={s} viewBox="0 0 18 18">
        <Rect x={6} y={3} width={9} height={12} rx={1.4} fill="none" stroke={c} strokeWidth={1.4} />
        <Path d="M3 5.5 V13.5 a1.4 1.4 0 0 0 1.4 1.4 H11" fill="none" stroke={c} strokeWidth={1.2} />
      </Svg>
    ),
  },
  {
    value: 'about',
    label: 'ABOUT',
    renderIcon: (c, s) => (
      <Svg width={s} height={s} viewBox="0 0 18 18">
        <Circle cx={9} cy={9} r={6.5} fill="none" stroke={c} strokeWidth={1.3} />
        <Path d="M9 8 V12 M9 5.6 v0.2" fill="none" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
      </Svg>
    ),
  },
];

export function GameTabDock({ value, onChange }: { value: GameSection; onChange: (v: GameSection) => void }) {
  return <SectionDock items={ITEMS} value={value} onChange={onChange} />;
}
