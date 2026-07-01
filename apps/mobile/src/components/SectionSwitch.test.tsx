import { render, fireEvent } from '@testing-library/react-native';
import { SectionSwitch } from './SectionSwitch';

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
      <SectionSwitch options={options} value="shelf" onChange={onChange} />,
    );
    fireEvent.press(getByText('GRID'));
    expect(onChange).toHaveBeenCalledWith('grid');
  });
});
