import { render, fireEvent, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from '../../store/prefsSlice';
import { SectionEmpty } from './SectionEmpty';

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

// SectionEmpty (component-map §10) — the thin EmptyState wrapper: a contributor-hook (gold DESIGN-A-CARD)
// vs an add-a-game (neutral) doorway, copy + tone fixed so callers can't drift them.
describe('SectionEmpty', () => {
  it('contributor-hook renders the design-a-card door and fires onAction', () => {
    const onAction = jest.fn();
    render(wrap(<SectionEmpty variant="contributor-hook" onAction={onAction} />));
    expect(screen.getByText('NO COMMUNITY CARDS YET')).toBeTruthy();
    fireEvent.press(screen.getByText('DESIGN A CARD'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('add-a-game renders the neutral door', () => {
    render(wrap(<SectionEmpty variant="add-a-game" onAction={jest.fn()} />));
    expect(screen.getByText('ADD A GAME')).toBeTruthy();
  });

  it('honours copy overrides', () => {
    render(
      wrap(<SectionEmpty variant="contributor-hook" title="BE THE FIRST" actionLabel="Start designing" onAction={jest.fn()} />),
    );
    expect(screen.getByText('BE THE FIRST')).toBeTruthy();
    expect(screen.getByText('START DESIGNING')).toBeTruthy();
  });
});
