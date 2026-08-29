import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { theme } from '../../theme';
import type { CollectionView } from '../../store/prefsSlice';

// ── The ToolsBar glyph set (component-map §5.4 `ToolsBar`) ────────────────────────────────────────
// The BOARD's SVG icons, extracted verbatim from collection-states.html's tools bar (S3-n). Navy
// stroke/fill on the cream keycap (mockup `.sk2 .chip svg {stroke/fill: navy}`); set on each element
// directly (react-native-svg has no descendant CSS).
//
// SHARED HOME (walk-5 wave B): the friend shelf (app/user/[id]/collection.tsx) must wear the IDENTICAL
// keycap glyphs as the owner shelf — the owner CR is that the two browse surfaces look and feel the
// same, so a divergent icon set would be the first thing to drift. The owner shelf still declares its
// own copies inline; a parallel packet owns that file this wave, so its de-duplication (delete the
// inline copies, import from here) is a recorded FOLLOW-UP, not an edit made from here.

const NAVY = theme.brand.navy;

export function SearchIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 12 12">
      <Circle cx={5} cy={5} r={3.4} fill="none" stroke={NAVY} strokeWidth={1.6} />
      <Path d="M7.8 7.8L11 11" fill="none" stroke={NAVY} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

// Sort double-arrow (down at x=3, up at x=8); when a sort is active the chosen direction's arrow is
// emphasized and the other dims — the icon-only form of the board's "↑" direction cue (S3-i).
export function SortIcon({ active, asc }: { active?: boolean; asc?: boolean }) {
  const down = !active ? 1 : asc ? 0.3 : 1;
  const up = !active ? 1 : asc ? 1 : 0.3;
  return (
    <Svg width={11} height={12} viewBox="0 0 11 12">
      <Path d="M3 1.5v9M3 10.5L1 8.4M3 10.5l2-2.1" fill="none" stroke={NAVY} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={down} />
      <Path d="M8 10.5v-9M8 1.5L6 3.6M8 1.5l2 2.1" fill="none" stroke={NAVY} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={up} />
    </Svg>
  );
}

export function FilterIcon() {
  return (
    <Svg width={12} height={11} viewBox="0 0 12 11">
      <Path d="M1 1.5h10L7.5 6v3.4L4.5 10V6L1 1.5z" fill="none" stroke={NAVY} strokeWidth={1.4} strokeLinejoin="round" />
    </Svg>
  );
}

// The view keycap always wears the CURRENT mode's glyph (board caption §View modes).
export function ViewIcon({ view }: { view: CollectionView }) {
  if (view === 'grid') {
    return (
      <Svg width={12} height={12} viewBox="0 0 12 12">
        <Rect x={1} y={1} width={4.4} height={4.4} rx={1} fill={NAVY} />
        <Rect x={6.6} y={1} width={4.4} height={4.4} rx={1} fill={NAVY} />
        <Rect x={1} y={6.6} width={4.4} height={4.4} rx={1} fill={NAVY} />
        <Rect x={6.6} y={6.6} width={4.4} height={4.4} rx={1} fill={NAVY} />
      </Svg>
    );
  }
  if (view === 'list') {
    return (
      <Svg width={12} height={10} viewBox="0 0 12 10">
        <Path d="M1 1.5h10M1 5h10M1 8.5h10" fill="none" stroke={NAVY} strokeWidth={1.6} strokeLinecap="round" />
      </Svg>
    );
  }
  if (view === 'top') {
    return (
      <Svg width={12} height={10} viewBox="0 0 12 10">
        <Path d="M1 1.5h10M1 5h7M1 8.5h4" fill="none" stroke={NAVY} strokeWidth={1.6} strokeLinecap="round" />
      </Svg>
    );
  }
  return (
    <Svg width={10} height={12} viewBox="0 0 10 12">
      <Path d="M1.5 1.5h7v9h-7z" fill="none" stroke={NAVY} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M2.8 8.6h4.4" fill="none" stroke={NAVY} strokeWidth={1.3} />
    </Svg>
  );
}

// The in-place-search ⊗ clear (board `.search-bar .field .clear`, :693) — dismisses search + clears q.
export function ClearIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 13 13">
      <Circle cx={6.5} cy={6.5} r={5.5} fill="none" stroke={NAVY} strokeWidth={1.4} />
      <Path d="M4.4 4.4l4.2 4.2M8.6 4.4L4.4 8.6" fill="none" stroke={NAVY} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}
