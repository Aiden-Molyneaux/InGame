import { Suspense, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../../theme';
import { PulledSheet } from '../PulledSheet';
import { LazyBaseStrip, LazyGlyphStrip } from './lazySkia';
import { ESSENTIAL_ICONS } from '../../render/icons';
import { BASE_GRADIENTS } from '../../styler/roster';
import { MAX_ELEMENTS, type CardComposition, type CardElement } from '../../render/composition';

// AssetShelf / ElementTray (component-map §8b / board P3) — the ADD drawer: the app's ONE
// summoned-sheet grammar (PulledSheet — never a second summons). Categories SHAPES · LETTERS ·
// NUMBERS · ICONS · BASE over the 0063 §1 free Essentials (every vector free, 0017); a picked
// glyph lands on the bed as a NEW PULLED SLIP and counts against the cap-30 (OQ-008). LETTERS
// carries the typed-text entry (CARD-11; MOD-07 unscreened at M4 per decision 0062 §6). The BASE
// row patches the base — not an element. ★ favourites + search ride CARD-17 at-scale (ADDENDUM).

type Category = 'shapes' | 'letters' | 'numbers' | 'icons' | 'base';

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
const SOLID_BASES = ['#1c1a2e', '#0d0b1e'];

export function AssetShelf({
  visible,
  onClose,
  count,
  currentBase,
  onAdd,
  onBase,
}: {
  visible: boolean;
  onClose: () => void;
  count: number;
  currentBase: CardComposition['base'];
  onAdd: (el: CardElement) => void;
  onBase: (base: CardComposition['base']) => void;
}) {
  const [cat, setCat] = useState<Category>('shapes');
  const [textDraft, setTextDraft] = useState('');
  const atCap = count >= MAX_ELEMENTS;
  const nextFill = FILLS[count % FILLS.length]!;

  const baseOptions = useMemo<Array<CardComposition['base']>>(
    () => [...BASE_GRADIENTS.map((g) => ({ gradient: g }) as CardComposition['base']), ...SOLID_BASES.map((fill) => ({ fill }))],
    [],
  );

  const pick = (el: CardElement) => {
    if (atCap) return;
    onAdd(el);
  };

  return (
    <PulledSheet visible={visible} onClose={onClose} title="Add a slip — all free">
      <View style={styles.headRow}>
        <Text style={[styles.capText, atCap && styles.capFull]}>
          {count} / {MAX_ELEMENTS}
          {atCap ? ' — THE RACK IS FULL' : ''}
        </Text>
      </View>
      <View style={styles.catRow}>
        {(
          [
            ['shapes', 'SHAPES'],
            ['letters', 'LETTERS'],
            ['numbers', 'NUMBERS'],
            ['icons', 'ICONS'],
            ['base', 'BASE'],
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
        <GlyphGrid
          items={SHAPES.map((s) => ({ label: s.name, preview: s.make('#c9c5e6'), make: () => s.make(nextFill) }))}
          disabled={atCap}
          onPick={pick}
        />
      ) : null}

      {cat === 'icons' ? (
        <GlyphGrid
          items={ESSENTIAL_ICONS.map((ic) => ({
            label: ic.name,
            preview: { type: 'icon', iconId: ic.id, x: 0.5, y: 0.5, w: 0.8, h: 0.8, fill: '#c9c5e6' } as CardElement,
            make: () => ({ type: 'icon', iconId: ic.id, x: 0.5, y: 0.42, w: 0.3, h: 0.22, fill: nextFill }) as CardElement,
          }))}
          disabled={atCap}
          onPick={pick}
        />
      ) : null}

      {cat === 'letters' || cat === 'numbers' ? (
        <View style={styles.gap}>
          <View style={styles.grid}>
            {(cat === 'letters' ? LETTERS : NUMBERS).map((ch) => (
              <Pressable
                key={ch}
                accessibilityRole="button"
                accessibilityLabel={`Add ${ch}`}
                accessibilityState={{ disabled: atCap }}
                disabled={atCap}
                onPress={() => pick({ type: 'text', x: 0.5, y: 0.42, text: ch, size: 0.16, fontId: 'bold-display', fill: nextFill })}
                style={[styles.cell, atCap && styles.cellDisabled]}
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

      {cat === 'base' ? <BaseRowStrip bases={baseOptions} current={currentBase} onBase={onBase} cell={36} /> : null}

      <View style={styles.baseRow}>
        <Text style={styles.baseLabel}>BASE</Text>
        <BaseRowStrip bases={baseOptions.slice(0, 4)} current={currentBase} onBase={onBase} cell={26} />
        <Text style={styles.baseHint}>A NEW SLIP JOINS THE RACK, PULLED</Text>
      </View>
    </PulledSheet>
  );
}

function sameBase(a: CardComposition['base'], b: CardComposition['base']): boolean {
  if ('gradient' in a && 'gradient' in b) return a.gradient[0] === b.gradient[0] && a.gradient[1] === b.gradient[1];
  if ('fill' in a && 'fill' in b) return a.fill === b.fill;
  return false;
}

// ONE canvas per grid (the WebGL-context budget): the strip draws every glyph; transparent
// Pressables overlay each cell for taps + a11y.
const CELL = 36;
const CELL_GAP = 5;
const CELL_STRIDE = CELL + CELL_GAP;
const GLYPH = 28;
const COLS = 8;

function GlyphGrid({
  items,
  disabled,
  onPick,
}: {
  items: Array<{ label: string; preview: CardElement; make: () => CardElement }>;
  disabled: boolean;
  onPick: (el: CardElement) => void;
}) {
  const rows = Math.ceil(items.length / COLS);
  const width = COLS * CELL_STRIDE - CELL_GAP;
  const height = rows * CELL_STRIDE - CELL_GAP;
  return (
    <View style={{ width, height }}>
      <View pointerEvents="none" style={styles.gridStrip}>
        <Suspense fallback={null}>
          <LazyGlyphStrip
            cells={items.map((it) => ({ el: it.preview, bg: theme.scr.panel }))}
            cellW={GLYPH}
            cellH={GLYPH}
            strideX={CELL_STRIDE}
            strideY={CELL_STRIDE}
            cols={COLS}
            width={width}
            height={height}
          />
        </Suspense>
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
            { position: 'absolute', left: (i % COLS) * CELL_STRIDE, top: Math.floor(i / COLS) * CELL_STRIDE },
            disabled && styles.cellDisabled,
          ]}
        />
      ))}
    </View>
  );
}

/** A base-swatch row/grid — ONE canvas + overlay Pressables (selection ring on the overlay). */
function BaseRowStrip({
  bases,
  current,
  onBase,
  cell,
}: {
  bases: Array<CardComposition['base']>;
  current: CardComposition['base'];
  onBase: (b: CardComposition['base']) => void;
  cell: number;
}) {
  const stride = cell + CELL_GAP;
  const width = bases.length * stride - CELL_GAP;
  return (
    <View style={{ width, height: cell }}>
      <View pointerEvents="none" style={styles.baseStripWrap}>
        <Suspense fallback={null}>
          <LazyBaseStrip bases={bases} cell={cell} stride={stride} width={width} height={cell} />
        </Suspense>
      </View>
      {bases.map((b, i) => {
        const selected = sameBase(b, current);
        return (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`Base ${'gradient' in b ? `gradient ${b.gradient[0]}` : b.fill}`}
            accessibilityState={{ selected }}
            onPress={() => onBase(b)}
            style={[styles.baseSwatch, { position: 'absolute', left: i * stride, width: cell, height: cell }, selected && styles.baseSel]}
          >
            {selected ? <View style={styles.swPip} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center' },
  capText: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.brand.gold, letterSpacing: 1 },
  capFull: { color: theme.brand.alert },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm + 2 },
  cat: { backgroundColor: theme.brand.cream, paddingHorizontal: theme.space.md, paddingVertical: theme.space.sm + 1 },
  catActive: { backgroundColor: '#d9d4c2' }, // scanline-energize base tone (pressed cream)
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
    width: CELL,
    height: CELL,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
    backgroundColor: 'transparent', // the strip canvas behind carries the glyph
  },
  cellDisabled: { opacity: 0.35 },
  gridStrip: { position: 'absolute', left: 4, top: 4 },
  baseStripWrap: { position: 'absolute', left: 0, top: 0 },
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
  baseRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md, borderTopWidth: 1, borderTopColor: theme.scr.hairline, paddingTop: theme.space.md },
  baseLabel: { fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: theme.scr.dim, letterSpacing: 1.5 },
  baseSwatch: { borderWidth: 1, borderColor: theme.scr.hairline, alignItems: 'center', justifyContent: 'center' },
  baseSel: { borderWidth: 1.5, borderColor: theme.scr.accent },
  swPip: { position: 'absolute', top: -2.5, right: -2.5, width: 7, height: 7, backgroundColor: theme.scr.accent },
  baseHint: { flex: 1, textAlign: 'right', fontFamily: theme.font.screenSemi, fontSize: theme.type.micro, color: theme.scr.faint, letterSpacing: 0.5 },
});
