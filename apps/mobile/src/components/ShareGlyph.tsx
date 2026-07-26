import Svg, { Path } from 'react-native-svg';

// ShareGlyph — the app's ONE share mark as an inline SVG glyph (the PixelsMark / StateMark approach),
// never a Unicode arrow: `↗` renders as a coloured EMOJI on some platforms and as a stray dingbat on
// others (the owner's walk-4 P4-d call-out). An up-arrow lifting out of an open tray; stroke-drawn so
// the caller's ink flows in via `color`. Consumers: the PUBLISH ritual (its D8b origin), the styler
// KeepBeat, and the card-preview drawer's SHARE row (walk-4 Murr consolidation of three private copies).
export function ShareGlyph({ size = 11, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12 V20 H19 V12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 3.5 V14" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 7 L12 3.5 L16 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
