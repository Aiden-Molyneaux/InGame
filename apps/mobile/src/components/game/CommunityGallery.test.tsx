import { render, fireEvent, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { GalleryCardView } from '@ingame/shared';
import prefsReducer from '../../store/prefsSlice';
import { CommunityGallery } from './CommunityGallery';

// The gallery reads GET /games/:gameId/cards via communityApi — mock the hook so the render/chip logic
// is tested deterministically without the RTK middleware/network.
jest.mock('../../store/communityApi', () => ({
  useGetGameGalleryQuery: jest.fn(),
}));
import { useGetGameGalleryQuery } from '../../store/communityApi';
const mockUseGallery = useGetGameGalleryQuery as unknown as jest.Mock;

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

const FREE_CARD: GalleryCardView = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Vanta Cut',
  imageUrl: '/media/cards/vanta.png',
  thumbUrl: '/media/cards/vanta-thumb.png',
  isPremium: false,
  adoptionCount: 31,
  priceForYou: 0, // free → the FREE chip
  components: [],
  designer: { userId: 'aaaaaaaa-1111-4111-8111-111111111111', username: 'vanta' },
  byViewer: false,
  adopted: false,
};
const PRICED_CARD: GalleryCardView = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Rival Cut',
  imageUrl: '/media/cards/rival.png',
  thumbUrl: '/media/cards/rival-thumb.png',
  isPremium: true,
  adoptionCount: 58,
  priceForYou: 3, // 3 PX personalized → the PriceChip
  components: [
    { cosmeticId: 'bitter', name: 'SLAB', type: 'font', price: 3, owned: false },
  ],
  designer: { userId: 'bbbbbbbb-2222-4222-8222-222222222222', username: 'rival_curator' },
  byViewer: false,
  adopted: false,
};

