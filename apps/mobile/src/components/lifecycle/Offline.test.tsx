import { render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { Offline } from './Offline';
import prefsReducer from '../../store/prefsSlice';

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

// Offline (component-map §5.6 · design-spec §1.6 · SYS-10) — the CALM, auto-recovering state; the
// generalized sibling of device/OfflineStrip. `strip` (default) inline banner + `full` whole-view.
describe('Offline (design-spec §1.6 · SYS-10 calm)', () => {
  it('strip: renders the calm writes-wait copy', () => {
    render(wrap(<Offline />));
    expect(screen.getByText("OFFLINE — CHANGES SYNC WHEN YOU'RE BACK")).toBeTruthy();
  });

  it('strip: shows the quiet RETRYING… tail only when a gated write waits', () => {
    const { rerender } = render(wrap(<Offline />));
    expect(screen.queryByText('RETRYING…')).toBeNull();
    rerender(wrap(<Offline retrying />));
    expect(screen.getByText('RETRYING…')).toBeTruthy();
  });

  it('announces the offline transition once on mount (§105 live-region)', () => {
    const spy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    render(wrap(<Offline />));
    expect(spy).toHaveBeenCalledWith("Offline — changes sync when you're back");
    spy.mockRestore();
  });

  it('full: renders the whole-view calm state', () => {
    render(wrap(<Offline variant="full" />));
    expect(screen.getByText('OFFLINE')).toBeTruthy();
    expect(screen.queryByText('RETRY')).toBeNull(); // auto-recovers, never a retry alarm
  });
});
