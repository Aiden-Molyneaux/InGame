import { type ReactNode } from 'react';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../theme';
import { ScreenButton } from '../ScreenButton';
import { StateFrame } from './StateFrame';

// EmptyState (component-map §5.6 · design-spec §1.6 · design-req §1.7) — the EMPTY state as an INVITING
// DOORWAY, never a dead end. Icon + headline + optional action. `tone` carries the F-02 intent: `gold`
// = an acquisitive/card-creating door (DESIGN A CARD — ScreenButton/add gold), `neutral` = a plain door
// (ADD A GAME — primary accent). The dashed silhouette warms to accent (the doorway read). This is the
// primitive the §10 `SectionEmpty` sibling composes over (the contributor-hook / DESIGN-A-CARD vs
// ADD-A-GAME variants are expressible here via `tone` + `glyph` + the action props).
export function EmptyState({
  title,
  message,
  glyph,
  actionLabel,
  onAction,
  tone = 'neutral',
}: {
  title: string;
  message?: string;
  /** Optional custom doorway glyph; defaults to a ＋ mark. */
  glyph?: ReactNode;
  /** The doorway CTA label. Omitted → an inviting state with no button (still not a dead end). */
  actionLabel?: string;
  onAction?: () => void;
  /** `gold` = acquisitive (DESIGN A CARD, F-02); `neutral` = plain (ADD A GAME). */
  tone?: 'neutral' | 'gold';
}) {
  const t = useTheme();
  const defaultGlyph = (
    <Svg width={38} height={38} viewBox="0 0 38 38">
      <Path d="M19 9v20M9 19h20" stroke={t.scr.accent} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
  return (
    <StateFrame
      title={title}
      body={message}
      titleTone="ink"
      frameTone="invite"
      glyph={glyph ?? defaultGlyph}
      action={
        actionLabel && onAction ? (
          <ScreenButton
            label={actionLabel}
            variant={tone === 'gold' ? 'add' : 'primary'}
            onPress={onAction}
          />
        ) : undefined
      }
    />
  );
}
