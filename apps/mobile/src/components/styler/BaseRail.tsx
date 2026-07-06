import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { CardFace } from '../CardFace';
import { theme } from '../../theme';
import type { CardComposition } from '../../render/composition';

// BaseRail (component-map §8a / board P1) — the start-from fan: never blank, never community-
// dependent (CARD-16/18). Sources = DEFAULT · free templates · preset kits (0063) · [CARD-24b] the
// user's saved STYLE PRESETS, merged client-side. The centered FORE is the live choice; chevrons
// (and the dots) rotate — the fore's own tap is inert (the §0.7 focus-only precedent).

export interface RailEntry {
  id: string;
  name: string;
  kindLabel: string; // DEFAULT · TEMPLATE · KIT · PRESET
  composition: CardComposition;
}

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
  if (!fore || n === 0) return null;

  const rotate = (dir: 1 | -1) => onFocus((foreIndex + dir + n) % n);

  return (
    <View style={styles.wrap}>
      <View style={styles.fan}>
        {n > 1 && left ? (
          <View style={[styles.nb, { transform: [{ rotate: '-4deg' }, { translateY: 10 }] }]}>
            <CardFace title={left.name} composition={left.composition} width={96} height={134} />
          </View>
        ) : null}
        <View style={styles.fore}>
          <CardFace title={fore.name} composition={fore.composition} width={138} height={193} />
        </View>
        {n > 1 && right ? (
          <View style={[styles.nb, { transform: [{ rotate: '4deg' }, { translateY: 10 }] }]}>
            <CardFace title={right.name} composition={right.composition} width={96} height={134} />
          </View>
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
        <Text style={styles.swipeLbl}>BROWSE</Text>
      </View>

      <Text style={styles.baseLbl}>
        {left && n > 1 ? `${left.name} · ` : ''}
        <Text style={styles.baseLblFore}>
          {fore.name} — {fore.kindLabel} · FOREFRONT
        </Text>
        {right && n > 1 ? ` · ${right.name}` : ''}
      </Text>
      <Text style={styles.hint}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: theme.space.md },
  fan: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: theme.space.md },
  fore: { zIndex: 2 },
  nb: { opacity: 0.8 },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  chev: { fontFamily: theme.font.screenBold, fontSize: theme.type.title, color: theme.scr.dim, paddingHorizontal: theme.space.sm },
  chevPressed: { color: theme.scr.accent },
  dot: { width: 6, height: 6, backgroundColor: theme.scr.panelHi },
  dotOn: { backgroundColor: theme.scr.accent },
  swipeLbl: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.scr.faint, letterSpacing: 1, marginLeft: theme.space.sm },
  baseLbl: { fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 0.5, textAlign: 'center' },
  baseLblFore: { color: theme.scr.ink, fontFamily: theme.font.screenBold },
  hint: { fontFamily: theme.font.screen, fontSize: theme.type.micro, color: theme.scr.faint, textAlign: 'center', lineHeight: 15, paddingHorizontal: theme.space.lg },
});
