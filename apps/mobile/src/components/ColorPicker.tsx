import { useEffect, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, Text, TextInput, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Rect, Stop } from 'react-native-svg';
import { themedStyles, useTheme } from '../theme';
import { useScrollLock } from './ScrollLock';

// ColorPicker (component-map §5.3 · CR-11 / decision 0067) — the SHARED colour surface: a hue strip +
// a saturation×value area + a HEX field, beside quick swatches + the in-card used-colours. Built for
// the Canvas EDIT slip-sheet fill/stroke (free-pick). The Styler title ink stays curated at M4
// (OQ-137/M5), so it does NOT mount this yet. All-square (F-07); accent/cream tokens only.
// Round 3 (design-spec 0.54): the picker APPLIES ON RELEASE — the in-picker preview (area · thumb ·
// swatch · hex) tracks the drag live, but `onChange` fires once when the finger lifts, so the card
// isn't re-patched every frame. The cursor never re-seeds off its own echo (`lastSentRef`), which
// was the "resets itself to a different colour" bug: a round-trip through 8-bit hex loses hue on
// desaturated picks. Held drags scroll-lock the host + `touchAction:none` on web.

// ── HSV ⇄ hex (no deps) ───────────────────────────────────────────────────────────────────────
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
function toHex(h: number, s: number, v: number): string {
  const [r, g, b] = hsvToRgb(h, s, v);
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}
function hexToHsv(hex: string): { h: number; s: number; v: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = Number.parseInt(m[1]!, 16);
  const r = (int >> 16) / 255;
  const g = ((int >> 8) & 0xff) / 255;
  const b = (int & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

// ColorField (CR-11 gate-5 refinement) — the DEFAULT colour control: the picker is NOT open unless
// asked. Shows the last-10 recents (most-recent-first) + the current swatch + an OPEN-PICKER button +
// an EYEDROPPER ("from card") that grabs a colour already on the active card. `onChange` applies live;
// `onCommit` records the pick into recents (discrete picks + picker close, not every HS-drag frame).
export function ColorField({
  value,
  onChange,
  onCommit,
  recents = [],
  cardColors = [],
}: {
  value: string;
  onChange: (hex: string) => void;
  onCommit?: (hex: string) => void;
  recents?: string[];
  cardColors?: string[];
}) {
  const fieldStyles = useFieldStyles();
  const [mode, setMode] = useState<'closed' | 'picker' | 'card'>('closed');
  const commit = (hex: string) => {
    onChange(hex);
    onCommit?.(hex);
  };

  // Recents populate on every COMMITTED colour. A live HS/hue drag inside the inner picker fires
  // onChange every frame (must NOT flood recents), so while the picker is open we DEBOUNCE the
  // commit: each picker onChange re-arms a timer that records the pick once the value settles
  // (~500ms of quiet). Closing the picker also commits the final value immediately. (CR-11 gate-5.)
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearSettle = () => {
    if (settleRef.current) {
      clearTimeout(settleRef.current);
      settleRef.current = null;
    }
  };
  const pickerChange = (hex: string) => {
    onChange(hex);
    if (!onCommit) return;
    clearSettle();
    settleRef.current = setTimeout(() => {
      settleRef.current = null;
      onCommit(hex);
    }, 500);
  };
  const closePicker = () => {
    clearSettle();
    onCommit?.(value); // record the final picked colour the instant the picker closes
    setMode('closed');
  };
  useEffect(() => clearSettle, []); // never leave a timer running past unmount
  const swatch = (c: string, key: string, onPress: () => void) => {
    const selected = c.toLowerCase() === value.toLowerCase();
    return (
      <Pressable
        key={key}
        accessibilityRole="button"
        accessibilityLabel={`Use ${c}`}
        accessibilityState={{ selected }}
        onPress={onPress}
        style={[fieldStyles.chip, { backgroundColor: c }, selected && fieldStyles.chipOn]}
      />
    );
  };
  const recentSet = [...new Set(recents)].slice(0, 10);
  // FROM CARD carries EVERY colour on the card — the base included (round 3: the old recents-filter
  // silently hid any card colour that had been used recently, which is exactly where the base went).
  const cardSeen = new Set<string>();
  const cardSet = cardColors.filter((c) => {
    const k = c.toLowerCase();
    if (cardSeen.has(k)) return false;
    cardSeen.add(k);
    return true;
  });
  return (
    <View style={[fieldStyles.wrap, WEB_NOSELECT]}>
      <View style={fieldStyles.header}>
        <View style={[fieldStyles.current, { backgroundColor: hueColorSafe(value) }]} />
        <View style={fieldStyles.recents}>
          {recentSet.length ? (
            recentSet.map((c, i) => swatch(c, `r${i}`, () => commit(c)))
          ) : (
            <Text style={fieldStyles.hint}>NO RECENT COLOURS YET</Text>
          )}
        </View>
      </View>
      <View style={fieldStyles.buttons}>
        <Btn label={mode === 'picker' ? 'CLOSE PICKER' : 'PICK COLOUR'} on={mode === 'picker'} onPress={() => {
          if (mode === 'picker') closePicker();
          else setMode('picker');
        }} />
        {cardColors.length ? (
          <Btn label={mode === 'card' ? 'CLOSE' : 'FROM CARD'} glyph={<EyedropperGlyph />} on={mode === 'card'} onPress={() => setMode((m) => (m === 'card' ? 'closed' : 'card'))} />
        ) : null}
      </View>
      {mode === 'picker' ? <ColorPicker value={value} onChange={pickerChange} swatches={[]} usedColors={[]} /> : null}
      {mode === 'card' ? (
        <View style={fieldStyles.cardRow}>
          {cardSet.length ? (
            cardSet.map((c, i) => swatch(c, `c${i}`, () => { commit(c); setMode('closed'); }))
          ) : (
            <Text style={fieldStyles.hint}>NO OTHER COLOURS ON THE CARD</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

function Btn({ label, on, onPress, glyph }: { label: string; on: boolean; onPress: () => void; glyph?: React.ReactNode }) {
  const fieldStyles = useFieldStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }} onPress={onPress} style={[fieldStyles.btn, glyph ? fieldStyles.btnGlyphed : null, on && fieldStyles.btnOn]}>
      {glyph ?? null}
      <Text style={fieldStyles.btnText}>{label}</Text>
    </Pressable>
  );
}

// Eyedropper / pipette glyph (CR-11 gate-5) — a slanted stem + a tip, drawn as an SVG (no emoji).
// The stem runs corner-to-corner; a short bulb caps the top-right, the tip points bottom-left.
function EyedropperGlyph() {
  const t = useTheme();
  const c = t.scr.ink;
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14">
      {/* the bulb cap (top-right) */}
      <Line x1="9.5" y1="1.5" x2="12.5" y2="4.5" stroke={c} strokeWidth={2.4} strokeLinecap="square" />
      {/* the slanted stem */}
      <Line x1="10.5" y1="3.5" x2="3.5" y2="10.5" stroke={c} strokeWidth={1.6} strokeLinecap="square" />
      {/* the drawing tip (bottom-left) */}
      <Line x1="3.5" y1="10.5" x2="1.5" y2="12.5" stroke={c} strokeWidth={1} strokeLinecap="round" />
    </Svg>
  );
}

const useFieldStyles = themedStyles((t) => ({
  wrap: { gap: t.space.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  current: { width: 26, height: 26, borderWidth: 1, borderColor: t.scr.hairline },
  recents: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
  chip: { width: 22, height: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  chipOn: { borderWidth: 1.5, borderColor: t.scr.accent },
  hint: { fontFamily: t.font.screenSemi, fontSize: t.type.micro, color: t.scr.faint, letterSpacing: 0.5 },
  buttons: { flexDirection: 'row', gap: t.space.sm },
  btn: { borderWidth: 1, borderColor: t.scr.hairline, backgroundColor: t.scr.panel, paddingHorizontal: t.space.md, paddingVertical: t.space.sm },
  btnGlyphed: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  btnOn: { borderWidth: 1.5, borderColor: t.scr.accent, backgroundColor: 'rgba(255,159,67,0.08)' },
  btnText: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.ink, letterSpacing: 0.5 },
  cardRow: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
}));

export function ColorPicker({
  value,
  onChange,
  swatches = [],
  usedColors = [],
}: {
  value: string;
  onChange: (hex: string) => void;
  swatches?: string[];
  usedColors?: string[];
}) {
  // HSV is the working state; hex is derived. Re-seed from `value` only when it changes EXTERNALLY
  // (a swatch tap / a different element pulled) — never while dragging, and never off our own echo:
  // the value we just sent comes back through the parent, and re-parsing it through 8-bit hex loses
  // hue/sat on desaturated colours, teleporting the cursor (the round-3 "resets itself" bug).
  const styles = useStyles();
  const [hsv, setHsv] = useState(() => hexToHsv(value) ?? { h: 0, s: 0, v: 0.9 });
  const [hexDraft, setHexDraft] = useState(value.toUpperCase());
  const draggingRef = useRef(false);
  const lastSentRef = useRef<string | null>(null);
  useEffect(() => {
    if (draggingRef.current) return;
    if (lastSentRef.current && value.toLowerCase() === lastSentRef.current) return; // our own echo
    // a REAL external change (another slip pulled, undo, …) reseeds — and retires the echo-guard, so
    // returning to a previously applied colour reseeds too (murr round 3 🟠F3: a sticky lastSent made
    // the picker show slip B's colour while editing slip A again)
    lastSentRef.current = null;
    const next = hexToHsv(value);
    if (next) setHsv(next);
    setHexDraft(value.toUpperCase());
  }, [value]);

  const send = (hex: string) => {
    lastSentRef.current = hex.toLowerCase();
    onChange(hex);
  };

  // live drag → PREVIEW only (area/thumb/swatch/hex track the finger); the release APPLIES (round 3)
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;
  const preview = (h: number, s: number, v: number) => {
    setHsv({ h, s, v });
    setHexDraft(toHex(h, s, v).toUpperCase());
  };
  const applyCurrent = () => {
    const { h, s, v } = hsvRef.current;
    send(toHex(h, s, v));
  };

  // Non-gesture nudge path (CARD-16 a11y) — a screen-reader increment/decrement can't ride the
  // preview→release ref dance (applyCurrent reads hsvRef, which lags a same-tick setHsv). So these
  // preview the new value AND apply it immediately from the passed-in numbers, not the stale ref.
  const stepSV = (s: number, v: number) => {
    preview(hsv.h, s, v);
    send(toHex(hsv.h, s, v));
  };
  const stepHue = (h: number) => {
    preview(h, hsv.s, hsv.v);
    send(toHex(h, hsv.s, hsv.v));
  };

  const commitHex = () => {
    const parsed = hexToHsv(hexDraft);
    if (parsed) {
      setHsv(parsed);
      send(toHex(parsed.h, parsed.s, parsed.v));
    } else {
      setHexDraft(toHex(hsv.h, hsv.s, hsv.v).toUpperCase()); // reject → snap back
    }
  };

  const swatchSet = [...new Set([...usedColors, ...swatches])].slice(0, 12);

  return (
    <View style={[styles.wrap, WEB_NOSELECT]} accessibilityLabel="Colour picker">
      {/* saturation × value area — white→hue across, transparent→black down */}
      <SVArea hue={hsv.h} s={hsv.s} v={hsv.v} onChange={(s, v) => preview(hsv.h, s, v)} onRelease={applyCurrent} onStep={stepSV} draggingRef={draggingRef} />
      {/* hue strip */}
      <HueStrip h={hsv.h} onChange={(h) => preview(h, hsv.s, hsv.v)} onRelease={applyCurrent} onStep={stepHue} draggingRef={draggingRef} />
      {/* hex field + the current swatch — the swatch previews the LIVE drag (value applies on release) */}
      <View style={styles.hexRow}>
        <View style={[styles.current, { backgroundColor: toHex(hsv.h, hsv.s, hsv.v) }]} />
        <Text style={styles.hexHash}>#</Text>
        <TextInput
          value={hexDraft.replace('#', '')}
          onChangeText={(t) => setHexDraft(`#${t}`)}
          onBlur={commitHex}
          onSubmitEditing={commitHex}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          style={styles.hexInput}
          accessibilityLabel="Hex colour"
        />
      </View>
      {swatchSet.length ? (
        <View style={styles.swatches}>
          {swatchSet.map((c) => {
            const selected = c.toLowerCase() === value.toLowerCase();
            return (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityLabel={`Use ${c}`}
                accessibilityState={{ selected }}
                onPress={() => send(c)}
                style={[styles.swatch, { backgroundColor: c }, selected && styles.swatchOn]}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function hueColorSafe(v: string): string {
  return /^#?[0-9a-f]{6}$/i.test(v) ? v : '#000000';
}

// The 2D SV area: two stacked svg gradients (white→hue, transparent→black) + a draggable thumb.
const A11Y_SV_STEP = 0.05; // 5% per screen-reader nudge on the SV area

function SVArea({
  hue,
  s,
  v,
  onChange,
  onRelease,
  onStep,
  draggingRef,
}: {
  hue: number;
  s: number;
  v: number;
  onChange: (s: number, v: number) => void;
  /** the finger lifted — APPLY the previewed colour (round 3: apply-on-release) */
  onRelease: () => void;
  /** CARD-16 non-gesture path — preview+apply a nudged (s,v) in one call (VoiceOver/TalkBack). */
  onStep: (s: number, v: number) => void;
  draggingRef: React.MutableRefObject<boolean>;
}) {
  const styles = useStyles();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const sizeRef = useRef({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    sizeRef.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
    setSize(sizeRef.current);
  };
  const scrollLock = useScrollLock();
  // the PanResponder closes once — route EVERY live callback through refs (murr round 3 🔴F1: a
  // frozen `onChange` kept the MOUNT-TIME hue, so a hue-then-SV drag snapped the pick back)
  const cbRef = useRef({ onChange, onRelease, scrollLock });
  cbRef.current = { onChange, onRelease, scrollLock };
  const set = (x: number, y: number) => {
    const { w, h } = sizeRef.current;
    if (w <= 0 || h <= 0) return;
    cbRef.current.onChange(Math.min(1, Math.max(0, x / w)), Math.min(1, Math.max(0, 1 - y / h)));
  };
  const heldRef = useRef(false); // an unmount mid-drag never fires release — unlock in cleanup (murr F5)
  useEffect(
    () => () => {
      if (heldRef.current) cbRef.current.scrollLock.unlock();
    },
    [],
  );
  const release = () => {
    draggingRef.current = false;
    heldRef.current = false;
    cbRef.current.scrollLock.unlock();
    cbRef.current.onRelease();
  };
  const releaseRef = useRef(release);
  releaseRef.current = release;
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        draggingRef.current = true;
        heldRef.current = true;
        cbRef.current.scrollLock.lock();
        set(e.nativeEvent.locationX, e.nativeEvent.locationY);
      },
      onPanResponderMove: (e) => set(e.nativeEvent.locationX, e.nativeEvent.locationY),
      onPanResponderRelease: () => releaseRef.current(),
      onPanResponderTerminate: () => releaseRef.current(),
    }),
  ).current;
  const hue100 = toHex(hue, 1, 1);
  const thumbLeft = s * size.w;
  const thumbTop = (1 - v) * size.h;
  return (
    <View
      style={[styles.sv, WEB_TOUCH]}
      onLayout={onLayout}
      accessibilityRole="adjustable"
      accessibilityLabel="Saturation and brightness"
      accessibilityValue={{ text: `Saturation ${Math.round(s * 100)} percent, brightness ${Math.round(v * 100)} percent` }}
      accessibilityActions={[
        { name: 'increment', label: 'Brighter' },
        { name: 'decrement', label: 'Darker' },
        { name: 'moreSaturation', label: 'More saturated' },
        { name: 'lessSaturation', label: 'Less saturated' },
      ]}
      onAccessibilityAction={(ev) => {
        // increment/decrement (swipe) drive BRIGHTNESS; the two custom actions drive SATURATION —
        // the honest 2D non-gesture fix. Exact colours still come from the labelled HEX field.
        const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
        const name = ev.nativeEvent.actionName;
        let ns = s;
        let nv = v;
        if (name === 'increment') nv = clamp01(v + A11Y_SV_STEP);
        else if (name === 'decrement') nv = clamp01(v - A11Y_SV_STEP);
        else if (name === 'moreSaturation') ns = clamp01(s + A11Y_SV_STEP);
        else if (name === 'lessSaturation') ns = clamp01(s - A11Y_SV_STEP);
        onStep(ns, nv);
      }}
      {...pan.panHandlers}
    >
      {size.w > 0 ? (
        <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id="sat" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#ffffff" />
              <Stop offset="1" stopColor={hue100} />
            </LinearGradient>
            <LinearGradient id="val" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000000" stopOpacity="0" />
              <Stop offset="1" stopColor="#000000" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={size.w} height={size.h} fill="url(#sat)" />
          <Rect x="0" y="0" width={size.w} height={size.h} fill="url(#val)" />
        </Svg>
      ) : null}
      <View pointerEvents="none" style={[styles.svThumb, { left: thumbLeft - 7, top: thumbTop - 7 }]} />
    </View>
  );
}

const A11Y_HUE_STEP = 10; // 10° per screen-reader nudge on the hue strip

function HueStrip({
  h,
  onChange,
  onRelease,
  onStep,
  draggingRef,
}: {
  h: number;
  onChange: (h: number) => void;
  /** the finger lifted — APPLY the previewed colour (round 3: apply-on-release) */
  onRelease: () => void;
  /** CARD-16 non-gesture path — preview+apply a nudged hue in one call (VoiceOver/TalkBack). */
  onStep: (h: number) => void;
  draggingRef: React.MutableRefObject<boolean>;
}) {
  const styles = useStyles();
  const [w, setW] = useState(0);
  const wRef = useRef(0);
  const onLayout = (e: LayoutChangeEvent) => {
    wRef.current = e.nativeEvent.layout.width;
    setW(e.nativeEvent.layout.width);
  };
  const scrollLock = useScrollLock();
  // route EVERY live callback through refs — the frozen-closure fix (murr round 3 🔴F1), as SVArea
  const cbRef = useRef({ onChange, onRelease, scrollLock });
  cbRef.current = { onChange, onRelease, scrollLock };
  const set = (x: number) => {
    if (wRef.current <= 0) return;
    cbRef.current.onChange(Math.min(359.9, Math.max(0, (x / wRef.current) * 360)));
  };
  const heldRef = useRef(false); // an unmount mid-drag never fires release — unlock in cleanup (murr F5)
  useEffect(
    () => () => {
      if (heldRef.current) cbRef.current.scrollLock.unlock();
    },
    [],
  );
  const release = () => {
    draggingRef.current = false;
    heldRef.current = false;
    cbRef.current.scrollLock.unlock();
    cbRef.current.onRelease();
  };
  const releaseRef = useRef(release);
  releaseRef.current = release;
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        draggingRef.current = true;
        heldRef.current = true;
        cbRef.current.scrollLock.lock();
        set(e.nativeEvent.locationX);
      },
      onPanResponderMove: (e) => set(e.nativeEvent.locationX),
      onPanResponderRelease: () => releaseRef.current(),
      onPanResponderTerminate: () => releaseRef.current(),
    }),
  ).current;
  const stops = [0, 60, 120, 180, 240, 300, 360];
  return (
    <View
      style={[styles.hue, WEB_TOUCH]}
      onLayout={onLayout}
      accessibilityRole="adjustable"
      accessibilityLabel="Hue"
      accessibilityValue={{ text: `${Math.round(h)} degrees` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(ev) => {
        const dir = ev.nativeEvent.actionName === 'increment' ? 1 : -1;
        onStep(Math.min(359.9, Math.max(0, h + dir * A11Y_HUE_STEP)));
      }}
      {...pan.panHandlers}
    >
      {w > 0 ? (
        <Svg width={w} height={16} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id="hue" x1="0" y1="0" x2="1" y2="0">
              {stops.map((deg) => (
                <Stop key={deg} offset={`${deg / 360}`} stopColor={toHex(deg % 360, 1, 1)} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={w} height={16} fill="url(#hue)" />
        </Svg>
      ) : null}
      <View pointerEvents="none" style={[styles.hueThumb, { left: (h / 360) * w - 4 }]} />
    </View>
  );
}

// web: stop the browser claiming a picker touch as a page pan, and stop drags leaving nearby labels
// text-selected (parvati round 3) — native ignores both props
const WEB_TOUCH = Platform.OS === 'web' ? ({ touchAction: 'none' } as object) : null;
const WEB_NOSELECT = Platform.OS === 'web' ? ({ userSelect: 'none' } as object) : null;

const useStyles = themedStyles((t) => ({
  wrap: { gap: t.space.sm },
  sv: { height: 120, borderWidth: 1, borderColor: t.scr.hairline, overflow: 'hidden' }, // 96→120 — finer S/V control (round 3)
  svThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderWidth: 2,
    borderColor: t.brand.cream,
    backgroundColor: 'transparent',
  },
  hue: { height: 16, borderWidth: 1, borderColor: t.scr.hairline, justifyContent: 'center' },
  hueThumb: { position: 'absolute', top: -1, width: 8, height: 18, backgroundColor: t.brand.cream, borderWidth: 1, borderColor: t.scr.hairline },
  hexRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  current: { width: 24, height: 24, borderWidth: 1, borderColor: t.scr.hairline },
  hexHash: { fontFamily: t.font.screenBold, fontSize: t.type.micro, color: t.scr.dim },
  hexInput: {
    flex: 1,
    fontFamily: t.font.screenBold,
    fontSize: t.type.body,
    color: t.scr.ink,
    letterSpacing: 2,
    borderWidth: 1,
    borderColor: t.scr.hairline,
    backgroundColor: t.scr.panel,
    paddingHorizontal: t.space.sm,
    paddingVertical: 4,
  },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm },
  swatch: { width: 26, height: 26, borderWidth: 1, borderColor: t.scr.hairline },
  swatchOn: { borderWidth: 2, borderColor: t.scr.accent },
}));
