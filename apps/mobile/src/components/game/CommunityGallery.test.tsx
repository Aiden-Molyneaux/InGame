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
    render(wrap(<CommunityGallery gameId="g1" onInspect={jest.fn()} onDesignACard={jest.fn()} />));

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
    render(wrap(<CommunityGallery gameId="g1" onInspect={jest.fn()} onDesignACard={jest.fn()} />));
    expect(screen.getByText('BY YOU')).toBeTruthy();
    expect(screen.getByText('YOURS')).toBeTruthy();
    // provenance wins over price — no PriceChip / FREE chip on your own card
    expect(screen.queryByText('FREE')).toBeNull();
    expect(screen.queryByText('RIVAL_CURATOR')).toBeNull();
  });

  it('F-13 E4 — marks an ALREADY-ADOPTED card "ADOPTED" in place of a price', () => {
    const mineAdopted: GalleryCardView = { ...PRICED_CARD, adopted: true };
    mockUseGallery.mockReturnValue({ data: { items: [mineAdopted] }, isLoading: false, isError: false });
    render(wrap(<CommunityGallery gameId="g1" onInspect={jest.fn()} onDesignACard={jest.fn()} />));
    expect(screen.getByText('ADOPTED')).toBeTruthy();
    // the buy price is replaced by the ADOPTED tag (only the adoption count remains numeric)
    expect(screen.queryByText('3')).toBeNull();
  });

  it('taps a cell → onInspect with that card', () => {
    const onInspect = jest.fn();
    mockUseGallery.mockReturnValue({ data: { items: [PRICED_CARD] }, isLoading: false, isError: false });
    render(wrap(<CommunityGallery gameId="g1" onInspect={onInspect} onDesignACard={jest.fn()} />));
    fireEvent.press(screen.getByLabelText(/Rival Cut by rival_curator/i));
    expect(onInspect).toHaveBeenCalledWith(PRICED_CARD);
  });

  it('empty → the contributor-hook SectionEmpty door', () => {
    const onDesign = jest.fn();
    mockUseGallery.mockReturnValue({ data: { items: [] }, isLoading: false, isError: false });
    render(wrap(<CommunityGallery gameId="g1" onInspect={jest.fn()} onDesignACard={onDesign} />));
    expect(screen.getByText('NO COMMUNITY CARDS YET')).toBeTruthy();
    fireEvent.press(screen.getByText('DESIGN A CARD'));
    expect(onDesign).toHaveBeenCalledTimes(1);
  });

  it('error → an inline LoadError with RETRY', () => {
    const refetch = jest.fn();
    mockUseGallery.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch });
    render(wrap(<CommunityGallery gameId="g1" onInspect={jest.fn()} onDesignACard={jest.fn()} />));
    // LoadError uppercases its title; the message stays as-is.
    expect(screen.getByText(/your own cards above are unaffected/)).toBeTruthy();
  });
});
