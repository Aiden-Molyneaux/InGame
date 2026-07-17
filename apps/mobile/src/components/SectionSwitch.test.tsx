import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { SectionSwitch } from './SectionSwitch';
import prefsReducer from '../store/prefsSlice';

// The component reads the live theme (useTheme → useSelector), so it needs a redux Provider. A minimal
// prefs-only store (defaults = Midnight/Teal — the tokens it baked in before the theme engine) rather
// than the real one: the real store wires redux-persist/AsyncStorage, a native module jest lacks.
const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

// SectionSwitch (F-09) — the active option carries an accent border + StateMark; tapping an option
// reports the new value (the Collection SHELF·GRID·LIST·TOP switch).
describe('SectionSwitch', () => {
  const options = [
    { value: 'shelf' as const, label: 'Shelf' },
    { value: 'grid' as const, label: 'Grid' },
  ];

  it('invokes onChange with the tapped option value', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      wrap(<SectionSwitch options={options} value="shelf" onChange={onChange} />),
    );
    fireEvent.press(getByText('GRID'));
    expect(onChange).toHaveBeenCalledWith('grid');
  });
});
