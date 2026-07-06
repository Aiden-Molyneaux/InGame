import { MAX_ELEMENTS, type CardComposition, type CardElement } from '../render/composition';

// The Canvas element ops (CARD-08/09/10) — PURE composition→composition functions, so the route's
// one `patchDraft` pipeline (local redraw + userEdits + debounced autosave + history) is the only
// write path and every op is unit-testable. Index = elements array order = rack order = Z-order
// (CARD-08: "Z-order is the rack order").

/** Bed positions may hang off the edge (clipped at draw) but never get lost off-world. */
const POS_MIN = -0.25;
const POS_MAX = 1.25;
const SIZE_MIN = 0.02;
const SIZE_MAX = 1.5;
const TEXT_SIZE_MIN = 0.02;
const TEXT_SIZE_MAX = 0.4;

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

function withElement(c: CardComposition, i: number, fn: (e: CardElement) => CardElement): CardComposition {
  const e = c.elements[i];
  if (!e) return c;
  const elements = c.elements.slice();
  elements[i] = fn(e);
  return { ...c, elements };
}

export function moveElement(c: CardComposition, i: number, x: number, y: number): CardComposition {
  return withElement(c, i, (e) => ({ ...e, x: clamp(x, POS_MIN, POS_MAX), y: clamp(y, POS_MIN, POS_MAX) }));
}

/** Resize — box kinds take w/h; text maps size (it has no box). */
export function resizeElement(c: CardComposition, i: number, w: number, h: number): CardComposition {
  return withElement(c, i, (e) =>
    e.type === 'text'
      ? { ...e, size: clamp(h, TEXT_SIZE_MIN, TEXT_SIZE_MAX) }
      : { ...e, w: clamp(w, SIZE_MIN, SIZE_MAX), h: clamp(h, SIZE_MIN, SIZE_MAX) },
  );
}

export function rotateElement(c: CardComposition, i: number, deg: number): CardComposition {
  const norm = ((deg % 360) + 540) % 360 - 180; // → (-180, 180]
  return withElement(c, i, (e) => ({ ...e, rotation: norm === 0 ? undefined : norm }));
}

/** Generic field patch (the EDIT sheet / ops row). Enforces nothing — lock policy is the UI's. */
export function patchElement(c: CardComposition, i: number, patch: Partial<CardElement>): CardComposition {
  return withElement(c, i, (e) => ({ ...e, ...patch }) as CardElement);
}

/** Append (rack end = topmost Z). Returns null AT the cap — the caller shows the red meter. */
export function addElement(c: CardComposition, el: CardElement): CardComposition | null {
  if (c.elements.length >= MAX_ELEMENTS) return null;
  return { ...c, elements: [...c.elements, el] };
}

export function removeElement(c: CardComposition, i: number): CardComposition {
  if (!c.elements[i]) return c;
  return { ...c, elements: c.elements.filter((_, idx) => idx !== i) };
}

/** Duplicate lands just above its source, nudged, and counts against the cap (null at cap). */
export function duplicateElement(c: CardComposition, i: number): CardComposition | null {
  const e = c.elements[i];
  if (!e || c.elements.length >= MAX_ELEMENTS) return null;
  const copy: CardElement = { ...e, x: clamp(e.x + 0.05, POS_MIN, POS_MAX), y: clamp(e.y + 0.05, POS_MIN, POS_MAX) };
  const elements = c.elements.slice();
  elements.splice(i + 1, 0, copy);
  return { ...c, elements };
}

/** Swap with a neighbour (dir −1 = down the rack / behind, +1 = up / in front). */
export function reorderElement(c: CardComposition, i: number, dir: -1 | 1): CardComposition {
  const j = i + dir;
  if (!c.elements[i] || j < 0 || j >= c.elements.length) return c;
  const elements = c.elements.slice();
  const tmp = elements[i]!;
  elements[i] = elements[j]!;
  elements[j] = tmp;
  return { ...c, elements };
}

/** Replace element i wholesale (RESET SLIP — the pull-time snapshot, CARD-09 scoped reset). */
export function replaceElement(c: CardComposition, i: number, el: CardElement): CardComposition {
  return withElement(c, i, () => el);
}

/** The slip label — the CARD-08 rename if set, else an honest kind default. */
export function elementLabel(e: CardElement, i: number): string {
  if (e.name) return e.name.toUpperCase();
  if (e.type === 'text') return e.text.slice(0, 8).toUpperCase() || 'TEXT';
  if (e.type === 'icon') return e.iconId.toUpperCase();
  if (e.type === 'poly') return e.shape.toUpperCase();
  if (e.type === 'ellipse') return 'ELLIPSE';
  return `SLIP ${i + 1}`;
}
