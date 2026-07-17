import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from '../../store/prefsSlice';
import { ReportSheet, type ReportTarget, type ReportActionOutcome } from './ReportSheet';

jest.mock('../../a11y/useReducedMotion', () => ({ useReducedMotion: () => true }));

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

const CARD: ReportTarget = { type: 'card', id: 'c1', name: 'Rival Cut' };
const GAME: ReportTarget = { type: 'game', id: 'g1', name: 'Elden Ring' };
const USER: ReportTarget = { type: 'user', id: 'u1', name: 'Riko' };

function renderSheet(over: Partial<React.ComponentProps<typeof ReportSheet>> = {}) {
  const props = {
    visible: true,
    target: CARD,
    onClose: jest.fn(),
    onSubmit: jest.fn<Promise<ReportActionOutcome>, []>().mockResolvedValue('ok'),
    onError: jest.fn(),
    ...over,
  };
  const view = render(wrap(<ReportSheet {...props} />));
  return { ...props, view };
}

describe('ReportSheet (P12 · MOD-01 · report-states board)', () => {
  it('card target — lists the three card reasons; SUBMIT is dormant until a reason is chosen', () => {
    const onSubmit = jest.fn<Promise<ReportActionOutcome>, []>().mockResolvedValue('ok');
    renderSheet({ onSubmit });
    expect(screen.getByText('OFFENSIVE OR NSFW')).toBeTruthy();
    expect(screen.getByText('WRONG GAME')).toBeTruthy();
    expect(screen.getByText('SPAM OR LOW-EFFORT')).toBeTruthy();
    // dormant: pressing SUBMIT before a reason is picked does nothing (disabled Pressable)
    fireEvent.press(screen.getByText('SUBMIT REPORT'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('card target — picking a no-details reason arms SUBMIT; submit files the report → the filed confirm', async () => {
    const onSubmit = jest.fn<Promise<ReportActionOutcome>, []>().mockResolvedValue('ok');
    renderSheet({ onSubmit });
    fireEvent.press(screen.getByText('OFFENSIVE OR NSFW'));
    fireEvent.press(screen.getByText('SUBMIT REPORT'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ targetType: 'card', targetId: 'c1', reason: 'offensive' });
    // B2 — the calm ReportConfirm (no promise of review speed)
    expect(await screen.findByText('WE’LL TAKE A LOOK')).toBeTruthy();
  });

  it('game · INCORRECT INFO — SUBMIT stays dormant until the required details note is written (MOD-01)', async () => {
    const onSubmit = jest.fn<Promise<ReportActionOutcome>, []>().mockResolvedValue('ok');
    renderSheet({ target: GAME, onSubmit });
    fireEvent.press(screen.getByText('INCORRECT INFO'));
    // dormant while the note is empty
    fireEvent.press(screen.getByText('SUBMIT REPORT'));
    expect(onSubmit).not.toHaveBeenCalled();
    // type the note → SUBMIT arms → files WITH details
    fireEvent.changeText(
      screen.getByPlaceholderText('Moderators only — never shown to other players'),
      'Release date is wrong.',
    );
    fireEvent.press(screen.getByText('SUBMIT REPORT'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      targetType: 'game',
      targetId: 'g1',
      reason: 'incorrect_info',
      details: 'Release date is wrong.',
    });
  });

  it('game · DUPLICATE — needs no note, arms immediately', async () => {
    const onSubmit = jest.fn<Promise<ReportActionOutcome>, []>().mockResolvedValue('ok');
    renderSheet({ target: GAME, onSubmit });
    fireEvent.press(screen.getByText('DUPLICATE'));
    fireEvent.press(screen.getByText('SUBMIT REPORT'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ targetType: 'game', targetId: 'g1', reason: 'duplicate' });
  });

  it('submit failure keeps the drawer open + re-armed, and raises the container Toast (B3)', async () => {
    const onSubmit = jest.fn<Promise<ReportActionOutcome>, []>().mockResolvedValue('error');
    const onError = jest.fn();
    renderSheet({ onSubmit, onError });
    fireEvent.press(screen.getByText('OFFENSIVE OR NSFW'));
    fireEvent.press(screen.getByText('SUBMIT REPORT'));
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    // still on the pick view (SUBMIT present, not the confirm)
    expect(screen.getByText('SUBMIT REPORT')).toBeTruthy();
    expect(screen.queryByText('WE’LL TAKE A LOOK')).toBeNull();
  });

  it('offline submit gates calmly (SYS-10) — relabels SUBMIT WHEN ONLINE, never an error', async () => {
    const onSubmit = jest.fn<Promise<ReportActionOutcome>, []>().mockResolvedValue('offline');
    const onError = jest.fn();
    renderSheet({ onSubmit, onError });
    fireEvent.press(screen.getByText('OFFENSIVE OR NSFW'));
    fireEvent.press(screen.getByText('SUBMIT REPORT'));
    expect(await screen.findByText('SUBMIT WHEN ONLINE')).toBeTruthy();
    expect(onError).not.toHaveBeenCalled(); // offline ≠ error
  });

  it('user target — offers BLOCK alongside; card/game targets do not', () => {
    const { view } = renderSheet({ target: USER, onBlock: jest.fn().mockResolvedValue('ok') });
    expect(screen.getByText('BLOCK RIKO')).toBeTruthy();
    // a card target has no block strip
    view.rerender(wrap(<ReportSheet visible target={CARD} onClose={jest.fn()} onSubmit={jest.fn().mockResolvedValue('ok')} />));
    expect(screen.queryByText(/BLOCK/)).toBeNull();
  });

  it('user · BLOCK-alongside → the 0040 confirm → the post-block confirmation (SOC-09, files no report)', async () => {
    const onBlock = jest.fn<Promise<ReportActionOutcome>, []>().mockResolvedValue('ok');
    const onSubmit = jest.fn<Promise<ReportActionOutcome>, []>().mockResolvedValue('ok');
    renderSheet({ target: USER, onBlock, onSubmit, onManageBlocks: jest.fn() });
    fireEvent.press(screen.getByLabelText('Block Riko'));
    // the decision-0040 ConfirmSheet
    fireEvent.press(screen.getByText('BLOCK'));
    await waitFor(() => expect(onBlock).toHaveBeenCalledTimes(1));
    expect(onSubmit).not.toHaveBeenCalled(); // blocking files NO report
    expect(await screen.findByText('YOU BLOCKED RIKO')).toBeTruthy();
    expect(screen.getByText('MANAGE IN SETTINGS')).toBeTruthy();
  });
});
