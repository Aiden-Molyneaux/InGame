import { useRef } from 'react';
import { View, Text, Pressable, PanResponder, StyleSheet } from 'react-native';
import { GameCard } from './GameCard';
import { theme } from '../theme';

// CardFan (component-map §1.5 — the add-game / picker 3-up swipe fan; board add-game-states `.cfan`
// / `.fan-nav`, :253–272). The centered FORE card + its two immediate neighbours rotated ±4°; below,
// the ‹ dots › + SWIPE affordance. A tap on a neighbour — or a chevron, or a horizontal swipe —
// rotates it to the fore (S4-g / §0.7 FOCUS-ONLY: the fore auto-shows its meta; the fore's own tap is
// INERT until the M4 Game page swaps it to NAVIGATE, CARD-23). Chevrons are the non-gesture rotate
// path (a11y baseline + web-testable). `variant`: 'entry' (fore /cell 96×134) · 'results' (fore
// 138×193); neighbours are always /cell. F-01: never cropped — GameCard only scales.
export type FanItem = { id: string; title: string };

export function CardFan({
  items,
  foreIndex,
  onFocus,
}: {
  items: FanItem[];
  foreIndex: number;
  onFocus: (index: number) => void;
}) {
  const n = items.length;
  // step wraps; the guard below blocks it for n < 2 so a single-card fan can't rotate onto itself.
  const step = (dir: 1 | -1) => onFocus((foreIndex + dir + n) % n);

  // The PanResponder is created ONCE (useRef) — if its handler closed over `step`/`n` directly it
  // would freeze the mount-time foreIndex and every swipe would rotate from index 0 (the chevrons,
  // recreated each render, would silently disagree). Read the latest through a ref updated per render.
  const live = useRef({ step, n });
  live.current = { step, n };
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_e, g) => {
        const cur = live.current;
        if (cur.n < 2) return;
        if (g.dx <= -24) cur.step(1);
        else if (g.dx >= 24) cur.step(-1);
      },
    }),
  ).current;

  if (n === 0) return null;

  // Neighbours wrap only when there are 3+ cards — for exactly 2, showing prev AND next would draw the
  // same card on both sides, so one side stays empty.
  const leftIdx = foreIndex > 0 ? foreIndex - 1 : n > 2 ? n - 1 : -1;
  const rightIdx = foreIndex < n - 1 ? foreIndex + 1 : n > 2 ? 0 : -1;
  // The fore is always enlarged (138×193) so the focused card is salient in every state (owner ruling
  // 2026-07-04, supersedes the board's same-size-in-entry P1); neighbours stay /cell 96×134.
  const foreW = 138;
  const foreH = 193;
  const dropY = 16;

  const neighbour = (idx: number, side: 'l' | 'r') =>
    idx < 0 ? null : (
      <Pressable
        key={items[idx]!.id}
        accessibilityRole="button"
        accessibilityLabel={`Focus ${items[idx]!.title}`}
        onPress={() => onFocus(idx)}
        style={[
          styles.nb,
          side === 'l' ? styles.nbL : styles.nbR,
          { transform: [{ rotate: side === 'l' ? '-4deg' : '4deg' }, { translateY: dropY }] },
        ]}
      >
        <GameCard title={items[idx]!.title} size="cell" />
      </Pressable>
    );

  return (
    <View {...pan.panHandlers}>
      <View style={styles.fan}>
        {neighbour(leftIdx, 'l')}
        {/* the fore — a plain View, so its own tap is inert (§0.7); neighbours + chevrons rotate it */}
        <View style={styles.fore}>
          <GameCard title={items[foreIndex]!.title} size="grid" style={{ width: foreW, height: foreH }} />
        </View>
        {neighbour(rightIdx, 'r')}
      </View>
      <View style={styles.nav}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous card" onPress={() => step(-1)} hitSlop={10} disabled={n < 2}>
          <Text style={[styles.chev, n < 2 && styles.chevOff]}>‹</Text>
        </Pressable>
        {items.map((it, i) => (
          <View key={it.id} style={[styles.dot, i === foreIndex && styles.dotOn]} />
        ))}
        <Pressable accessibilityRole="button" accessibilityLabel="Next card" onPress={() => step(1)} hitSlop={10} disabled={n < 2}>
          <Text style={[styles.chev, n < 2 && styles.chevOff]}>›</Text>
        </Pressable>
        <Text style={styles.swipe}>SWIPE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fan: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', paddingTop: theme.space.sm },
  nb: { zIndex: 1 },
  nbL: { marginRight: 5 },
  nbR: { marginLeft: 5 },
  fore: { zIndex: 2 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingTop: theme.space.lg },
  chev: { fontFamily: theme.font.screenBold, fontSize: theme.type.body, color: theme.scr.dim },
  chevOff: { opacity: 0.3 },
  // board `.fdot` — a 6px square (F-07; the board's corner-notch is a clip-path we don't replicate).
  dot: { width: 6, height: 6, backgroundColor: theme.scr.faint },
  dotOn: { backgroundColor: theme.scr.accent }, // F-09 selection = the on-screen accent
  swipe: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1.5, marginLeft: 5 },
});
