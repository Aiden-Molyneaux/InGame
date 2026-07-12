import { render, fireEvent, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { EmptyState } from './EmptyState';
import prefsReducer from '../../store/prefsSlice';

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

// EmptyState (component-map §5.6 · design-spec §1.6) — the INVITING DOORWAY: icon + headline + optional
// action; `tone` carries F-02 intent (gold = DESIGN A CARD, neutral = ADD A GAME). The §10 SectionEmpty
// variants are expressible via these props.
describe('EmptyState (design-spec §1.6 empty / doorway)', () => {
  it('renders the headline + body', () => {
    render(wrap(<EmptyState title="No cards yet" message="Design the first one." />));
    expect(screen.getByText('NO CARDS YET')).toBeTruthy();
    expect(screen.getByText('Design the first one.')).toBeTruthy();
  });

  it('the doorway CTA fires onAction', () => {
    const onAction = jest.fn();
    render(wrap(<EmptyState title="No games" actionLabel="Add a game" onAction={onAction} tone="neutral" />));
    fireEvent.press(screen.getByText('ADD A GAME'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('gold tone exposes the acquisitive DESIGN-A-CARD door', () => {
    const onAction = jest.fn();
    render(wrap(<EmptyState title="Be first" actionLabel="Design a card" onAction={onAction} tone="gold" />));
    fireEvent.press(screen.getByText('DESIGN A CARD'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders without an action (still not a dead end)', () => {
    render(wrap(<EmptyState title="All caught up" />));
    expect(screen.getByText('ALL CAUGHT UP')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
