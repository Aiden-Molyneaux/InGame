import { render, fireEvent, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from '../store/prefsSlice';
import { ConfirmSheet } from './ConfirmSheet';

jest.mock('../a11y/useReducedMotion', () => ({ useReducedMotion: () => true }));

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

// ConfirmSheet (decision 0040 + F-1 fix 5) — the destructive confirm grammar, plus the additive
// `purchase` tone (gold, F-02) for the mock IAP sheet / the OQ-046 buy path — which must never read red.
const ALERT_RED = '#e3414e'; // brand.alert — the destructive confirm fill
const GOLD = '#ffd23f'; // scr.value — the acquisitive purchase confirm fill

describe('ConfirmSheet', () => {
  it('defaults to the destructive tone — confirm fires onConfirm, cancel fires onClose', () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    const view = render(
      wrap(
        <ConfirmSheet
          visible
          title="Remove?"
          message="This can't be undone."
          confirmLabel="Remove"
          onConfirm={onConfirm}
          onClose={onClose}
        />,
      ),
    );
    fireEvent.press(screen.getByText('REMOVE'));
    fireEvent.press(screen.getByText('CANCEL'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    // the default confirm wears the alert-red fill, never gold.
    const tree = JSON.stringify(view.toJSON());
    expect(tree).toContain(ALERT_RED);
    expect(tree).not.toContain(GOLD);
  });

  it('the purchase tone paints the confirm gold (acquisitive, never destructive-red)', () => {
    const onConfirm = jest.fn();
    const view = render(
      wrap(
        <ConfirmSheet
          visible
          tone="purchase"
          title="CONFIRM PURCHASE"
          message="$4.99 will be charged for 30 pixels."
          confirmLabel="Pay $4.99"
          onConfirm={onConfirm}
          onClose={jest.fn()}
        />,
      ),
    );
    fireEvent.press(screen.getByText('PAY $4.99'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const tree = JSON.stringify(view.toJSON());
    expect(tree).toContain(GOLD);
    expect(tree).not.toContain(ALERT_RED);
  });

  it('F-13 B2 — holdToConfirm+purchase paints the PAY key GOLD (cosmetic-buy look) + ALL-CAPS', () => {
    const onConfirm = jest.fn();
    const view = render(
      wrap(
        <ConfirmSheet
          visible
          tone="purchase"
          holdToConfirm
          title="CONFIRM PURCHASE"
          message="$1.99 will be charged for 10 pixels. Hold PAY to confirm."
          confirmLabel="Hold to pay $1.99"
          onConfirm={onConfirm}
          onClose={jest.fn()}
        />,
      ),
    );
    // ALL-CAPS (the label is uppercased) — the same voice as the cosmetic HoldFillButton
    const key = screen.getByText('HOLD TO PAY $1.99');
    // reduce-motion (mocked on) collapses the fill-hold to a plain press → fires immediately
    fireEvent.press(key);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const tree = JSON.stringify(view.toJSON());
    expect(tree).toContain(GOLD); // gold default fill, never the neutral cream $ voice
    expect(tree).not.toContain(ALERT_RED);
  });

  it('W-B4 — the purchase tone carries NO CANCEL; the sheet scrim is the escape (destructive keeps it)', () => {
    const onClose = jest.fn();
    render(
      wrap(
        <ConfirmSheet
          visible
          tone="purchase"
          holdToConfirm
          title="CONFIRM PURCHASE"
          message="$1.99 will be charged."
          confirmLabel="Hold to pay $1.99"
          onConfirm={jest.fn()}
          onClose={onClose}
        />,
      ),
    );
    // no explicit CANCEL on a buy confirm (the F-21 family finish)
    expect(screen.queryByText('CANCEL')).toBeNull();
    // ...but the escape path stands: the PulledSheet scrim closes (onClose fires)
    fireEvent.press(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('busy disables the actions and shows the working glyph', () => {
    render(
      wrap(
        <ConfirmSheet
          visible
          title="Remove?"
          message="Working on it."
          confirmLabel="Remove"
          onConfirm={jest.fn()}
          onClose={jest.fn()}
          busy
        />,
      ),
    );
    expect(screen.getByText('…')).toBeTruthy();
  });
});
