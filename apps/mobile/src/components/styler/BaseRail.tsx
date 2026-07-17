import { useRef, useState } from 'react';
import { View, Text, Pressable, PanResponder } from 'react-native';
import { CardFace } from '../CardFace';
import { EquipReadout } from '../game/EquipReadout';
import { themedStyles } from '../../theme';
import type { CardComposition } from '../../render/composition';

// BaseRail (component-map §8a / board P1) — the start-from fan: never blank, never community-
// dependent (CARD-16/18). Sources = free templates · preset kits (0063) · [CARD-24b] the user's
// saved STYLE PRESETS, merged client-side. The centered FORE is the live choice. It behaves like
// the Add-Game fan (owner gate-5 D.17): SWIPE rotates, a NEIGHBOUR TAP brings that card forefront,
// chevrons + dots still work; the fore's own tap is inert (the §0.7 focus-only precedent). The
// fore's style details read as the same chip tiles used app-wide (EquipReadout), not prose.

export interface RailEntry {
  id: string;
  name: string;
  kindLabel: string; // DEFAULT · TEMPLATE · KIT · PRESET
  composition: CardComposition;
}

const SWIPE_PX = 40; // a deliberate horizontal drag, not a tap wobble

export function BaseRail({
  entries,
  foreIndex,
  onFocus,
  title,
}: {
  entries: RailEntry[];
  foreIndex: number;
  onFocus: (i: number) => void;
  title: string;
}) {
  const [pressedChev, setPressedChev] = useState<'l' | 'r' | null>(null);
  const n = entries.length;
  const fore = entries[foreIndex];
  const left = entries[(foreIndex - 1 + n) % n];
  const right = entries[(foreIndex + 1) % n];

  // rotate() reads the CURRENT index from a ref — the PanResponder is created once and would
  // otherwise close over a stale foreIndex.
  const foreRef = useRef(foreIndex);
  foreRef.current = foreIndex;
  const nRef = useRef(n);
  nRef.current = n;
  const rotate = (dir: 1 | -1) => onFocus((foreRef.current + dir + nRef.current) % nRef.current);

  const pan = useRef(
    PanResponder.create({
      // claim only real horizontal drags — taps fall through to the neighbour Pressables
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_e, g) => {
        if (g.dx <= -SWIPE_PX) rotate(1);
        else if (g.dx >= SWIPE_PX) rotate(-1);
      },
    }),
  ).current;

  const styles = useStyles();

  if (!fore || n === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.fan} {...pan.panHandlers}>
        {n > 1 && left ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Bring ${left.name} to the front`}
            onPress={() => onFocus((foreIndex - 1 + n) % n)}
            style={[styles.nb, { transform: [{ rotate: '-4deg' }, { translateY: 10 }] }]}
          >
            <CardFace title={left.name} composition={left.composition} width={96} height={134} />
          </Pressable>
        ) : null}
        <View style={styles.fore}>
          <CardFace title={fore.name} composition={fore.composition} width={138} height={193} />
        </View>
        {n > 1 && right ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Bring ${right.name} to the front`}
            onPress={() => onFocus((foreIndex + 1) % n)}
            style={[styles.nb, { transform: [{ rotate: '4deg' }, { translateY: 10 }] }]}
          >
            <CardFace title={right.name} composition={right.composition} width={96} height={134} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.dotsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous start"
          onPress={() => rotate(-1)}
          onPressIn={() => setPressedChev('l')}
          onPressOut={() => setPressedChev(null)}
          hitSlop={10}
        >
          <Text style={[styles.chev, pressedChev === 'l' && styles.chevPressed]}>‹</Text>
        </Pressable>
        {entries.map((e, i) => (
          <View key={e.id} style={[styles.dot, i === foreIndex && styles.dotOn]} />
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next start"
          onPress={() => rotate(1)}
          onPressIn={() => setPressedChev('r')}
          onPressOut={() => setPressedChev(null)}
          hitSlop={10}
        >
          <Text style={[styles.chev, pressedChev === 'r' && styles.chevPressed]}>›</Text>
        </Pressable>
      </View>

      {/* the fore, named once + its style details as the app-wide chip tiles (gate-5 D.17);
          the type token is suppressed when it equals the name — no "DEFAULT — DEFAULT" (taste #1) */}
      <Text style={styles.foreName}>
        {fore.name}
        {fore.kindLabel !== fore.name ? <Text style={styles.foreKind}> — {fore.kindLabel}</Text> : null}
      </Text>
      <View style={styles.chips}>
        <EquipReadout composition={fore.composition} />
      </View>
      <Text style={styles.hint}>{title}</Text>
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  wrap: { alignItems: 'center', gap: t.space.md },
  fan: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: t.space.md },
  fore: { zIndex: 2 },
  nb: { opacity: 0.8 },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  chev: { fontFamily: t.font.screenBold, fontSize: t.type.title, color: t.scr.dim, paddingHorizontal: t.space.sm },
  chevPressed: { color: t.scr.accent },
  dot: { width: 6, height: 6, backgroundColor: t.scr.panelHi },
  dotOn: { backgroundColor: t.scr.accent },
  foreName: { fontFamily: t.font.screenBold, fontSize: t.type.body, color: t.scr.ink, letterSpacing: 0.5 },
  foreKind: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.dim, letterSpacing: 1 },
  chips: { alignItems: 'center', paddingHorizontal: t.space.lg },
  hint: { fontFamily: t.font.screen, fontSize: t.type.micro, color: t.scr.faint, textAlign: 'center', lineHeight: 15, paddingHorizontal: t.space.lg },
}));
