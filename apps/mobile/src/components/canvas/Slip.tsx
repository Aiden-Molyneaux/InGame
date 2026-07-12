import { Pressable, Text, View } from 'react-native';
import { themedStyles } from '../../theme';
import { elementLabel } from '../../canvas/ops';
import type { CardElement } from '../../render/composition';

// Slip (component-map §8b / board P2/P5) — one physical layer in the rack: the pane frame, the
// name, the LOCK-glyph/HID badges, the pulled treatment (raised + accent ring — StateMark grammar,
// F-05/F-09). The pane's GLYPH is drawn by the rack's single strip canvas BEHIND this overlay (one
// WebGL context for the whole rack — see LayerRack); the Slip itself is chrome only. TAP toggles
// pulled (CARD-16: the pull is a tap); LONG-PRESS asks for the ops row (CARD-08) — the pulled slip
// also carries a ⋯ badge that taps the ops open (the non-gesture pair). The badge is a SIBLING of
// the main Pressable, never nested (button-in-button is invalid on web).
// CR-13 (gate-5): lock = a small drawn padlock glyph (a body + a shackle), not a 🔒 emoji.
// CR-19 (gate-5): the pulled slip's orange StateMark pip is dropped — the raise + accent ring carry it.

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
  const styles = useStyles();
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
          {element.locked ? <LockGlyph /> : null}
          {element.hidden ? <Text style={styles.badge}>HID</Text> : null}
        </View>
        <Text style={[styles.name, element.hidden && styles.hiddenly]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
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

/** A small drawn padlock badge (CR-13) — a shackle (bordered arch) over a body with a keyhole. */
function LockGlyph() {
  const styles = useStyles();
  return (
    <View style={styles.lock} accessible={true} accessibilityLabel="Locked">
      <View style={styles.lockShackle} />
      <View style={styles.lockBody}>
        <View style={styles.lockHole} />
      </View>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  slip: { width: SLIP_W, alignItems: 'center' },
  slipPulled: { transform: [{ translateY: -SLIP_LIFT }] },
  press: { alignItems: 'center', gap: 3 },
  hiddenly: { opacity: 0.42 },
  pane: {
    width: SLIP_PANE_W,
    height: SLIP_PANE_H,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    backgroundColor: 'transparent', // the strip canvas behind carries the pane fill + glyph
  },
  panePulled: { borderWidth: 1.5, borderColor: t.scr.accent },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro,
    color: t.scr.dim,
    backgroundColor: t.scr.bg,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  opsBadge: {
    position: 'absolute',
    bottom: 18,
    right: 2,
    backgroundColor: t.scr.bg,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    paddingHorizontal: 4,
  },
  opsBadgeText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.ink },
  // the drawn padlock badge (CR-13) — sits where the 🔒 emoji did (pane top-right), same badge box
  lock: {
    position: 'absolute',
    top: 2,
    right: 2,
    alignItems: 'center',
    backgroundColor: t.scr.bg,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    paddingHorizontal: 2,
    paddingTop: 2,
    paddingBottom: 1,
  },
  lockShackle: {
    width: 6,
    height: 4,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: t.scr.dim,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  lockBody: {
    width: 8,
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.scr.dim,
  },
  lockHole: { width: 1.5, height: 1.5, backgroundColor: t.scr.bg },
  name: {
    fontFamily: t.font.screenBold,
    fontSize: t.type.micro,
    color: t.scr.dim,
    letterSpacing: 0.5,
    maxWidth: SLIP_W,
  },
}));
