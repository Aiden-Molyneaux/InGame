import { useId } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Circle, Line, Path } from 'react-native-svg';
import type { CosmeticType } from '@ingame/shared';
import { theme, useTheme } from '../../theme';
import { FONT_FAMILY, previewFontSize, platePath } from '../../render/previewPrimitives';
import { FRAMES, EFFECTS, FINISHES, NAMEPLATES } from '../../styler/roster';
import { MiniDevice } from '../MiniDevice';
import { ThemeSwatch } from '../device/ThemeSwatch';

// CosmeticSwatch (M5 F-6 · board rack-tile grammar) — the cosmetic shown APPLIED, so the shopper isn't
// guessing (owner device-walk note 2). Each store surface (aisle row · featured ItemTile · ItemSheet
// preview) renders the item on a neutral sample: frames/effects/finishes = a mini sample CARD wearing
// the item · nameplates = the mini title-plate chip · fonts = the "Aa" swatch · shells = MiniDevice ·
// themes = ThemeSwatch. OQ-138 — these are PLAIN VIEWS/SVG, never per-row Skia canvases (the live Skia
// card lives in the editor only); the frame/effect/finish samples are lightweight react-native-svg
// (a native SVG view), driven by the roster's colour/param metadata exactly as the board's CSS was.
// The plate/font primitives are shared with the Styler rails (render/previewPrimitives.ts).
//
// Animated cosmetics (marquee frame · frost/embers effects · holographic/metallic finishes) preview as
// their STATIC first-frame/tint here — the motion is an editor/card concern, not a shopping thumbnail.

const SIZES = {
  row: { w: 42, h: 58, plate: { w: 44, h: 20 }, font: 46 },
  sheet: { w: 88, h: 122, plate: { w: 104, h: 34 }, font: 92 },
} as const;
export type SwatchSize = keyof typeof SIZES;

export function CosmeticSwatch({
  type,
  id,
  size = 'row',
}: {
  type: CosmeticType;
  id: string;
  size?: SwatchSize;
}) {
  switch (type) {
    case 'device_shell':
      return <MiniDevice shellId={id} />;
    case 'screen_theme':
      return <ThemeSwatch themeId={id} />;
    case 'font':
      return <FontSwatch fontId={id} size={size} />;
    case 'nameplate':
      return <PlateSwatch shape={shapeForNameplate(id)} size={size} />;
    case 'frame':
      return <SampleCard size={size} frameId={id} />;
    case 'effect':
      return <SampleCard size={size} effectId={id} />;
    case 'finish':
      return <SampleCard size={size} finishId={id} />;
    default:
      return <SampleCard size={size} />;
  }
}

function shapeForNameplate(id: string): string {
  return NAMEPLATES.find((n) => n.id === id)?.shape ?? 'slab';
}

// ── The neutral sample CARD wearing a frame / effect / finish (board `.gcard.cell-size fr-* fx-* fin-*`)
export function SampleCard({
  size,
  frameId,
  effectId,
  finishId,
}: {
  size: SwatchSize;
  frameId?: string;
  effectId?: string;
  finishId?: string;
}) {
  const { w, h } = SIZES[size];
  const uid = useId().replace(/:/g, '');
  const frame = frameId ? FRAMES.find((f) => f.id === frameId) : undefined;
  const effectKind = effectId ? EFFECTS.find((e) => e.id === effectId)?.kind : undefined;
  const finishKind = finishId ? FINISHES.find((f) => f.id === finishId)?.kind : undefined;
  const label = 'cosmetic preview';

  // The frame band (roster kind+color+width). CLEAN (kind null) draws no band. Double-line draws a
  // second inner rule. A mini sample only needs the tone read, not the full renderer geometry.
  const bandW = frame && frame.kind ? Math.max(2, Math.round(frame.width * w * 2)) : 0;

  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} accessibilityLabel={label}>
      <Defs>
        <LinearGradient id={`${uid}base`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#4a4677" />
          <Stop offset="1" stopColor="#241f45" />
        </LinearGradient>
        {effectKind ? effectDefs(effectKind, uid) : null}
        {finishKind ? finishDefs(finishKind, uid) : null}
      </Defs>

      {/* the card body + a faint neutral "art" motif (so it reads as a card, never invented art) */}
      <Rect x={0} y={0} width={w} height={h} fill={`url(#${uid}base)`} />
      <Circle cx={w * 0.5} cy={h * 0.42} r={w * 0.24} fill="#ffffff" opacity={0.07} />
      <Rect x={w * 0.22} y={h * 0.72} width={w * 0.56} height={Math.max(2, h * 0.03)} fill="#ffffff" opacity={0.12} />

      {effectKind ? effectLayer(effectKind, uid, w, h) : null}
      {finishKind ? finishLayer(finishKind, uid, w, h) : null}

      {/* the frame band — stroked inside the card edge (strokeWidth doubled, the edge clips the outer half) */}
      {frame && frame.kind && bandW > 0 ? (
        <>
          <Rect
            x={bandW / 2}
            y={bandW / 2}
            width={Math.max(0, w - bandW)}
            height={Math.max(0, h - bandW)}
            fill="none"
            stroke={frame.color}
            strokeWidth={bandW}
          />
          {frame.kind === 'double-line' ? (
            <Rect
              x={bandW * 1.6}
              y={bandW * 1.6}
              width={Math.max(0, w - bandW * 3.2)}
              height={Math.max(0, h - bandW * 3.2)}
              fill="none"
              stroke={frame.color}
              strokeWidth={Math.max(1, bandW * 0.6)}
            />
          ) : null}
        </>
      ) : null}
    </Svg>
  );
}

