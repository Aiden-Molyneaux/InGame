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
  onPreview?: jest.Mock<void, unknown[]>;
} = {}) {
  const onCommit = over.onCommit ?? jest.fn<Promise<SaveOutcome>, unknown[]>().mockResolvedValue({ ok: true });
  const onPreview = over.onPreview ?? jest.fn<void, unknown[]>();
  render(
    wrap(
      <MonogramForge
        username="Curator"
        config={over.config ?? null}
        onCommit={onCommit}
        onPreview={onPreview}
      />,
    ),
  );
  return { onCommit, onPreview };
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

  // ── walk-4 P3-a — ONE avatar. The forge draws no head of its own; it publishes the in-progress
  // config and the host's identity avatar is the preview. RED before the fix (the forge rendered its
  // own <Avatar>, so a second monogram for the same user was on screen).
  describe('P3-a — the forge has no head of its own', () => {
    it('renders NO avatar inside the forge (the identity avatar is the preview)', () => {
      renderForge({ config: { bg: '#000000', ink: '#ffffff' } });
      expect(screen.getByText('MONOGRAM FORGE')).toBeTruthy(); // the forge IS mounted…
      expect(screen.queryByLabelText('Curator monogram')).toBeNull(); // …and draws no second head
    });

    it('publishes the seeded config on mount, then every edit — including one the CONTRAST GUARD blocks', async () => {
      const onCommit = jest.fn<Promise<SaveOutcome>, unknown[]>().mockResolvedValue({ ok: true });
      const { onPreview } = renderForge({ config: { bg: '#ffffff', ink: '#000000' }, onCommit });
      // mount publishes what the controls currently describe, so the host avatar starts in sync
      expect(onPreview).toHaveBeenCalledWith({ bg: '#ffffff', ink: '#000000' });
      // an UNREADABLE pick (white ink on the white bg) is refused by the guard — but the user must
      // still SEE it, which is the whole point of a live preview.
      fireEvent.press(screen.getAllByLabelText('Use #ffffff')[1]!); // [1] = the INK field
      await waitFor(() => expect(onPreview).toHaveBeenLastCalledWith({ bg: '#ffffff', ink: '#ffffff' }));
      expect(onCommit).not.toHaveBeenCalled();
    });
  });

  // ── walk-4 P3-b — one picker at a time. RED before the fix (both ColorFields could sit expanded).
  it('P3-b — expanding the INK picker collapses the BACKGROUND one (exactly one open)', () => {
    renderForge();
    expect(screen.queryByLabelText('Colour picker')).toBeNull(); // both closed by default
    fireEvent.press(screen.getAllByLabelText('PICK COLOUR')[0]!); // BACKGROUND
    expect(screen.getAllByLabelText('Colour picker')).toHaveLength(1);
    fireEvent.press(screen.getByLabelText('PICK COLOUR')); // the only closed one left = INK
    expect(screen.getAllByLabelText('Colour picker')).toHaveLength(1); // still ONE, not two
    // …and it's the INK field that's up now: the background offers to open again.
    expect(screen.getAllByLabelText('PICK COLOUR')).toHaveLength(1);
    expect(screen.getAllByLabelText('CLOSE PICKER')).toHaveLength(1);
  });

  // ── walk-4 Murr fix — the NO-CHANGE guard. RED before the fix: the P3-b coordinated collapse
  // committed the untouched value, so a default-monogram user who merely opened BACKGROUND then INK
  // PATCHed an explicit config they never chose (null → concrete blob).
  it('opening one picker then the other WITHOUT picking commits NOTHING (the no-change guard)', async () => {
    const { onCommit } = renderForge(); // config: null — the default-monogram user
    fireEvent.press(screen.getAllByLabelText('PICK COLOUR')[0]!); // open BACKGROUND
    fireEvent.press(screen.getByLabelText('PICK COLOUR')); // open INK → BACKGROUND collapse-commits
    await waitFor(() => expect(screen.getAllByLabelText('CLOSE PICKER')).toHaveLength(1));
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('a REAL pick still commits — once; re-committing the identical value is skipped', async () => {
    const { onCommit } = renderForge();
    fireEvent.press(screen.getAllByLabelText('Use #000000')[0]!); // a real bg pick
    await waitFor(() => expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({ bg: '#000000' })));
    fireEvent.press(screen.getAllByLabelText('Use #000000')[0]!); // the same value again
    await waitFor(() => expect(onCommit).toHaveBeenCalledTimes(1)); // guard: no second PATCH
  });
});
