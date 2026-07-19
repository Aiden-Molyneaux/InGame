import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { AvatarConfig } from '@ingame/shared';
import prefsReducer from '../../store/prefsSlice';
import type { SaveOutcome } from './EditableIdentity';
import { MonogramForge } from './MonogramForge';

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

function renderForge(over: {
  config?: AvatarConfig | null;
  onCommit?: jest.Mock<Promise<SaveOutcome>, unknown[]>;
} = {}) {
  const onCommit = over.onCommit ?? jest.fn<Promise<SaveOutcome>, unknown[]>().mockResolvedValue({ ok: true });
  render(wrap(<MonogramForge username="Curator" config={over.config ?? null} onCommit={onCommit} />));
  return { onCommit };
}

describe('MonogramForge (W-4)', () => {
  it('a colour pick PATCHes the full config (per-field commit)', async () => {
    const { onCommit } = renderForge();
    // the bg ColorField renders the quick swatches; tapping one commits it. (Both fields render the same
    // swatch set, so index 0 is the BACKGROUND field, first in the DOM.)
    const black = screen.getAllByLabelText('Use #000000')[0];
    fireEvent.press(black);
    await waitFor(() => expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({ bg: '#000000' })));
  });

  it('a frame tap PATCHes a config carrying the frame', async () => {
    const { onCommit } = renderForge({ config: { bg: '#000000', ink: '#ffffff' } });
    fireEvent.press(screen.getByLabelText('RING frame'));
    await waitFor(() => expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({ frame: 'ring' })));
  });

  it('the CONTRAST GUARD refuses an unreadable pair — warns, no PATCH', async () => {
    // seed a legible pair, then set INK equal to the white bg → the pair collapses to white-on-white.
    const { onCommit } = renderForge({ config: { bg: '#ffffff', ink: '#000000' } });
    const inkWhite = screen.getAllByLabelText('Use #ffffff')[1]; // [1] = the INK field's swatch
    fireEvent.press(inkWhite);
    await waitFor(() => expect(screen.getByText(/hard to read/i)).toBeTruthy());
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('RESET clears the config back to the default monogram (PATCH null)', async () => {
    const { onCommit } = renderForge({ config: { bg: '#000000', ink: '#ffffff', glyph: 'X' } });
    fireEvent.press(screen.getByLabelText('Reset monogram to default'));
    await waitFor(() => expect(onCommit).toHaveBeenCalledWith(null));
  });
});