// ── effect overlays (static first-frame/tint) ─────────────────────────────────────────────────────────
function effectDefs(kind: string, uid: string) {
  if (kind === 'soft-glow') {
    return (
      <RadialGradient id={`${uid}fx`} cx="50%" cy="42%" r="60%">
        <Stop offset="0" stopColor="#fff6d8" stopOpacity={0.5} />
        <Stop offset="1" stopColor="#fff6d8" stopOpacity={0} />
      </RadialGradient>
    );
  }
  if (kind === 'gradient-sheen') {
    return (
      <LinearGradient id={`${uid}fx`} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0.3" stopColor="#ffffff" stopOpacity={0} />
        <Stop offset="0.5" stopColor="#ffffff" stopOpacity={0.35} />
        <Stop offset="0.7" stopColor="#ffffff" stopOpacity={0} />
      </LinearGradient>
    );
  }
  if (kind === 'vignette') {
    return (
      <RadialGradient id={`${uid}fx`} cx="50%" cy="50%" r="72%">
        <Stop offset="0.55" stopColor="#000000" stopOpacity={0} />
        <Stop offset="1" stopColor="#000000" stopOpacity={0.55} />
      </RadialGradient>
    );
  }
  if (kind === 'frost') {
    return (
      <LinearGradient id={`${uid}fx`} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0.2" stopColor="#dff2ff" stopOpacity={0.42} />
        <Stop offset="0.6" stopColor="#bfe6ff" stopOpacity={0.12} />
        <Stop offset="1" stopColor="#eaf7ff" stopOpacity={0.34} />
      </LinearGradient>
    );
  }
  if (kind === 'embers') {
    return (
      <RadialGradient id={`${uid}fx`} cx="50%" cy="90%" r="65%">
        <Stop offset="0" stopColor="#ff9d3c" stopOpacity={0.7} />
        <Stop offset="0.45" stopColor="#ff5a28" stopOpacity={0.3} />
        <Stop offset="1" stopColor="#ff5a28" stopOpacity={0} />
      </RadialGradient>
    );
  }
  return null;
}

function effectLayer(kind: string, uid: string, w: number, h: number) {
  if (kind === 'soft-glow' || kind === 'gradient-sheen' || kind === 'vignette' || kind === 'frost' || kind === 'embers') {
    return <Rect x={0} y={0} width={w} height={h} fill={`url(#${uid}fx)`} />;
  }
  if (kind === 'scanline') {
    const lines = [];
    for (let y = 2; y < h; y += 3) {
      lines.push(<Line key={y} x1={0} y1={y} x2={w} y2={y} stroke="#58e0ff" strokeWidth={0.8} opacity={0.28} />);
    }
    return <>{lines}</>;
  }
  if (kind === 'halftone') {
    const dots = [];
    for (let y = h * 0.15; y < h * 0.85; y += 6) {
      for (let x = w * 0.15; x < w * 0.85; x += 6) {
        dots.push(<Circle key={`${x}-${y}`} cx={x} cy={y} r={1.1} fill="#ffffff" opacity={0.18} />);
      }
    }
    return <>{dots}</>;
  }
  if (kind === 'dust') {
    const pts = [
      [0.3, 0.25], [0.65, 0.2], [0.5, 0.5], [0.28, 0.62], [0.72, 0.58], [0.42, 0.78], [0.6, 0.35],
    ];
    return (
      <>
        {pts.map(([px, py], i) => (
          <Circle key={i} cx={w * px} cy={h * py} r={1.2} fill="#fff0c0" opacity={0.4} />
        ))}
      </>
    );
  }
  return null;
}

