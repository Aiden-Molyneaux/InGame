import { Suspense, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../../theme';
import { PulledSheet } from '../PulledSheet';
import { SkiaErrorBoundary } from '../SkiaErrorBoundary';
import { LazyGlyphStrip } from './lazySkia';
import { ESSENTIAL_ICONS } from '../../render/icons';
import { MAX_ELEMENTS, type CardComposition, type CardElement } from '../../render/composition';

// AssetShelf / ElementTray (component-map §8b / board P3) — the ADD drawer: the app's ONE
// summoned-sheet grammar (PulledSheet — never a second summons). Categories SHAPES · LETTERS ·
// NUMBERS · ICONS over the 0063 §1 free Essentials (every vector free, 0017); a picked glyph lands
// on the bed as a NEW PULLED SLIP and counts against the cap-30 (OQ-008). LETTERS carries the
// typed-text entry (CARD-11; MOD-07 unscreened at M4 per decision 0062 §6). ★ favourites + search
// ride CARD-17 at-scale (ADDENDUM).
// CR-08 (gate-5): BASE dropped from ADD — base is no longer "added". It recolours via its pinned,
// non-deletable pseudo-slip in the LayerRack. `onBase`/`currentBase` stay on the signature (the
// CanvasSurface wiring is unchanged this pass) but are no longer surfaced here.

type Category = 'shapes' | 'letters' | 'numbers' | 'icons';

const FILLS = ['#f3ecd9', '#e8c14a', '#e85ad0', '#7ad0e8', '#a8c980'];

type ShapeSpec = { id: string; name: string; make: (fill: string) => CardElement };
const SHAPES: ShapeSpec[] = [
  { id: 'square', name: 'SQUARE', make: (f) => ({ type: 'rect', x: 0.5, y: 0.42, w: 0.32, h: 0.23, fill: f }) },
  { id: 'rounded', name: 'ROUNDED', make: (f) => ({ type: 'rect', radius: 0.3, x: 0.5, y: 0.42, w: 0.32, h: 0.23, fill: f }) },
  { id: 'circle', name: 'CIRCLE', make: (f) => ({ type: 'ellipse', x: 0.5, y: 0.42, w: 0.3, h: 0.215, fill: f }) },
  { id: 'ellipse', name: 'ELLIPSE', make: (f) => ({ type: 'ellipse', x: 0.5, y: 0.42, w: 0.4, h: 0.16, fill: f }) },
  { id: 'triangle', name: 'TRIANGLE', make: (f) => ({ type: 'poly', shape: 'triangle', x: 0.5, y: 0.42, w: 0.32, h: 0.23, fill: f }) },
  { id: 'pentagon', name: 'PENTAGON', make: (f) => ({ type: 'poly', shape: 'pentagon', x: 0.5, y: 0.42, w: 0.32, h: 0.23, fill: f }) },
  { id: 'hexagon', name: 'HEXAGON', make: (f) => ({ type: 'poly', shape: 'hexagon', x: 0.5, y: 0.42, w: 0.32, h: 0.23, fill: f }) },
  { id: 'octagon', name: 'OCTAGON', make: (f) => ({ type: 'poly', shape: 'octagon', x: 0.5, y: 0.42, w: 0.32, h: 0.23, fill: f }) },
  { id: 'star', name: 'STAR', make: (f) => ({ type: 'poly', shape: 'star', x: 0.5, y: 0.42, w: 0.34, h: 0.25, fill: f }) },
  { id: 'diamond', name: 'DIAMOND', make: (f) => ({ type: 'poly', shape: 'diamond', x: 0.5, y: 0.42, w: 0.3, h: 0.24, fill: f }) },
  { id: 'line', name: 'LINE', make: (f) => ({ type: 'rect', x: 0.5, y: 0.42, w: 0.6, h: 0.012, fill: f }) },
  { id: 'heart', name: 'HEART', make: (f) => ({ type: 'icon', iconId: 'heart', x: 0.5, y: 0.42, w: 0.32, h: 0.23, fill: f }) },
  { id: 'arrow', name: 'ARROW', make: (f) => ({ type: 'icon', iconId: 'arrow', x: 0.5, y: 0.42, w: 0.34, h: 0.2, fill: f }) },
];

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const NUMBERS = '0123456789'.split('');

export function AssetShelf({
  visible,
  onClose,
  count,
  currentBase,
  onAdd,
  onBase,
  inline = false,
}: {
  visible: boolean;
  onClose: () => void;
  count: number;
  currentBase: CardComposition['base'];
  onAdd: (el: CardElement) => void;
  onBase: (base: CardComposition['base']) => void;
  /** render inline in the CanvasSurface bottom panel (no PulledSheet/scrim/handle/title) */
  inline?: boolean;
}) {
  const [cat, setCat] = useState<Category>('shapes');
  const [textDraft, setTextDraft] = useState('');
  const atCap = count >= MAX_ELEMENTS;
  const nextFill = FILLS[count % FILLS.length]!;

  // round 3 — the grids span the PANEL width (they used to sit at a fixed 6×44 block narrower than
  // the category row); cells scale to an even fill of the measured width.
  const [shelfW, setShelfW] = useState(0);

  const pick = (el: CardElement) => {
    if (atCap) return;
    onAdd(el);
  };

  const inner = (
    <>
      {/* round 3 — the rack's cap-meter chip rides the ADD panel too (orange, CR-03/F-02 — this row
          was the one leftover GOLD count) */}
      <View style={styles.headRow}>
        <Text style={[styles.capChip, atCap && styles.capChipFull]}>
          {count} / {MAX_ELEMENTS}
        </Text>
        {atCap ? <Text style={styles.capFullNote}>THE RACK IS FULL</Text> : null}
      </View>
      <View style={styles.catRow}>
        {(
          [
            ['shapes', 'SHAPES'],
            ['letters', 'LETTERS'],
            ['numbers', 'NUMBERS'],
            ['icons', 'ICONS'],
          ] as Array<[Category, string]>
        ).map(([id, label]) => (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: cat === id }}
            onPress={() => setCat(id)}
            style={[styles.cat, cat === id && styles.catActive]}
          >
            <Text style={styles.catText}>{label}</Text>
            {cat === id ? <View style={styles.catPip} /> : null}
          </Pressable>
        ))}
        {/* favourites ride CARD-17 at-scale — present, honest, disabled */}
        <Pressable accessibilityRole="tab" accessibilityLabel="Favourites — arrives with the full library" accessibilityState={{ disabled: true }} disabled style={[styles.cat, styles.catDisabled]}>
          <Text style={styles.catText}>★</Text>
        </Pressable>
      </View>

      {cat === 'shapes' ? (
        <View style={styles.stretch} onLayout={(e) => setShelfW(e.nativeEvent.layout.width)}>
          <GlyphGrid
            items={SHAPES.map((s) => ({ label: s.name, preview: s.make('#c9c5e6'), make: () => s.make(nextFill) }))}
            disabled={atCap}
            onPick={pick}
            width={shelfW}
          />
        </View>
      ) : null}

      {cat === 'icons' ? (
        <View style={styles.stretch} onLayout={(e) => setShelfW(e.nativeEvent.layout.width)}>
          <GlyphGrid
            items={ESSENTIAL_ICONS.map((ic) => ({
              label: ic.name,
              preview: { type: 'icon', iconId: ic.id, x: 0.5, y: 0.5, w: 0.8, h: 0.8, fill: '#c9c5e6' } as CardElement,
              make: () => ({ type: 'icon', iconId: ic.id, x: 0.5, y: 0.42, w: 0.3, h: 0.22, fill: nextFill }) as CardElement,
            }))}
            disabled={atCap}
            onPick={pick}
            width={shelfW}
          />
        </View>
      ) : null}

      {cat === 'letters' || cat === 'numbers' ? (
        <View style={[styles.gap, styles.stretch]} onLayout={(e) => setShelfW(e.nativeEvent.layout.width)}>
          <View style={styles.grid}>
            {(cat === 'letters' ? LETTERS : NUMBERS).map((ch) => (
              <Pressable
                key={ch}
                accessibilityRole="button"
                accessibilityLabel={`Add ${ch}`}
                accessibilityState={{ disabled: atCap }}
                disabled={atCap}
                onPress={() => pick({ type: 'text', x: 0.5, y: 0.42, text: ch, size: 0.16, fontId: 'bold-display', fill: nextFill })}
                style={[styles.cell, alphaCellSize(shelfW), atCap && styles.cellDisabled]}
              >
                <Text style={styles.alpha}>{ch}</Text>
              </Pressable>
            ))}
          </View>
          {cat === 'letters' ? (
            <View style={styles.textRow}>
              <TextInput
                value={textDraft}
                onChangeText={setTextDraft}
                maxLength={24}
                placeholder="Add text…"
                placeholderTextColor={theme.scr.faint}
                style={styles.textInput}
                accessibilityLabel="Text to add"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add the text slip"
                accessibilityState={{ disabled: atCap || !textDraft.trim() }}
                disabled={atCap || !textDraft.trim()}
                onPress={() => {
                  const t = textDraft.trim();
                  if (!t) return;
                  pick({ type: 'text', x: 0.5, y: 0.42, text: t, size: 0.08, fontId: 'clean-sans', fill: nextFill });
                  setTextDraft('');
                }}
                style={[styles.textGo, (atCap || !textDraft.trim()) && styles.cellDisabled]}
              >
                <Text style={styles.textGoLabel}>ADD ▸</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
    </>
  );

  if (inline) {
    return (
      <ScrollView style={styles.inlineScroll} contentContainerStyle={styles.inlineBody} keyboardShouldPersistTaps="handled">
        {inner}
      </ScrollView>
    );
  }

  return (
    <PulledSheet visible={visible} onClose={onClose} title="Add slip — all free">
      {inner}
    </PulledSheet>
  );
}

// ONE canvas per grid (the WebGL-context budget): the strip draws every glyph; transparent
// Pressables overlay each cell for taps + a11y. CR-07 (gate-5): bigger tiles. Round 3: the grid
// SPANS the measured panel width — the cell scales to an even 6-column fill (the fixed 44px block
// sat narrower than the category row); the single-context strip builder is unchanged (never a
// per-cell canvas — the WebGL ceiling, ADDENDUM).
const CELL = 44; // the MINIMUM cell (pre-measure fallback + the letters/numbers floor)
const CELL_GAP = 5;
const GLYPH_INSET = 8; // glyph = cell − inset (4px breathing on each side)
const COLS = 6;

/** letters/numbers: as many ≥44px cells as fit, scaled up to fill the measured row evenly */
function alphaCellSize(shelfW: number): { width: number; height: number } | null {
  if (shelfW <= 0) return null;
  const n = Math.max(1, Math.floor((shelfW + CELL_GAP) / (CELL + CELL_GAP)));
  const w = (shelfW - (n - 1) * CELL_GAP) / n;
  return { width: w, height: w };
}

function GlyphGrid({
  items,
  disabled,
  onPick,
  width: shelfW,
}: {
  items: Array<{ label: string; preview: CardElement; make: () => CardElement }>;
  disabled: boolean;
  onPick: (el: CardElement) => void;
  /** the measured panel width — 0 until the first layout (falls back to the 44px cell) */
  width: number;
}) {
  const cell = shelfW > 0 ? (shelfW - (COLS - 1) * CELL_GAP) / COLS : CELL;
  const stride = cell + CELL_GAP;
  const glyph = cell - GLYPH_INSET;
  const rows = Math.ceil(items.length / COLS);
  const width = COLS * stride - CELL_GAP;
  const height = rows * stride - CELL_GAP;
  return (
    <View style={{ width, height }}>
      <View pointerEvents="none" style={styles.gridStrip}>
        <SkiaErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <LazyGlyphStrip
              cells={items.map((it) => ({ el: it.preview, bg: theme.scr.panel }))}
              cellW={glyph}
              cellH={glyph}
              strideX={stride}
              strideY={stride}
              cols={COLS}
              width={width}
              height={height}
            />
          </Suspense>
        </SkiaErrorBoundary>
      </View>
      {items.map((it, i) => (
        <Pressable
          key={it.label + i}
          accessibilityRole="button"
          accessibilityLabel={`Add ${it.label.toLowerCase()}`}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => onPick(it.make())}
          style={[
            styles.cellOverlay,
            { width: cell, height: cell, position: 'absolute', left: (i % COLS) * stride, top: Math.floor(i / COLS) * stride },
            disabled && styles.cellDisabled,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  inlineScroll: { flexGrow: 0 },
  inlineBody: { gap: theme.space.lg, paddingBottom: theme.space.md },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  stretch: { alignSelf: 'stretch' },
  // round 3 — the SAME orange cap-meter chip as the rack (CR-03/F-02: the count is never gold)
  capChip: {
    fontFamily: theme.font.screenBold,
    fontSize: theme.type.micro,
    color: theme.scr.accent,
    borderWidth: 1,
    borderColor: 'rgba(255,159,67,0.5)',
    backgroundColor: 'rgba(255,159,67,0.08)',
    paddingHorizontal: theme.space.sm,
    paddingVertical: 2,
  },
  capChipFull: {
    color: theme.brand.alert,
    borderColor: 'rgba(227,65,78,0.55)',
    backgroundColor: 'rgba(227,65,78,0.1)',
  },
  capFullNote: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.brand.alert, letterSpacing: 1 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm + 2 },
  cat: { backgroundColor: theme.brand.cream, paddingHorizontal: theme.space.md, paddingVertical: theme.space.sm + 1 },
  catActive: { backgroundColor: theme.brand.creamPressed }, // scanline-energize base tone (pressed cream)
  catDisabled: { opacity: 0.4 },
  catText: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.brand.navy, letterSpacing: 1 },
  catPip: { position: 'absolute', top: -2.5, right: -2.5, width: 7, height: 7, backgroundColor: theme.scr.accent },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm + 1 },
  gap: { gap: theme.space.md },
  cell: {
    width: CELL,
    height: CELL,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.scr.panel,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
  },
  cellOverlay: {
    // width/height ride inline (the cell scales to the measured panel width — round 3)
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    backgroundColor: 'transparent', // the strip canvas behind carries the glyph
  },
  cellDisabled: { opacity: 0.35 },
  gridStrip: { position: 'absolute', left: 4, top: 4 },
  alpha: { fontFamily: theme.font.screenBold, fontSize: theme.type.body, color: theme.scr.ink },
  textRow: { flexDirection: 'row', gap: theme.space.md, alignItems: 'center' },
  textInput: {
    flex: 1,
    fontFamily: theme.font.screen,
    fontSize: theme.type.body,
    color: theme.scr.ink,
    backgroundColor: theme.scr.panel,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm + 2,
  },
  textGo: { backgroundColor: theme.scr.accent, paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md },
  textGoLabel: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.accentInk, letterSpacing: 1 },
});
