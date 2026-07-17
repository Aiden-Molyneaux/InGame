import { render } from '@testing-library/react-native';
import { COMPOSITION_SCHEMA_VERSION } from '@ingame/shared';
import { EntryCard } from './EntryCard';

// EntryCard is the ONE wrapper for rendering an entry/row-sourced card (F-8/F-12/F-19 class): it must
// hand CardFace BOTH a parsed `composition` (own design → live) AND the `imageUrl` (adopted → flattened),
// so no call site can drop the flattened branch and silently regress adopted cards to the default face.
// We stub CardFace to CAPTURE the props it receives (the wrapper's whole contract) while keeping the
// REAL `parseComposition` — the branch that decides live-vs-flattened-vs-default happens on those props.
const faceProps: Array<{ composition: unknown; imageUrl?: string | null }> = [];
jest.mock('./CardFace', () => {
  const actual = jest.requireActual('./CardFace');
  return {
    __esModule: true,
    ...actual,
    CardFace: (props: { composition: unknown; imageUrl?: string | null }) => {
      faceProps.push(props);
      return null;
    },
  };
});

beforeEach(() => {
  faceProps.length = 0;
});

describe('EntryCard (the F-8/F-19 both-cases wrapper)', () => {
  it('own composition → renders LIVE: a parsed composition reaches CardFace, no flattened fallback', () => {
    render(
      <EntryCard
        title="Hades"
        card={{ composition: { schemaVersion: COMPOSITION_SCHEMA_VERSION, elements: [] } }}
        size="grid"
      />,
    );
    expect(faceProps).toHaveLength(1);
    expect(faceProps[0].composition).not.toBeNull();
    expect((faceProps[0].composition as { schemaVersion: number }).schemaVersion).toBe(
      COMPOSITION_SCHEMA_VERSION,
    );
    expect(faceProps[0].imageUrl).toBeUndefined();
  });

  it('adopted (imageUrl only, no composition) → renders FLATTENED: null composition + the image passes through', () => {
    render(<EntryCard title="Celeste" card={{ imageUrl: '/media/celeste.png' }} size="cell" />);
    expect(faceProps[0].composition).toBeNull();
    expect(faceProps[0].imageUrl).toBe('/media/celeste.png'); // the branch adopted cards used to lose
  });

  it('neither composition nor image → the DEFAULT face: null composition, no image', () => {
    render(<EntryCard title="Stardew" card={{}} size="thumb" />);
    expect(faceProps[0].composition).toBeNull();
    expect(faceProps[0].imageUrl).toBeUndefined();
  });

  it('an UNKNOWN-schema composition rider degrades to default (F21), never a broken live render', () => {
    render(<EntryCard title="Future" card={{ composition: { schemaVersion: 999 } }} />);
    expect(faceProps[0].composition).toBeNull();
  });
});
