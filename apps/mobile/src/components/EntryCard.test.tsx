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

  // ── walk2 W-A2 — the wrapper owns thumb-vs-full by rendered size (the plate-gate mirror) ────────
  describe('W-A2 — size-aware flattened source (PLATE_MIN_W gate)', () => {
    const both = { imageUrl: '/media/c/full.png', thumbUrl: '/media/c/thumb.png?v=2' };

    it('small sizes (thumb/mini, below the plate gate) → the PLATELESS thumbUrl', () => {
      render(<EntryCard title="Feed" card={both} size="thumb" />);
      render(<EntryCard title="Rail" card={both} size="mini" />);
      expect(faceProps[0].imageUrl).toBe(both.thumbUrl);
      expect(faceProps[1].imageUrl).toBe(both.thumbUrl);
    });

    it('at/above the gate (cell 96 and up) → the plate-baked imageUrl', () => {
      render(<EntryCard title="Cell" card={both} size="cell" />);
      render(<EntryCard title="Grid" card={both} size="grid" />);
      expect(faceProps[0].imageUrl).toBe(both.imageUrl);
      expect(faceProps[1].imageUrl).toBe(both.imageUrl);
    });

    it('an explicit width wins over the size prop (a 48pt-wide render picks the thumb)', () => {
      render(<EntryCard title="Sized" card={both} size="grid" width={48} height={67} />);
      expect(faceProps[0].imageUrl).toBe(both.thumbUrl);
    });

    it('missing thumb at a small size → graceful full fallback (never a blank face)', () => {
      render(<EntryCard title="OldCard" card={{ imageUrl: both.imageUrl, thumbUrl: null }} size="thumb" />);
      expect(faceProps[0].imageUrl).toBe(both.imageUrl);
    });

    it('missing full at a large size → graceful thumb fallback', () => {
      render(<EntryCard title="ThumbOnly" card={{ imageUrl: null, thumbUrl: both.thumbUrl }} size="grid" />);
      expect(faceProps[0].imageUrl).toBe(both.thumbUrl);
    });
  });
});
