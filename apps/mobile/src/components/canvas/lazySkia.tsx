import { lazy, type ComponentType } from 'react';
import { loadRenderModule } from '../CardFace';
import type { CardComposition as Comp, CardElement } from '../../render/composition';

// The Canvas surface's skia consumers, funneled through the ONE lazy render-module gate
// (CardFace.loadRenderModule — wasm-before-<Canvas> on web; a failed load degrades every consumer
// to an empty box consistently, never a poisoned-lazy redbox).

const nullComponent = (() => null) as ComponentType<any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type CardBedProps = { composition: Comp; width: number; height: number; pulledIndex?: number | null };
export const LazyCardBed = lazy(() =>
  loadRenderModule().then((m) => ({ default: (m?.CardBed ?? nullComponent) as ComponentType<CardBedProps> })),
);

export type ElementGlyphProps = { element: CardElement; width: number; height: number };
export const LazyElementGlyph = lazy(() =>
  loadRenderModule().then((m) => ({ default: (m?.ElementGlyph ?? nullComponent) as ComponentType<ElementGlyphProps> })),
);

export type ProofPrintProps = { composition: Comp; width: number; height: number; onFlattenError?: (e: unknown) => void };
export const LazyProofPrint = lazy(() =>
  loadRenderModule().then((m) => ({ default: (m?.ProofPrint ?? nullComponent) as ComponentType<ProofPrintProps> })),
);
