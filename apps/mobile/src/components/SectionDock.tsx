import type { ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
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
  /**
   * W-D1 (game-page CATALOG) — a LOCKED section wears an inline padlock, dims to faint, and cannot be
   * selected (the press is inert). Used for the CATALOG posture's PLAY key: it isn't a reachable tab
   * until you own the game (board M6/M8). Absent/false everywhere else.
   */
  locked?: boolean;
}

const ICON = 20;

// The inline padlock for a locked section (board M6/M8) — a small shackle + body, drawn at the item ink.
function LockGlyph({ color }: { color: string }) {
  return (
    <Svg width={11} height={11} viewBox="0 0 16 16">
      <Path d="M5 7 V5 a3 3 0 0 1 6 0 V7" fill="none" stroke={color} strokeWidth={1.6} />
      <Rect x={3.5} y={7} width={9} height={6.5} rx={1.2} fill="none" stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

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
        const active = it.value === value && !it.locked;
        const ink = it.locked ? t.scr.faint : active ? t.scr.accent : t.scr.dim;
        return (
          <Pressable
            key={it.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active, disabled: !!it.locked }}
            accessibilityLabel={it.locked ? `${it.label} (locked)` : it.label}
            disabled={it.locked}
            onPress={() => onChange(it.value)}
            style={[styles.seg, active && styles.segActive, it.locked && styles.segLocked]}
          >
            {it.renderIcon(ink, ICON)}
            <View style={styles.labelRow}>
              <Text style={[styles.label, active && styles.labelActive, it.locked && styles.labelLocked]} numberOfLines={1}>
                {it.label}
              </Text>
              {it.locked ? <LockGlyph color={t.scr.faint} /> : null}
            </View>
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
  segLocked: { opacity: 0.7 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: {
    fontFamily: t.font.screenSemi,
    fontSize: t.type.body, // 11 (F-06)
    color: t.scr.dim,
    letterSpacing: 0.5,
  },
  labelActive: { color: t.scr.accent, fontFamily: t.font.screenBold },
  labelLocked: { color: t.scr.faint },
}));
