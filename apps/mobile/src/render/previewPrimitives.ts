// previewPrimitives — the PLAIN (non-Skia) building blocks for previewing a cosmetic outside the live
// editor canvas (OQ-138: aisle/store previews must be lightweight Views/SVG, never per-row Skia
// canvases). Extracted from styler/AttributeSection.tsx so the Styler's plate/font rails and the Store's
// CosmeticSwatch share ONE source of truth (M5 F-6). Pure data + geometry — no React, no Skia.

/** RN-registered families for the roster font ids (loaded app-wide in the root layout, _layout.tsx).
 *  A fontId with no entry falls back to the default face — never a crash (CardComposition contract). */
export const FONT_FAMILY: Record<string, string> = {
  'clean-sans': 'ChakraPetch_700Bold',
  'bold-display': 'PaytoneOne_400Regular',
  // decision 0068 — a preview <Text> needs the RN family; the skia hero uses the typeface map.
  'press-start': 'PressStart2P_400Regular',
  bitter: 'Bitter_700Bold',
  'space-mono': 'SpaceMono_700Bold',
  pacifico: 'Pacifico_400Regular',
  stencil: 'AllertaStencil_400Regular',
};

/** Optical size correction, mirroring the renderer's FONT_SCALE (PIXEL draws huge at a given em). */
const FONT_SIZE_SCALE: Record<string, number> = { 'press-start': 0.6 };
export const previewFontSize = (base: number, fontId?: string): number =>
  base * (FONT_SIZE_SCALE[fontId ?? ''] ?? 1);

/**
 * The SVG path for a nameplate shape drawn into a `W`×`H` box — the plate as it renders on the card
 * foot (mirrors buildCard's slab/ribbon/bevel geometry). `brass` (and any unknown/`none`) fall to the
 * slab rectangle; brass is distinguished by fill downstream, not by outline. Pure geometry.
 */
export function platePath(shape: string, W: number, H: number): string {
  const s = shape === 'none' ? 'slab' : shape;
  if (s === 'ribbon') {
    const nx = W * 0.06;
    return `M ${nx} 0 L ${W - nx} 0 L ${W} ${H / 2} L ${W - nx} ${H} L ${nx} ${H} L 0 ${H / 2} Z`;
  }
  if (s === 'bevel') {
    const ch = H * 0.35;
    return `M ${ch} 0 L ${W - ch} 0 L ${W} ${ch} L ${W} ${H} L 0 ${H} L 0 ${ch} Z`;
  }
  if (s === 'dogtag') {
    const ch = H * 0.5;
    return `M ${ch} 0 L ${W - ch} 0 L ${W} ${H / 2} L ${W - ch} ${H} L ${ch} ${H} L 0 ${H / 2} Z`;
  }
  if (s === 'arch') {
    const r = Math.min(H * 0.7, W / 2);
    return `M 0 ${r} A ${r} ${r} 0 0 1 ${r} 0 L ${W - r} 0 A ${r} ${r} 0 0 1 ${W} ${r} L ${W} ${H} L 0 ${H} Z`;
  }
  if (s === 'capsule') {
    const r = H / 2;
    return `M ${r} 0 L ${W - r} 0 A ${r} ${r} 0 0 1 ${W - r} ${H} L ${r} ${H} A ${r} ${r} 0 0 1 ${r} 0 Z`;
  }
  if (s === 'tab') {
    const th = H * 0.28;
    const t0 = W * 0.06;
    const t1 = W * 0.42;
    return `M 0 ${th} L ${t0} ${th} L ${t0} 0 L ${t1} 0 L ${t1} ${th} L ${W} ${th} L ${W} ${H} L 0 ${H} Z`;
  }
  return `M 0 0 L ${W} 0 L ${W} ${H} L 0 ${H} Z`; // slab · brass (brass tints gold via fill)
}
