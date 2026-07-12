// DELIBERATELY BAD (rule-a11y-responder). A colour swatch wired as a button through the raw responder
// system instead of a `Pressable` — a bare `View` with `onStartShouldSetResponder`/`onResponderRelease`
// is not a reliable accessibility element (VoiceOver/TalkBack may never reach or activate it), the exact
// CARD-16 defect the audit found. The fix is `<Pressable accessibilityRole="button" accessibilityLabel=…
// onPress={onPress}>`. Real drag gestures are exempt — they spread `PanResponder.panHandlers`.
import { View } from 'react-native';

export function BadSwatch({ colour, onPress }: { colour: string; onPress: () => void }) {
  return (
    <View
      accessibilityRole="button"
      accessibilityLabel={`Use ${colour}`}
      onStartShouldSetResponder={() => true}
      onResponderRelease={onPress} // ❌ tap wired through the responder system, not a Pressable
      style={{ width: 24, height: 24, backgroundColor: colour }}
    />
  );
}