describe('CommunityGallery (§9)', () => {
  afterEach(() => mockUseGallery.mockReset());

  it('renders the roster with personalized chips (FREE at 0, PX otherwise) and adoption counts', () => {
    mockUseGallery.mockReturnValue({ data: { items: [FREE_CARD, PRICED_CARD] }, isLoading: false, isError: false });
    render(wrap(<CommunityGallery gameId="g1" onInspect={jest.fn()} onDesignACard={jest.fn()} onViewDesigner={jest.fn()} />));

    expect(screen.getByText('COMMUNITY CARDS — 2')).toBeTruthy();
    // free card → FREE chip; priced card → the PX value on the PriceChip
    expect(screen.getByText('FREE')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    // designer credits + adoption counts
    expect(screen.getByText('VANTA')).toBeTruthy();
    expect(screen.getByText('RIVAL_CURATOR')).toBeTruthy();
    expect(screen.getByText('31×')).toBeTruthy();
    expect(screen.getByText('58×')).toBeTruthy();
  });

  it('F-13 E4 — marks the caller\'s OWN card "BY YOU" + "YOURS" (no price, no designer name)', () => {
    const mine: GalleryCardView = { ...PRICED_CARD, byViewer: true };
    mockUseGallery.mockReturnValue({ data: { items: [mine] }, isLoading: false, isError: false });
    render(wrap(<CommunityGallery gameId="g1" onInspect={jest.fn()} onDesignACard={jest.fn()} onViewDesigner={jest.fn()} />));
    expect(screen.getByText('BY YOU')).toBeTruthy();
    expect(screen.getByText('YOURS')).toBeTruthy();
    // provenance wins over price — no PriceChip / FREE chip on your own card
    expect(screen.queryByText('FREE')).toBeNull();
    expect(screen.queryByText('RIVAL_CURATOR')).toBeNull();
  });

  it('F-13 E4 — marks an ALREADY-ADOPTED card "ADOPTED" in place of a price', () => {
    const mineAdopted: GalleryCardView = { ...PRICED_CARD, adopted: true };
    mockUseGallery.mockReturnValue({ data: { items: [mineAdopted] }, isLoading: false, isError: false });
    render(wrap(<CommunityGallery gameId="g1" onInspect={jest.fn()} onDesignACard={jest.fn()} onViewDesigner={jest.fn()} />));
    expect(screen.getByText('ADOPTED')).toBeTruthy();
    // the buy price is replaced by the ADOPTED tag (only the adoption count remains numeric)
    expect(screen.queryByText('3')).toBeNull();
  });

  it('taps the card art → onInspect with that card (and never routes)', () => {
    const onInspect = jest.fn();
    const onViewDesigner = jest.fn();
    mockUseGallery.mockReturnValue({ data: { items: [PRICED_CARD] }, isLoading: false, isError: false });
    render(wrap(<CommunityGallery gameId="g1" onInspect={onInspect} onDesignACard={jest.fn()} onViewDesigner={onViewDesigner} />));
    fireEvent.press(screen.getByLabelText(/Rival Cut by rival_curator/i));
    expect(onInspect).toHaveBeenCalledWith(PRICED_CARD);
    expect(onViewDesigner).not.toHaveBeenCalled();
  });

  it('P13 (E8a) / parvati F3 — the credit is a SIBLING Pressable (never nested): a credit tap routes, never inspects', () => {
    const onInspect = jest.fn();
    const onViewDesigner = jest.fn();
    mockUseGallery.mockReturnValue({ data: { items: [PRICED_CARD] }, isLoading: false, isError: false });
    render(wrap(<CommunityGallery gameId="g1" onInspect={onInspect} onDesignACard={jest.fn()} onViewDesigner={onViewDesigner} />));

    // structural guard (the F3 web bug class): the credit must NOT be a descendant of the inspect
    // Pressable (the cell-labeled one) — a nested press is routed to the OUTER responder on RN-web,
    // swallowing the route. Encoded directly: no ancestor of the credit carries the cell a11y label.
    const credit = screen.getByLabelText(/View rival_curator's contributions/i);
    const cellLabel = /Rival Cut by rival_curator/i;
    type Node = { props?: { accessibilityLabel?: string; 'aria-label'?: string }; parent: Node | null };
    for (let node = (credit as unknown as Node).parent; node; node = node.parent) {
      const label = node.props?.accessibilityLabel ?? node.props?.['aria-label'] ?? '';
      expect(label).not.toMatch(cellLabel);
    }

    fireEvent.press(credit);
    expect(onViewDesigner).toHaveBeenCalledWith(PRICED_CARD.designer.userId);
    expect(onInspect).not.toHaveBeenCalled();
  });

  it('empty → the contributor-hook SectionEmpty door', () => {
    const onDesign = jest.fn();
    mockUseGallery.mockReturnValue({ data: { items: [] }, isLoading: false, isError: false });
    render(wrap(<CommunityGallery gameId="g1" onInspect={jest.fn()} onDesignACard={onDesign} onViewDesigner={jest.fn()} />));
    expect(screen.getByText('NO COMMUNITY CARDS YET')).toBeTruthy();
    fireEvent.press(screen.getByText('DESIGN A CARD'));
    expect(onDesign).toHaveBeenCalledTimes(1);
  });

  it('error → an inline LoadError with RETRY', () => {
    const refetch = jest.fn();
    mockUseGallery.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch });
    render(wrap(<CommunityGallery gameId="g1" onInspect={jest.fn()} onDesignACard={jest.fn()} onViewDesigner={jest.fn()} />));
    // LoadError uppercases its title; the message stays as-is.
    expect(screen.getByText(/your own cards above are unaffected/)).toBeTruthy();
  });

  it('a bare mount keeps the pre-0.81 FULL-SET arg { gameId } (the ARCH-A4 lookup contract)', () => {
    mockUseGallery.mockReturnValue({ data: { items: [FREE_CARD] }, isLoading: false, isError: false });
    render(wrap(<CommunityGallery gameId="g1" onInspect={jest.fn()} onDesignACard={jest.fn()} onViewDesigner={jest.fn()} />));
    expect(mockUseGallery).toHaveBeenCalledWith({ gameId: 'g1' });
  });
});

