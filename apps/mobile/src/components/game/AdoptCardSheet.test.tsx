import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { GalleryCardView } from '@ingame/shared';
import prefsReducer from '../../store/prefsSlice';
import { AdoptCardSheet, type AdoptOutcome } from './AdoptCardSheet';

// reduce-motion is controllable per-test: ON (default) → the shared BuyBar's OQ-046 single-press →
// inline-confirm path + the FREE two-step (deterministic, no timed hold); OFF → the gold fill-hold
// (F-13 E8). `mock`-prefixed so the jest.mock factory may close over it.
let mockReduceMotion = true;
jest.mock('../../a11y/useReducedMotion', () => ({ useReducedMotion: () => mockReduceMotion }));

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
  byViewer: false,
  adopted: false,
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
    onViewContributor: jest.fn(),
    ...over,
  };
  render(wrap(<AdoptCardSheet {...props} />));
  return props;
}

describe('AdoptCardSheet (P8 · SOC-11 · M5 F-9 E1 — the styler-buy anatomy)', () => {
  beforeEach(() => {
    mockReduceMotion = true;
  });

  it('lists the premium components (swatch rows) + the total + the CARD-15 honesty (E1/E2)', () => {
    renderSheet();
    expect(screen.getByText('PREMIUM COMPONENTS — ACQUIRED WITH THE CARD')).toBeTruthy();
    expect(screen.getByText('SLAB')).toBeTruthy(); // the component name
    expect(screen.getByText('TOTAL — WHAT YOU PAY')).toBeTruthy();
    expect(screen.getByText(/DESIGNED BY/)).toBeTruthy();
    expect(screen.getByText('58×')).toBeTruthy();
  });

  it('an ULTIMATE component row wears the ULTIMATE chip; non-ultimate rows do not (M6 W-5 · 0080 r3)', () => {
    const withUltimate: GalleryCardView = {
      ...PRICED,
      priceForYou: 13,
      components: [
        { cosmeticId: 'marquee-ultimate', name: 'MARQUEE ULTIMATE', type: 'frame', tier: 'ultimate', price: 10, owned: false },
        { cosmeticId: 'bitter', name: 'SLAB', type: 'font', tier: 'standard', price: 3, owned: false },
      ],
    };
    renderSheet({ card: withUltimate });
    expect(screen.getByText('MARQUEE ULTIMATE')).toBeTruthy();
    expect(screen.getByText('SLAB')).toBeTruthy();
    // exactly ONE ultimate chip — the ultimate component row only, not the standard font row
    expect(screen.getAllByLabelText('Ultimate')).toHaveLength(1);
    expect(screen.getByText('ULTIMATE')).toBeTruthy();
    // the 10-PX price still rides the ultimate row (the chip does not replace it)
    expect(screen.getByLabelText('10 pixels')).toBeTruthy();
  });

  it('FUNDED priced → the gold BuyBar hold-to-adopt (reduce-motion inline confirm) → onAdopt (G1/G2)', async () => {
    const onAdopt = jest.fn<Promise<AdoptOutcome>, []>().mockResolvedValue({
      ok: true,
      result: { granted: [{ cosmeticId: 'bitter', paid: 3 }], totalPaid: 3, balance: 17 },
    });
    const onAdopted = jest.fn();
    renderSheet({ onAdopt, onAdopted, balance: 20 });
    // the shared BuyBar prominent balance line (F-21 r4) + adopt verb
    expect(screen.getByLabelText('You have 20 pixels')).toBeTruthy();
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

  it('REGRESSION (bug 5): the post-adopt DONE button fires onClose (the AcquireBeat no longer traps it)', async () => {
    // The settle overlay's AcquireBeat was mounted permanently (no onDone) as an absolute-fill sibling
    // stacked over the Done button, and its internal tap-catcher ate every press → the DONE button was
    // dead. It now self-dismisses via a `beat` flag, so Done is a live control that closes the sheet.
    jest.useFakeTimers();
    try {
      const onAdopt = jest.fn<Promise<AdoptOutcome>, []>().mockResolvedValue({
        ok: true,
        result: { granted: [{ cosmeticId: 'bitter', paid: 3 }], totalPaid: 3, balance: 17 },
      });
      const onClose = jest.fn();
      renderSheet({ onAdopt, onClose, balance: 20 });
      fireEvent.press(screen.getByLabelText('Adopt for 3 PX'));
      await act(async () => {
        fireEvent.press(screen.getByLabelText('Confirm adopt for 3 PX'));
      });
      // settled — the Done button is present and live (ScreenButton uppercases the label)
      const done = screen.getByText('DONE');
      expect(done).toBeTruthy();
      // let the AcquireBeat celebration run out (self-dismiss) — no permanent overlay left behind
      await act(async () => {
        jest.advanceTimersByTime(700);
      });
      fireEvent.press(done);
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
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

  it('reduce-motion FREE path keeps the two-step: a tap → confirm with no debit line (F-13 E8)', () => {
    renderSheet({ card: FREE }); // mockReduceMotion = true (default)
    expect(screen.getByText('ADOPT · FREE')).toBeTruthy();
    fireEvent.press(screen.getByText('ADOPT · FREE'));
    expect(screen.getByText(/free — the designer earns clout/)).toBeTruthy();
    expect(screen.queryByText(/pixels total/)).toBeNull();
  });

  it('F-13 E8 — with motion, adopt is HOLD-to-adopt by default (FREE = gold fill-hold, no confirm tap)', () => {
    mockReduceMotion = false;
    renderSheet({ card: FREE });
    // the single gold fill-hold key — not the two-tap ScreenButton → ConfirmSheet path
    expect(screen.getByText('HOLD TO ADOPT · FREE')).toBeTruthy();
    expect(screen.queryByText('ADOPT · FREE')).toBeNull();
  });

  it('F-13 E8 — with motion, the priced path is the gold BuyBar hold-to-adopt', () => {
    mockReduceMotion = false;
    renderSheet(); // PRICED, funded
    expect(screen.getByText('HOLD TO ADOPT · 3 PX')).toBeTruthy();
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

  it('the ⋯ on the credit fires onBlock (SOC-09-light · F-13 E8 quick-press)', () => {
    const onBlock = jest.fn();
    renderSheet({ onBlock });
    fireEvent.press(screen.getByLabelText('Block rival_curator'));
    expect(onBlock).toHaveBeenCalledTimes(1);
  });

  it('P13 (E8a) — tapping the designer credit routes to their contributor profile (block moved to ⋯)', () => {
    const onViewContributor = jest.fn();
    const onBlock = jest.fn();
    renderSheet({ onViewContributor, onBlock });
    // the credit itself now opens the contributor profile (the app-wide designer-tap convention);
    // block stays on the ⋯ overflow.
    fireEvent.press(screen.getByLabelText('Designed by rival_curator'));
    expect(onViewContributor).toHaveBeenCalledWith(PRICED.designer.userId);
    expect(onBlock).not.toHaveBeenCalled();
  });

  it('F-13 E8 — your OWN card reads "BY YOU", offers NO block on yourself (self-tap)', () => {
    const onBlock = jest.fn();
    renderSheet({ card: { ...PRICED, byViewer: true }, onBlock });
    expect(screen.getByText('YOU')).toBeTruthy();
    // no ⋯ / block affordance on your own card
    expect(screen.queryByLabelText('Block rival_curator')).toBeNull();
    expect(screen.queryByText('⋯')).toBeNull();
  });

  it('F-13 E7 — SHARE is a quiet link (TertiaryLink), firing onShare', () => {
    const onShare = jest.fn();
    renderSheet({ onShare });
    const share = screen.getByText('↗ SHARE'); // TertiaryLink uppercases
    fireEvent.press(share);
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  // P12 — the ⋯ overflow. Back-compat: no onReport → ⋯ opens the block confirm directly.
  it('P12 — without onReport the ⋯ fires onBlock directly (back-compat)', () => {
    const onBlock = jest.fn();
    renderSheet({ onBlock });
    fireEvent.press(screen.getByText('⋯'));
    expect(onBlock).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Report this card')).toBeNull(); // no menu
  });

  // P12 — with onReport the ⋯ opens the REPORT / BLOCK menu; each item routes to its handler.
  it('P12 — with onReport the ⋯ opens a REPORT / BLOCK menu', () => {
    const onReport = jest.fn();
    const onBlock = jest.fn();
    renderSheet({ onReport, onBlock });
    fireEvent.press(screen.getByText('⋯'));
    expect(onBlock).not.toHaveBeenCalled(); // ⋯ no longer blocks directly — it opens the menu
    fireEvent.press(screen.getByLabelText('Report this card'));
    expect(onReport).toHaveBeenCalledTimes(1);
    // re-open and take the block path
    fireEvent.press(screen.getByText('⋯'));
    fireEvent.press(screen.getByLabelText('Block rival_curator'));
    expect(onBlock).toHaveBeenCalledTimes(1);
  });
});
