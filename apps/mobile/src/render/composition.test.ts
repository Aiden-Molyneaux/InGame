import { buildCardElements } from './buildCard';
import { SAMPLE_COMPOSITION, MAX_ELEMENTS, type CardComposition } from './composition';

// buildCardElements is source-agnostic (the skia bits are passed in), so we can assert its STRUCTURE
// with a stub skia context — the real skia flatten is proven by flatten.spike.ts (node/canvaskit).
/* eslint-disable @typescript-eslint/no-explicit-any */
const stubCtx = {
  Group: 'Group',
  Fill: 'Fill',
  Rect: 'Rect',
  Oval: 'Oval',
  Path: 'Path',
  Text: 'Text',
  LinearGradient: 'LinearGradient',
  Skia: {
    Path: {
      Make: () => ({ moveTo() {}, lineTo() {}, close() {} }),
      MakeFromSVGString: (d: string) => ({ svg: d }),
    },
    Font: () => ({}),
  },
  typeface: undefined,
} as any;

describe('buildCardElements (CARD-15 render module)', () => {
  it('rejects a composition over the cap-30 ceiling', () => {
    const over: CardComposition = {
      ...SAMPLE_COMPOSITION,
      elements: Array.from({ length: MAX_ELEMENTS + 1 }, () => SAMPLE_COMPOSITION.elements[0]),
    };
    expect(() => buildCardElements(over, 161, 225, stubCtx)).toThrow(/cap-30/);
  });

  it('clips the sample to the F-02 stepped silhouette and draws base + elements + frame', () => {
    const tree = buildCardElements(SAMPLE_COMPOSITION, 161, 225, stubCtx) as any;
    expect(tree.props.clip).toBeTruthy(); // the stepped-path clip
    // base(1) + 5 non-text elements (text skipped without a typeface) + plate(1) + frame(1)
    const kids = tree.props.children.filter(Boolean);
    expect(kids.length).toBe(1 + 5 + 1 + 1);
  });

  it('drops the plate on an unplated (mini) size but keeps the clip', () => {
    const tree = buildCardElements(SAMPLE_COMPOSITION, 64, 89, stubCtx) as any;
    expect(tree.props.clip).toBeTruthy();
    // no plate at mini (F-06): base + 5 shapes + frame
    expect(tree.props.children.filter(Boolean).length).toBe(1 + 5 + 1);
  });
});
