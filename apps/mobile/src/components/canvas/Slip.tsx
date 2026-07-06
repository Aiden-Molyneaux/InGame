import { Suspense } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { LazyElementGlyph } from './lazySkia';
import { elementLabel } from '../../canvas/ops';
import type { CardElement } from '../../render/composition';

// Slip (component-map §8b / board P2/P5) — one physical layer in the rack: the pane (a live
// one-element skia thumb), the name, the 🔒/HID badges, the pulled treatment (raised + accent ring
// + the square pip — StateMark grammar, F-05/F-09). TAP toggles pulled (CARD-16: the pull is a
// tap); LONG-PRESS asks for the ops row (CARD-08) — the pulled slip also carries a ⋯ badge that
// taps the ops open (the non-gesture pair).

const PANE_W = 50;
const PANE_H = 70;

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
  const tilt = pulled ? '0deg' : index % 3 === 0 ? '-2deg' : index % 3 === 1 ? '1.5deg' : '-1deg';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} slip${pulled ? ', pulled' : ''}${element.locked ? ', locked' : ''}${element.hidden ? ', hidden' : ''}`}
      accessibilityState={{ selected: pulled }}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={[styles.slip, { transform: [{ rotate: tilt }, { translateY: pulled ? -8 : 0 }] }, element.hidden && styles.hiddenly]}
    >
      <View style={[styles.pane, pulled && styles.panePulled]}>
        <Suspense fallback={<View style={styles.paneFill} />}>
          <LazyElementGlyph element={element} width={PANE_W - 2} height={PANE_H - 2} />
        </Suspense>
        {element.locked ? <Text style={styles.badge}>🔒</Text> : null}
        {element.hidden ? <Text style={styles.badge}>HID</Text> : null}
        {pulled ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`${label} slip options`} onPress={onLongPress} hitSlop={8} style={styles.opsBadge}>
            <Text style={styles.opsBadgeText}>⋯</Text>
          </Pressable>
        ) : null}
      </View>
      {pulled ? <View style={styles.pip} /> : null}
      <Text style={styles.name} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slip: { width: 54, alignItems: 'center', gap: 3 },
  hiddenly: { opacity: 0.42 },
  pane: {
    width: PANE_W,
    height: PANE_H,
    backgroundColor: theme.scr.panel,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    overflow: 'hidden',
  },
  panePulled: { borderWidth: 1.5, borderColor: theme.scr.accent },
  paneFill: { flex: 1, backgroundColor: theme.scr.panelHi },
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
    bottom: 2,
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
    maxWidth: 54,
  },
});
