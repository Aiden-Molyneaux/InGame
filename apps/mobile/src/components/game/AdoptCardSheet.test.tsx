import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { GalleryCardView } from '@ingame/shared';
import prefsReducer from '../../store/prefsSlice';
import { AdoptCardSheet, type AdoptOutcome } from './AdoptCardSheet';

jest.mock('../../a11y/useReducedMotion', () => ({ useReducedMotion: () => true }));

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

const PRICED: GalleryCardView = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Rival Cut',
  imageUrl: '/media/cards/rival.png',
  thumbUrl: '/media/cards/rival-thumb.png',
  isPremium: true,
  adoptionCount: 58,
  priceForYou: 3,
  designer: { userId: 'bbbbbbbb-2222-4222-8222-222222222222', username: 'rival_curator' },
};
const FREE: GalleryCardView = { ...PRICED, id: 'f', name: 'Free Cut', priceForYou: 0, isPremium: false };

function renderSheet(over: Partial<React.ComponentProps<typeof AdoptCardSheet>> = {}) {
  const props = {
    card: PRICED,
    visible: true,
    onClose: jest.fn(),
    onAdopt: jest.fn<Promise<AdoptOutcome>, []>(),
    adopting: false,
    onAdopted: jest.fn(),
    onTopUp: jest.fn(),
    onShare: jest.fn(),
    onBlock: jest.fn(),
    ...over,
  };
  render(wrap(<AdoptCardSheet {...props} />));
  return props;
}

describe('AdoptCardSheet (P8 · SOC-11 atomic adopt)', () => {
  it('shows the personalized price and the CARD-15 honest sub', () => {
    renderSheet();
    expect(screen.getByText('ADOPT · 3 PX')).toBeTruthy();
    expect(screen.getByText('You get the image, not the layers.')).toBeTruthy();
    expect(screen.getByText(/DESIGNED BY/)).toBeTruthy();
    expect(screen.getByText('58×')).toBeTruthy();
  });

  it('ADOPT → a purchase confirm listing the total; confirm runs onAdopt', async () => {
    const onAdopt = jest.fn<Promise<AdoptOutcome>, []>().mockResolvedValue({
      ok: true,
      result: { granted: [{ cosmeticId: 'bitter', paid: 3 }], totalPaid: 3, balance: 2 },
    });
    const onAdopted = jest.fn();
    renderSheet({ onAdopt, onAdopted });
    fireEvent.press(screen.getByText('ADOPT · 3 PX'));
    // the confirm names the 3 PX total
    expect(screen.getByText(/3 pixels total/)).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByText('ADOPT · 3 PX')); // the confirm keycap
    });
    expect(onAdopt).toHaveBeenCalledTimes(1);
    expect(onAdopted).toHaveBeenCalledWith(
      expect.objectContaining({ totalPaid: 3 }),
      expect.objectContaining({ id: PRICED.id }),
    );
  });

  it('the FREE path confirms with no debit line', () => {
    renderSheet({ card: FREE });
    expect(screen.getByText('ADOPT · FREE')).toBeTruthy();
    fireEvent.press(screen.getByText('ADOPT · FREE'));
    // free confirm says "free", never a pixels-total debit line
    expect(screen.getByText(/free — the designer earns clout/)).toBeTruthy();
    expect(screen.queryByText(/pixels total/)).toBeNull();
  });

  it('INSUFFICIENT_BALANCE opens the cant-afford bridge with TOP UP', async () => {
    const onAdopt = jest
      .fn<Promise<AdoptOutcome>, []>()
      .mockResolvedValue({ ok: false, code: 'INSUFFICIENT_BALANCE', shortBy: 3 });
    const onTopUp = jest.fn();
    renderSheet({ onAdopt, onTopUp });
    fireEvent.press(screen.getByText('ADOPT · 3 PX'));
    await act(async () => {
      fireEvent.press(screen.getByText('ADOPT · 3 PX'));
    });
    expect(screen.getByText('SHORT 3 PIXELS — TOP UP TO ADOPT')).toBeTruthy();
    fireEvent.press(screen.getByText('TOP UP'));
    expect(onTopUp).toHaveBeenCalledTimes(1);
  });

  it('ALREADY_ADOPTED → the owned state', async () => {
    const onAdopt = jest.fn<Promise<AdoptOutcome>, []>().mockResolvedValue({ ok: false, code: 'ALREADY_ADOPTED' });
    renderSheet({ onAdopt });
    fireEvent.press(screen.getByText('ADOPT · 3 PX'));
    await act(async () => {
      fireEvent.press(screen.getByText('ADOPT · 3 PX'));
    });
    expect(screen.getByText(/YOU ALREADY HAVE THIS CARD/)).toBeTruthy();
  });

  it('the ⋯ on the credit fires onBlock (SOC-09-light)', () => {
    const onBlock = jest.fn();
    renderSheet({ onBlock });
    fireEvent.press(screen.getByLabelText('Block rival_curator'));
    expect(onBlock).toHaveBeenCalledTimes(1);
  });
});
