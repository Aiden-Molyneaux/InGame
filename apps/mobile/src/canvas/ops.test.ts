import {
  addElement,
  duplicateElement,
  elementLabel,
  moveElement,
  patchElement,
  removeElement,
  reorderElement,
  replaceElement,
  resizeElement,
  rotateElement,
} from './ops';
import { MAX_ELEMENTS, COMPOSITION_SCHEMA_VERSION, type CardComposition } from '../render/composition';

const rect = (fill = '#fff') => ({ type: 'rect' as const, x: 0.5, y: 0.5, w: 0.2, h: 0.2, fill });
const comp = (n = 3): CardComposition => ({
  schemaVersion: COMPOSITION_SCHEMA_VERSION,
  base: { fill: '#111' },
  elements: Array.from({ length: n }, (_, i) => rect(`#00${i}`)),
});

describe('canvas ops (CARD-08/09/10 — pure, the one patch pipeline)', () => {
  it('moves with clamping and never mutates the input', () => {
    const c = comp();
    const out = moveElement(c, 1, 9, -9);
    expect(out.elements[1]).toMatchObject({ x: 1.25, y: -0.25 });
    expect(c.elements[1]).toMatchObject({ x: 0.5, y: 0.5 }); // untouched
  });

  it('resizes boxes with clamps; text resize maps to size', () => {
    const c = comp();
    expect(resizeElement(c, 0, 0.001, 99).elements[0]).toMatchObject({ w: 0.02, h: 1.5 });
    const t: CardComposition = { ...comp(0), elements: [{ type: 'text', x: 0.5, y: 0.5, text: 'HI', size: 0.08, fill: '#fff' }] };
    expect(resizeElement(t, 0, 0, 0.9).elements[0]).toMatchObject({ size: 0.4 });
  });

  it('normalizes rotation into (−180, 180] and drops a zero', () => {
    const c = comp();
    expect(rotateElement(c, 0, 200).elements[0]!.rotation).toBe(-160);
    expect(rotateElement(c, 0, 360).elements[0]!.rotation).toBeUndefined();
  });

  it('add/duplicate respect the cap-30 (null AT the cap — the red meter)', () => {
    const full = comp(MAX_ELEMENTS);
    expect(addElement(full, rect())).toBeNull();
    expect(duplicateElement(full, 0)).toBeNull();
    const c = comp(2);
    const dup = duplicateElement(c, 0)!;
    expect(dup.elements).toHaveLength(3);
    expect(dup.elements[1]).toMatchObject({ x: 0.55, y: 0.55, fill: '#000' }); // nudged copy sits just above its source
  });

  it('reorder swaps neighbours and refuses the edges (Z = rack order)', () => {
    const c = comp(3);
    const up = reorderElement(c, 0, 1);
    expect(up.elements[0]!.fill).toBe('#001');
    expect(up.elements[1]!.fill).toBe('#000');
    expect(reorderElement(c, 0, -1)).toBe(c);
    expect(reorderElement(c, 2, 1)).toBe(c);
  });

  it('remove/replace/patch target exactly one element', () => {
    const c = comp(3);
    expect(removeElement(c, 1).elements.map((e) => e.fill)).toEqual(['#000', '#002']);
    expect(replaceElement(c, 1, rect('#abc')).elements[1]!.fill).toBe('#abc');
    const patched = patchElement(c, 1, { locked: true, name: 'CORE' });
    expect(patched.elements[1]).toMatchObject({ locked: true, name: 'CORE' });
    expect(patched.elements[0]).not.toHaveProperty('locked');
  });

  it('labels slips: rename wins, else an honest kind default', () => {
    expect(elementLabel({ ...rect(), name: 'orbit' }, 0)).toBe('ORBIT');
    expect(elementLabel(rect(), 3)).toBe('SLIP 4');
    expect(elementLabel({ type: 'icon', iconId: 'trophy', x: 0, y: 0, w: 0.1, h: 0.1, fill: '#fff' }, 0)).toBe('TROPHY');
    expect(elementLabel({ type: 'text', x: 0, y: 0, text: 'guardian', size: 0.1, fill: '#fff' }, 0)).toBe('GUARDIAN');
  });
});
