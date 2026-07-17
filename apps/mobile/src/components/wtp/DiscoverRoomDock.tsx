import Svg, { Path, Circle } from 'react-native-svg';
import { SectionDock, type SectionDockItem } from '../SectionDock';

// DiscoverRoomDock (walk-2 · OQ-063/decision 0030 one-grammar) — the Discover screen's UP NEXT ↔
// DISCOVER room switch, a thin adapter over the shared `SectionDock` exactly like the Game page's
// GameTabDock (PLAY · CARDS · ABOUT) and the Device editor's DeviceSectionRail: this surface owns its
// two glyphs (the discover board's seg icons — the play triangle + the compass, 24-unit viewBox);
// SectionDock owns the shape, the active grammar (accent border + tint + accent icon, no pip, F-09),
// and the bottom-dock layout. The hand-rolled segmented pair this replaces is retired.
export type DiscoverRoom = 'upnext' | 'discover';

const ITEMS: SectionDockItem<DiscoverRoom>[] = [
  {
    value: 'upnext',
    label: 'UP NEXT',
    // the board's seg play glyph (discover-states `.seg-ic`: M7 5.5v13l11-6.5z)
    renderIcon: (c, s) => (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Path d="M7 5.5v13l11-6.5z" fill="none" stroke={c} strokeWidth={1.8} strokeLinejoin="round" />
      </Svg>
    ),
  },
  {
    value: 'discover',
    label: 'DISCOVER',
    // the board's compass glyph (circle + needle), also the nav keycap's DISCOVER symbol
    renderIcon: (c, s) => (
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={9} fill="none" stroke={c} strokeWidth={1.8} />
        <Path d="M15.5 8.5l-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2z" fill={c} />
      </Svg>
    ),
  },
];

export function DiscoverRoomDock({
  value,
  onChange,
}: {
  value: DiscoverRoom;
  onChange: (v: DiscoverRoom) => void;
}) {
  return <SectionDock items={ITEMS} value={value} onChange={onChange} />;
}
