import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { elementLabel } from '../../canvas/ops';
import type { CardElement } from '../../render/composition';

// Slip (component-map §8b / board P2/P5) — one physical layer in the rack: the pane frame, the
// name, the 🔒/HID badges, the pulled treatment (raised + accent ring + the square pip — StateMark
// grammar, F-05/F-09). The pane's GLYPH is drawn by the rack's single strip canvas BEHIND this
// overlay (one WebGL context for the whole rack — see LayerRack); the Slip itself is chrome only.
// TAP toggles pulled (CARD-16: the pull is a tap); LONG-PRESS asks for the ops row (CARD-08) —
// the pulled slip also carries a ⋯ badge that taps the ops open (the non-gesture pair). The badge
// is a SIBLING of the main Pressable, never nested (button-in-button is invalid on web).

export const SLIP_PANE_W = 50;
export const SLIP_PANE_H = 70;
export const SLIP_W = 54;
export const SLIP_GAP = 6;
export const SLIP_LIFT = 8;

export function Slip({
  element,
  index,
  pulled,
  onPress,
  onLongPress,
}: {
  element: CardElement;
  index: number;
  pulled: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const label = elementLabel(element, index);
  return (
    <View style={[styles.slip, pulled && styles.slipPulled]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} slip${pulled ? ', pulled' : ''}${element.locked ? ', locked' : ''}${element.hidden ? ', hidden' : ''}`}
        accessibilityState={{ selected: pulled }}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={350}
        style={styles.press}
      >
        <View style={[styles.pane, pulled && styles.panePulled, element.hidden && styles.hiddenly]}>
          {element.locked ? <Text style={styles.badge}>🔒</Text> : null}
          {element.hidden ? <Text style={styles.badge}>HID</Text> : null}
        </View>
        <Text style={[styles.name, element.hidden && styles.hiddenly]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
      {pulled ? <View style={styles.pip} pointerEvents="none" /> : null}
      {pulled ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} slip options`}
          onPress={onLongPress}
          hitSlop={8}
          style={styles.opsBadge}
        >
          <Text style={styles.opsBadgeText}>⋯</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slip: { width: SLIP_W, alignItems: 'center' },
  slipPulled: { transform: [{ translateY: -SLIP_LIFT }] },
  press: { alignItems: 'center', gap: 3 },
  hiddenly: { opacity: 0.42 },
  pane: {
    width: SLIP_PANE_W,
    height: SLIP_PANE_H,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    backgroundColor: 'transparent', // the strip canvas behind carries the pane fill + glyph
  },
  panePulled: { borderWidth: 1.5, borderColor: theme.scr.accent },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    fontFamily: theme.font.screenBold,
    fontSize: theme.type.micro,
    color: theme.scr.dim,
    backgroundColor: theme.scr.bg,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  opsBadge: {
    position: 'absolute',
    bottom: 18,
    right: 2,
    backgroundColor: theme.scr.bg,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    paddingHorizontal: 4,
  },
  opsBadgeText: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.ink },
  // the pulled slip's square StateMark pip (F-05 — square on-screen, never round/pink)
  pip: { position: 'absolute', top: -4, right: 4, width: 7, height: 7, backgroundColor: theme.scr.accent },
  name: {
    fontFamily: theme.font.screenBold,
    fontSize: theme.type.micro,
    color: theme.scr.dim,
    letterSpacing: 0.5,
    maxWidth: SLIP_W,
  },
});
