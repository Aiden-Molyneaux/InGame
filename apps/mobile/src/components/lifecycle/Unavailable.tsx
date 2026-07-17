import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../../theme';
import { ScreenButton } from '../ScreenButton';
import { StateFrame } from './StateFrame';

// Unavailable (component-map §5.6 · design-spec §1.6 · MOD-09) — the TERMINAL state: a muted grey
// person-glyph, NO retry. MOD-09 non-disclosure: blocked / suspended / deleted all collapse here,
// deliberately indistinguishable — the copy never leaks WHICH. The lone exception is YOUR OWN block,
// which shows UNBLOCK (design-spec §1.6). Otherwise the only affordance is GO BACK. Calm title (dim, 15).
export function Unavailable({
  title = 'Unavailable',
  message = "This isn't available right now.",
  onBack,
  onUnblock,
  backLabel = 'Go Back',
}: {
  title?: string;
  message?: string;
  /** GO BACK — the terminal escape (rendered unless `onUnblock` takes the slot). */
  onBack?: () => void;
  /** The MOD-09 lone exception: YOUR OWN block → UNBLOCK. When set, replaces GO BACK. */
  onUnblock?: () => void;
  backLabel?: string;
}) {
  const t = useTheme();
  const action = onUnblock ? (
    <ScreenButton label="Unblock" variant="secondary" onPress={onUnblock} />
  ) : onBack ? (
    <ScreenButton label={backLabel} variant="secondary" onPress={onBack} />
  ) : undefined;
  return (
    <StateFrame
      title={title}
      body={message}
      titleTone="dim"
      glyph={
        <Svg width={40} height={40} viewBox="0 0 40 40">
          {/* a muted person — head + shoulders (MOD-09: never a face, never a name) */}
          <Circle cx={20} cy={14} r={7} fill="none" stroke={t.scr.faint} strokeWidth={2} />
          <Path d="M8 33c0-6.6 5.4-11 12-11s12 4.4 12 11" fill="none" stroke={t.scr.faint} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      }
      action={action}
    />
  );
}
