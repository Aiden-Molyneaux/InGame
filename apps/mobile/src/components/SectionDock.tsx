import type { ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { themedStyles, useTheme, withAlpha } from '../theme';

// SectionDock (component-map §5.3 — the ONE in-screen "pick a section" bar) — the shared bottom-docked
// section switcher the Game page (PLAY · CARDS · ABOUT) and the Device editor (SHELL · THEME · STICKERS
// · LOOKS) both render (owner ruling 2026-07-10: "they're essentially the same component — do them the
// same way"). The two were built twice (GameTabDock / DeviceSectionRail) with the same active grammar
// but different layouts; unified here to ONE stacked (icon-over-label) treatment that scales to 3 AND 4
// items. Active = accent BORDER + accent tint + accent icon/label (the SectionSwitch grammar, F-09 — a
// border, NOT a pressed keycap and NOT a StateMark pip). F-07 square. Instant (no transition —
// reduce-motion no-op). Each surface supplies its own icon set + labels; this owns the shape + styling.

export interface SectionDockItem<T extends string> {
  value: T;
  label: string;
  /** render the section's glyph at the given ink + square size (the surface owns its viewBox). */
  renderIcon: (color: string, size: number) => ReactNode;
}

const ICON = 20;

export function SectionDock<T extends string>({
  items,
  value,
  onChange,
}: {
  items: SectionDockItem<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={styles.dock} accessibilityRole="tablist">
      {items.map((it) => {
        const active = it.value === value;
        return (
          <Pressable
            key={it.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={it.label}
            onPress={() => onChange(it.value)}
            style={[styles.seg, active && styles.segActive]}
          >
            {it.renderIcon(active ? t.scr.accent : t.scr.dim, ICON)}
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = themedStyles((t) => ({
  dock: {
    flexDirection: 'row',
    gap: t.space.sm,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
    backgroundColor: t.scr.bg,
    borderTopWidth: 1,
    borderTopColor: t.scr.hairline,
  },
  seg: {
    flex: 1,
    alignItems: 'center',
    gap: t.space.xs,
    paddingVertical: t.space.md,
    paddingHorizontal: t.space.xs,
    backgroundColor: t.scr.panel,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    borderRadius: t.corner.screen, // F-07 square
  },
  // border + icon + label + the fill wash all follow the theme accent (0070/OQ-144 — the wash is the
  // accent at 10%, so it reads teal under Mint / violet under Lilac, not a fixed orange).
  segActive: { borderColor: t.scr.accent, backgroundColor: withAlpha(t.scr.accent, 0.1) },
  label: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.body, // 11 (F-06)
    color: t.scr.dim,
    letterSpacing: 0.5,
  },
  labelActive: { color: t.scr.accent, fontFamily: t.font.screenBold },
}));
