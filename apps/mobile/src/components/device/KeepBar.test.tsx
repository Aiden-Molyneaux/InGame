import { render, fireEvent, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from '../../store/prefsSlice';
import { KeepBar } from './KeepBar';

// reduce-motion on → the BuyBar's OQ-046 single-press path (deterministic in jest).
jest.mock('../../a11y/useReducedMotion', () => ({ useReducedMotion: () => true }));

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

const ITEMS = [
  { cosmeticId: 'carbon', name: 'CARBON', type: 'device_shell' as const, price: 8 },
  { cosmeticId: 'deepsea', name: 'DEEP SEA', type: 'screen_theme' as const, price: 6 },
];

// KeepBar (device board D7/D7b/D7c) — the premium cart under a live preview.
describe('KeepBar — the Device premium cart', () => {
  it('renders nothing with an empty cart', () => {
    const view = render(
      wrap(<KeepBar items={[]} total={0} balance={10} onKeep={jest.fn()} onTopUp={jest.fn()} />),
    );
    expect(view.toJSON()).toBeNull();
  });

  it('FUNDED: shows the running total + items and KEEP confirms → onKeep', () => {
    const onKeep = jest.fn();
    render(
      wrap(<KeepBar items={ITEMS} total={14} balance={20} onKeep={onKeep} onTopUp={jest.fn()} />),
    );
    expect(screen.getByText('PREVIEWING PREMIUM')).toBeTruthy();
    expect(screen.getByText('14')).toBeTruthy();
    // D7 — each per-item PX price renders as its own (gold) span.
    expect(screen.getByText('8 PX')).toBeTruthy();
    expect(screen.getByText('6 PX')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Buy for 14 PX'));
    fireEvent.press(screen.getByText('CONFIRM · 14 PX'));
    expect(onKeep).toHaveBeenCalledTimes(1);
  });

  it('SHORT: shows the shortfall + TOP UP door; no buy control', () => {
    const onTopUp = jest.fn();
    render(
      wrap(<KeepBar items={ITEMS} total={14} balance={5} onKeep={jest.fn()} onTopUp={onTopUp} />),
    );
    expect(screen.getByText(/9 PX short/)).toBeTruthy();
    expect(screen.queryByLabelText('Buy for 14 PX')).toBeNull();
    fireEvent.press(screen.getByText('TOP UP ▸'));
    expect(onTopUp).toHaveBeenCalledTimes(1);
  });

  // F-21 ruling 5 — no standalone CANCEL: backing out is re-selecting a saved/owned facet or leaving the
  // editor (device.tsx). At rest the funded cart offers only the buy affordance, no dedicated cancel key.
  it('offers no standalone CANCEL control at rest (ruling 5)', () => {
    render(
      wrap(<KeepBar items={ITEMS} total={14} balance={20} onKeep={jest.fn()} onTopUp={jest.fn()} />),
    );
    expect(screen.queryByText('CANCEL')).toBeNull();
    expect(screen.getByLabelText('Buy for 14 PX')).toBeTruthy();
  });
});
