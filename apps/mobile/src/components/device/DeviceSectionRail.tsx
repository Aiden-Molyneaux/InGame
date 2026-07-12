import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { SectionDock, type SectionDockItem } from '../SectionDock';

// DeviceSectionRail (component-map §11 · design-spec §2.15 · decision 0030/OQ-063) — the Device editor's
// four sections SHELL · THEME · STICKERS · LOOKS. Now a thin adapter over the shared `SectionDock` (owner
// ruling 2026-07-10 — same component as the Game-page dock, rendered the same way). This surface owns its
// four glyphs (24-unit viewBox); SectionDock owns the shape + active grammar + layout.
export type DeviceSection = 'shell' | 'theme' | 'stickers' | 'looks';

const ITEMS: SectionDockItem<DeviceSection>[] = [
  {
    value: 'shell',
    label: 'SHELL',
    // a handheld: rounded body + inset screen + a nav dot
    renderIcon: (c, s) => (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Rect x={6} y={2.5} width={12} height={19} rx={3} fill="none" stroke={c} strokeWidth={2} />
        <Rect x={8.5} y={5} width={7} height={9} rx={1} fill="none" stroke={c} strokeWidth={1.6} />
        <Circle cx={12} cy={18} r={1.3} fill={c} />
      </Svg>
    ),
  },
  {
    value: 'theme',
    label: 'THEME',
    // a split disc — one half filled (the screen dressing)
    renderIcon: (c, s) => (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={8.5} fill="none" stroke={c} strokeWidth={2} />
        <Path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill={c} />
      </Svg>
    ),
  },
  {
    value: 'stickers',
    label: 'STICKERS',
    // a star decal
    renderIcon: (c, s) => (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Path
          d="M12 3.2l2.4 5.2 5.7.6-4.3 3.8 1.2 5.6L12 21.2 6.9 18l1.2-5.6L3.8 9l5.7-.6L12 3.2z"
          fill="none"
          stroke={c}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </Svg>
    ),
  },
  {
    value: 'looks',
    label: 'LOOKS',
    // two stacked saved cards
    renderIcon: (c, s) => (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Rect x={4} y={7} width={12} height={13} rx={1.6} fill="none" stroke={c} strokeWidth={2} />
        <Rect x={9} y={3.5} width={11} height={12} rx={1.6} fill="none" stroke={c} strokeWidth={2} />
      </Svg>
    ),
  },
];

export function DeviceSectionRail({
  value,
  onChange,
}: {
  value: DeviceSection;
  onChange: (v: DeviceSection) => void;
}) {
  return <SectionDock items={ITEMS} value={value} onChange={onChange} />;
}