// ── finish overlays (static first-frame/tint) ─────────────────────────────────────────────────────────
function finishDefs(kind: string, uid: string) {
  if (kind === 'holographic') {
    return (
      <LinearGradient id={`${uid}fin`} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0.2" stopColor="#ff5a5a" stopOpacity={0.32} />
        <Stop offset="0.4" stopColor="#ffdc5a" stopOpacity={0.34} />
        <Stop offset="0.55" stopColor="#5aff9f" stopOpacity={0.32} />
        <Stop offset="0.7" stopColor="#5aaaff" stopOpacity={0.34} />
        <Stop offset="0.85" stopColor="#c85aff" stopOpacity={0.32} />
      </LinearGradient>
    );
  }
  if (kind === 'metallic') {
    return (
      <LinearGradient id={`${uid}fin`} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0.2" stopColor="#e8ecf5" stopOpacity={0.1} />
        <Stop offset="0.5" stopColor="#f5f7ff" stopOpacity={0.45} />
        <Stop offset="0.8" stopColor="#9aa0b5" stopOpacity={0.14} />
      </LinearGradient>
    );
  }
  return null;
}

function finishLayer(kind: string, uid: string, w: number, h: number) {
  if (kind === 'holographic' || kind === 'metallic') {
    return <Rect x={0} y={0} width={w} height={h} fill={`url(#${uid}fin)`} />;
  }
  if (kind === 'matte') {
    return <Rect x={0} y={0} width={w} height={h} fill="#141026" opacity={0.22} />;
  }
  if (kind === 'linen') {
    const lines = [];
    for (let x = 3; x < w; x += 4) {
      lines.push(<Line key={x} x1={x} y1={0} x2={x} y2={h} stroke="#ffffff" strokeWidth={0.6} opacity={0.09} />);
    }
    return <>{lines}</>;
  }
  return null;
}

// ── the nameplate title-plate chip (board's HOLO PLATE tile) — reuse the Styler's plate geometry ────────
export function PlateSwatch({ shape, size }: { shape: string; size: SwatchSize }) {
  const t = useTheme();
  const { plate } = SIZES[size];
  const W = plate.w;
  const H = plate.h;
  const d = platePath(shape, W, H);
  const fill = shape === 'brass' ? '#e8c14a' : '#141026';
  const ink = shape === 'brass' ? '#3c2a09' : theme.brand.cream;
  return (
    <View style={{ width: W, height: H, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="nameplate preview">
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Path d={d} fill={fill} stroke={t.scr.hairline} strokeWidth={1} />
      </Svg>
      <Text
        numberOfLines={1}
        style={{ fontFamily: theme.font.screenBold, fontSize: theme.type.micro, color: ink, letterSpacing: 1, maxWidth: W - 12 }}
      >
        SAMPLE
      </Text>
    </View>
  );
}

// ── the font "Aa" swatch (board `.sw-font`) — the title rendered in the roster face ─────────────────────
export function FontSwatch({ fontId, size }: { fontId: string; size: SwatchSize }) {
  const t = useTheme();
  const { font } = SIZES[size];
  return (
    <View
      style={{ width: font, height: font, alignItems: 'center', justifyContent: 'center', backgroundColor: t.scr.panelHi, borderWidth: 1, borderColor: t.scr.hairline }}
      accessibilityLabel="font preview"
    >
      <Text style={{ fontFamily: FONT_FAMILY[fontId] ?? FONT_FAMILY['clean-sans'], fontSize: previewFontSize(theme.type.display, fontId), color: t.scr.ink }}>
        Aa
      </Text>
    </View>
  );
}
