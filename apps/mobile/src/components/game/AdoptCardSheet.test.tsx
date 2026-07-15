import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { GalleryCardView } from '@ingame/shared';
import prefsReducer from '../../store/prefsSlice';
import { AdoptCardSheet, type AdoptOutcome } from './AdoptCardSheet';

// reduce-motion on → the shared BuyBar's OQ-046 single-press → inline-confirm path (deterministic).
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
  components: [{ cosmeticId: 'bitter', name: 'SLAB', type: 'font', price: 3, owned: false }],
  designer: { userId: 'bbbbbbbb-2222-4222-8222-222222222222', username: 'rival_curator' },
};
const FREE: GalleryCardView = { ...PRICED, id: 'f', name: 'Free Cut', priceForYou: 0, isPremium: false, components: [] };

function renderSheet(over: Partial<React.ComponentProps<typeof AdoptCardSheet>> = {}) {
  const props = {
    card: PRICED,
    visible: true,
    balance: 20,
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

describe('AdoptCardSheet (P8 · SOC-11 · M5 F-9 E1 — the styler-buy anatomy)', () => {
  it('lists the premium components (swatch rows) + the total + the CARD-15 honesty (E1/E2)', () => {
    renderSheet();
    expect(screen.getByText('PREMIUM COMPONENTS — ACQUIRED WITH THE CARD')).toBeTruthy();
    expect(screen.getByText('SLAB')).toBeTruthy(); // the component name
    expect(screen.getByText('TOTAL — WHAT YOU PAY')).toBeTruthy();
    expect(screen.getByText('You get the image, not the layers.')).toBeTruthy();
    expect(screen.getByText(/DESIGNED BY/)).toBeTruthy();
    expect(screen.getByText('58×')).toBeTruthy();
  });

  it('FUNDED priced → the gold BuyBar hold-to-adopt (reduce-motion inline confirm) → onAdopt (G1/G2)', async () => {
    const onAdopt = jest.fn<Promise<AdoptOutcome>, []>().mockResolvedValue({
      ok: true,
      result: { granted: [{ cosmeticId: 'bitter', paid: 3 }], totalPaid: 3, balance: 17 },
    });
    const onAdopted = jest.fn();
    renderSheet({ onAdopt, onAdopted, balance: 20 });
    // the shared BuyBar meta + adopt verb
    expect(screen.getByText('YOU HAVE 20 PX')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Adopt for 3 PX'));
    expect(screen.getByText('CONFIRM · 3 PX')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Confirm adopt for 3 PX'));
    });
    expect(onAdopt).toHaveBeenCalledTimes(1);
    expect(onAdopted).toHaveBeenCalledWith(
      expect.objectContaining({ totalPaid: 3 }),
      expect.objectContaining({ id: PRICED.id }),
    );
    // G5 — the in-place settle acknowledges, no toast, no BuyBar left
    expect(screen.getByText(/ADOPTED — RIVAL CUT/)).toBeTruthy();
    expect(screen.queryByLabelText('Adopt for 3 PX')).toBeNull();
  });

  it('INSUFFICIENT (pre-emptive, balance < price) NEVER offers the hold — NOT-ENOUGH + Top Up (G3)', () => {
    const onTopUp = jest.fn();
    renderSheet({ balance: 1, onTopUp }); // 1 < 3
    // no adopt hold/confirm control is offered
    expect(screen.queryByLabelText('Adopt for 3 PX')).toBeNull();
    expect(screen.getByText(/NOT ENOUGH/)).toBeTruthy();
    fireEvent.press(screen.getByText('TOP UP'));
    expect(onTopUp).toHaveBeenCalledTimes(1);
  });

  it('the FREE path is a standard (non-gold) tap → confirm with no debit line (G1)', () => {
    renderSheet({ card: FREE });
    expect(screen.getByText('ADOPT · FREE')).toBeTruthy();
    fireEvent.press(screen.getByText('ADOPT · FREE'));
    expect(screen.getByText(/free — the designer earns clout/)).toBeTruthy();
    expect(screen.queryByText(/pixels total/)).toBeNull();
  });

  it('ALREADY_ADOPTED → the owned state', async () => {
    const onAdopt = jest.fn<Promise<AdoptOutcome>, []>().mockResolvedValue({ ok: false, code: 'ALREADY_ADOPTED' });
    renderSheet({ onAdopt });
    fireEvent.press(screen.getByLabelText('Adopt for 3 PX'));
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Confirm adopt for 3 PX'));
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
