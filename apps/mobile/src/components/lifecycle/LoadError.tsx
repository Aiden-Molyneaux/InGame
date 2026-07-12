import { useEffect } from 'react';
import Svg, { Circle, Line } from 'react-native-svg';
import { useTheme } from '../../theme';
import { ScreenButton } from '../ScreenButton';
import { announce } from '../../a11y/announce';
import { StateFrame } from './StateFrame';

// LoadError (component-map §5.6 · design-spec §1.6) — the RETRYABLE state: network / timeout / 5xx.
// "Signal Lost" + an accent ! glyph + an orange `ScreenButton/action-alt` RETRY (F-06 title = 15).
// The appearance is an async result the user can't see happen, so it announces once on mount
// (CARD-16 / decision 0044 §105 live-region). RTK-Query wiring: pass `refetch` as `onRetry`.
export function LoadError({
  title = 'Signal Lost',
  message = "We couldn't reach the server. Check your connection and try again.",
  onRetry,
  retryLabel = 'Retry',
}: {
  title?: string;
  message?: string;
  /** The RTK-Query `refetch` (or any re-fetch). Omitted → no RETRY key (a non-repeatable read). */
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const t = useTheme();
  useEffect(() => announce(`${title}. ${message}`), [title, message]);
  return (
    <StateFrame
      title={title}
      body={message}
      titleTone="ink"
      glyph={
        <Svg width={40} height={40} viewBox="0 0 40 40">
          <Circle cx={20} cy={20} r={18} fill="none" stroke={t.scr.accent} strokeWidth={2} />
          <Line x1={20} y1={11} x2={20} y2={23} stroke={t.scr.accent} strokeWidth={2.4} strokeLinecap="round" />
          <Circle cx={20} cy={29} r={1.6} fill={t.scr.accent} />
        </Svg>
      }
      action={onRetry ? <ScreenButton label={retryLabel} variant="action-alt" onPress={onRetry} /> : undefined}
    />
  );
}
