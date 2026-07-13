import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../theme';
import { EmptyState } from './EmptyState';

// SectionEmpty (component-map §10) — the thin named wrapper over `EmptyState` for an empty SECTION
// inside a populated screen (a gallery row, a contributor shelf), as opposed to a whole-screen empty.
// Two variants carry the F-02 intent (design-spec §1.7 / component-map §10):
//   `contributor-hook` — gold DESIGN-A-CARD door (be the first to design one here)
//   `add-a-game`       — neutral ADD-A-GAME door
// It sets no new grammar — it just fixes the copy + tone + glyph so callers can't drift them.
export function SectionEmpty({
  variant,
  title,
  message,
  actionLabel,
  onAction,
}: {
  variant: 'contributor-hook' | 'add-a-game';
  /** Optional overrides — the variant supplies sensible defaults. */
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const t = useTheme();
  const gold = variant === 'contributor-hook';
  const glyph = gold ? (
    // a small brush/design mark for the contributor door
    <Svg width={34} height={34} viewBox="0 0 34 34">
      <Path
        d="M9 25l4-1 12-12-3-3L10 21l-1 4z M20 9l3 3"
        fill="none"
        stroke={t.scr.accent}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  ) : undefined;
  return (
    <EmptyState
      title={title ?? (gold ? 'NO COMMUNITY CARDS YET' : 'NOTHING HERE YET')}
      message={
        message ??
        (gold
          ? 'Be the first to design a card for this game — the community gallery starts with you.'
          : 'Add a game to get started.')
      }
      glyph={glyph}
      tone={gold ? 'gold' : 'neutral'}
      actionLabel={actionLabel ?? (gold ? 'Design a card' : 'Add a game')}
      onAction={onAction}
    />
  );
}