// 0.81 (owner walk m6) — the inline gallery becomes a server-ranked TOP-N strip with the drawn
// affordances (game-page-states "SORT ›" / "SEE ALL ›"): `top` caps the fetch (sort=top&limit=N),
// `sortToggle` renders the head's SORT link, `onSeeAll` renders the SEE ALL {N} › full-list door.
describe('CommunityGallery 0.81 — the top-N strip (sort toggle · SEE ALL door · honest total)', () => {
  afterEach(() => mockUseGallery.mockReset());

  it('top={12} fetches sort=top&limit=12; the head counts the TOTAL, not the strip length', () => {
    mockUseGallery.mockReturnValue({
      data: { items: [FREE_CARD, PRICED_CARD], total: 41, nextCursor: null },
      isLoading: false,
      isError: false,
    });
    render(
      wrap(
        <CommunityGallery
          gameId="g1"
          top={12}
          onInspect={jest.fn()}
          onDesignACard={jest.fn()}
          onViewDesigner={jest.fn()}
        />,
      ),
    );
    expect(mockUseGallery).toHaveBeenCalledWith({ gameId: 'g1', sort: 'top', limit: 12 });
    expect(screen.getByText('COMMUNITY CARDS — 41')).toBeTruthy();
  });

  it('the SORT link toggles TOP ↔ NEW and re-reads server-side (the query arg flips)', () => {
    mockUseGallery.mockReturnValue({
      data: { items: [FREE_CARD], total: 3, nextCursor: null },
      isLoading: false,
      isError: false,
    });
    render(
      wrap(
        <CommunityGallery
          gameId="g1"
          top={12}
          sortToggle
          onInspect={jest.fn()}
          onDesignACard={jest.fn()}
          onViewDesigner={jest.fn()}
        />,
      ),
    );
    expect(mockUseGallery).toHaveBeenLastCalledWith({ gameId: 'g1', sort: 'top', limit: 12 });
    fireEvent.press(screen.getByText('SORT: TOP ›'));
    expect(mockUseGallery).toHaveBeenLastCalledWith({ gameId: 'g1', sort: 'new', limit: 12 });
    // the link reads the CURRENT sort — pressing again flips back
    fireEvent.press(screen.getByText('SORT: NEW ›'));
    expect(mockUseGallery).toHaveBeenLastCalledWith({ gameId: 'g1', sort: 'top', limit: 12 });
  });

  it('SEE ALL {N} › renders when the gallery holds more than the strip, and fires onSeeAll', () => {
    const onSeeAll = jest.fn();
    mockUseGallery.mockReturnValue({
      data: { items: [FREE_CARD, PRICED_CARD], total: 41, nextCursor: null },
      isLoading: false,
      isError: false,
    });
    render(
      wrap(
        <CommunityGallery
          gameId="g1"
          top={2}
          onSeeAll={onSeeAll}
          onInspect={jest.fn()}
          onDesignACard={jest.fn()}
          onViewDesigner={jest.fn()}
        />,
      ),
    );
    fireEvent.press(screen.getByText('SEE ALL 41 ›'));
    expect(onSeeAll).toHaveBeenCalledTimes(1);
  });

  it('no SEE ALL door when the strip IS the whole gallery (total == shown)', () => {
    mockUseGallery.mockReturnValue({
      data: { items: [FREE_CARD, PRICED_CARD], total: 2, nextCursor: null },
      isLoading: false,
      isError: false,
    });
    render(
      wrap(
        <CommunityGallery
          gameId="g1"
          top={12}
          onSeeAll={jest.fn()}
          onInspect={jest.fn()}
          onDesignACard={jest.fn()}
          onViewDesigner={jest.fn()}
        />,
      ),
    );
    expect(screen.queryByText(/SEE ALL/)).toBeNull();
  });
});
