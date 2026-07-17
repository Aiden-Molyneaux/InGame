import { lazy, type ComponentType } from 'react';
import { loadRenderModule } from '../CardFace';
import type { CardComposition as Comp } from '../../render/composition';
import type { StripCell } from '../../render/buildCard';

// The Canvas surface's skia consumers, funneled through the ONE lazy render-module gate
// (CardFace.loadRenderModule — wasm-before-<Canvas> on web; a failed load degrades every consumer
// to an empty box consistently, never a poisoned-lazy redbox). Multi-cell previews use the STRIP
// components — one canvas per surface, never one per cell (the ~16-WebGL-context ceiling).

const nullComponent = (() => null) as ComponentType<any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type CardBedProps = { composition: Comp; width: number; height: number; pulledIndex?: number | null };
export const LazyCardBed = lazy(() =>
  loadRenderModule().then((m) => ({ default: (m?.CardBed ?? nullComponent) as ComponentType<CardBedProps> })),
);

export type GlyphStripProps = {
  cells: StripCell[];
  cellW: number;
  cellH: number;
  strideX: number;
  strideY: number;
  cols: number;
  width: number;
  height: number;
};
export const LazyGlyphStrip = lazy(() =>
  loadRenderModule().then((m) => ({ default: (m?.GlyphStrip ?? nullComponent) as ComponentType<GlyphStripProps> })),
);

export type BaseStripProps = { bases: Array<Comp['base']>; cell: number; stride: number; width: number; height: number };
export const LazyBaseStrip = lazy(() =>
  loadRenderModule().then((m) => ({ default: (m?.BaseStrip ?? nullComponent) as ComponentType<BaseStripProps> })),
);

export type CompositionStripProps = { comps: Comp[]; cellW: number; cellH: number; strideX: number; width: number; height: number };
export const LazyCompositionStrip = lazy(() =>
  loadRenderModule().then((m) => ({ default: (m?.CompositionStrip ?? nullComponent) as ComponentType<CompositionStripProps> })),
);

export type ProofPrintProps = { composition: Comp; width: number; height: number; onFlattenError?: (e: unknown) => void };
export const LazyProofPrint = lazy(() =>
  loadRenderModule().then((m) => ({ default: (m?.ProofPrint ?? nullComponent) as ComponentType<ProofPrintProps> })),
);
