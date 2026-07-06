import { Suspense, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../../theme';
import { PulledSheet } from '../PulledSheet';
import { LazyCardBed, LazyElementGlyph } from './lazySkia';
import { ESSENTIAL_ICONS } from '../../render/icons';
import { BASE_GRADIENTS } from '../../styler/roster';
import { COMPOSITION_SCHEMA_VERSION, MAX_ELEMENTS, type CardComposition, type CardElement } from '../../render/composition';

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
        <View style={styles.grid}>
          {SHAPES.map((s) => (
            <GlyphCell key={s.id} label={s.name} disabled={atCap} onPress={() => pick(s.make(nextFill))} preview={s.make('#c9c5e6')} />
          ))}
        </View>
      ) : null}

      {cat === 'icons' ? (
        <View style={styles.grid}>
          {ESSENTIAL_ICONS.map((ic) => (
            <GlyphCell
              key={ic.id}
              label={ic.name}
              disabled={atCap}
              onPress={() => pick({ type: 'icon', iconId: ic.id, x: 0.5, y: 0.42, w: 0.3, h: 0.22, fill: nextFill })}
              preview={{ type: 'icon', iconId: ic.id, x: 0.5, y: 0.5, w: 0.8, h: 0.8, fill: '#c9c5e6' }}
            />
          ))}
        </View>
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

      {cat === 'base' ? (
        <View style={styles.grid}>
          {baseOptions.map((b, i) => (
            <BaseSwatch key={i} base={b} selected={sameBase(b, currentBase)} onPress={() => onBase(b)} size={36} />
          ))}
        </View>
      ) : null}

      <View style={styles.baseRow}>
        <Text style={styles.baseLabel}>BASE</Text>
        {baseOptions.slice(0, 4).map((b, i) => (
          <BaseSwatch key={i} base={b} selected={sameBase(b, currentBase)} onPress={() => onBase(b)} size={26} />
        ))}
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

function GlyphCell({ label, preview, disabled, onPress }: { label: string; preview: CardElement; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add ${label.toLowerCase()}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.cell, disabled && styles.cellDisabled]}
    >
      <Suspense fallback={<View style={styles.cellFill} />}>
        <LazyElementGlyph element={preview} width={30} height={30} />
      </Suspense>
    </Pressable>
  );
}

function BaseSwatch({ base, selected, onPress, size }: { base: CardComposition['base']; selected: boolean; onPress: () => void; size: number }) {
  const comp: CardComposition = { schemaVersion: COMPOSITION_SCHEMA_VERSION, base, elements: [] };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Base ${'gradient' in base ? `gradient ${base.gradient[0]}` : base.fill}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.baseSwatch, { width: size, height: size }, selected && styles.baseSel]}
    >
      <Suspense fallback={<View style={styles.cellFill} />}>
        <LazyCardBed composition={comp} width={size - 3} height={size - 3} />
      </Suspense>
      {selected ? <View style={styles.swPip} /> : null}
    </Pressable>
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
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.scr.panel,
    borderWidth: 1,
    borderColor: theme.scr.hairline,
  },
  cellDisabled: { opacity: 0.35 },
  cellFill: { width: 30, height: 30, backgroundColor: theme.scr.panelHi },
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
