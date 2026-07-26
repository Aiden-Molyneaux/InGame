import { useState } from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from '../store/prefsSlice';
import { ColorField } from './ColorPicker';

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

// walk-4 P3-b — the shared ColorField grew OPTIONAL single-open coordination for the Monogram Forge's
// bg + ink pair. The contract this file pins:
//   • omit the props and NOTHING changes — several fields can sit expanded at once (the Styler's
//     ultimate-colour rows and the Canvas EditSlipSheet rely on the field governing itself), and
//   • supply them and the parent decides which ONE is up.
// The first half is the guard that this shared-component change stayed additive for other call-sites.
function Pair({ coordinated }: { coordinated: boolean }) {
  const [open, setOpen] = useState<'a' | 'b' | null>(null);
  const [a, setA] = useState('#112233');
  const [b, setB] = useState('#445566');
  return (
    <>
      <ColorField
        value={a}
        onChange={setA}
        open={coordinated ? open === 'a' : undefined}
        onOpenChange={coordinated ? (o) => setOpen((p) => (o ? 'a' : p === 'a' ? null : p)) : undefined}
      />
      <ColorField
        value={b}
        onChange={setB}
        open={coordinated ? open === 'b' : undefined}
        onOpenChange={coordinated ? (o) => setOpen((p) => (o ? 'b' : p === 'b' ? null : p)) : undefined}
      />
    </>
  );
}

const openPickers = () => screen.queryAllByLabelText('Colour picker').length;

describe('ColorField — optional single-open coordination (P3-b)', () => {
  it('UNCOORDINATED (the default, every pre-existing call-site): both fields can be expanded at once', () => {
    render(wrap(<Pair coordinated={false} />));
    fireEvent.press(screen.getAllByLabelText('PICK COLOUR')[0]!);
    fireEvent.press(screen.getByLabelText('PICK COLOUR')); // the remaining closed one
    expect(openPickers()).toBe(2); // unchanged behaviour — the field still governs itself
  });

  it('COORDINATED: opening the second collapses the first — never two', () => {
    render(wrap(<Pair coordinated />));
    fireEvent.press(screen.getAllByLabelText('PICK COLOUR')[0]!);
    expect(openPickers()).toBe(1);
    fireEvent.press(screen.getByLabelText('PICK COLOUR'));
    expect(openPickers()).toBe(1);
  });

  it('COORDINATED: the field still closes itself, and the parent-driven collapse does not echo back', () => {
    render(wrap(<Pair coordinated />));
    fireEvent.press(screen.getAllByLabelText('PICK COLOUR')[0]!);
    fireEvent.press(screen.getByLabelText('PICK COLOUR')); // second up, first collapsed
    fireEvent.press(screen.getByLabelText('CLOSE PICKER')); // user closes the survivor
    expect(openPickers()).toBe(0); // …and the parent's slot cleared with it (re-openable)
    fireEvent.press(screen.getAllByLabelText('PICK COLOUR')[0]!);
    expect(openPickers()).toBe(1);
  });

  it('a parent-driven collapse commits the pick the same way a manual close does', () => {
    const onCommit = jest.fn();
    const { rerender } = render(
      wrap(<ColorField value="#aabbcc" onChange={jest.fn()} onCommit={onCommit} open />),
    );
    fireEvent.press(screen.getByLabelText('PICK COLOUR'));
    expect(onCommit).not.toHaveBeenCalled();
    rerender(wrap(<ColorField value="#aabbcc" onChange={jest.fn()} onCommit={onCommit} open={false} />));
    expect(onCommit).toHaveBeenCalledWith('#aabbcc'); // the final colour is recorded, not dropped
    expect(openPickers()).toBe(0);
  });

  it('a CLOSED coordinated field is not re-committed when the parent moves focus elsewhere', () => {
    // the PATCH-storm guard: `open` flipping false on an already-closed field must be a no-op.
    const onCommit = jest.fn();
    const { rerender } = render(
      wrap(<ColorField value="#aabbcc" onChange={jest.fn()} onCommit={onCommit} open />),
    );
    rerender(wrap(<ColorField value="#aabbcc" onChange={jest.fn()} onCommit={onCommit} open={false} />));
    expect(onCommit).not.toHaveBeenCalled();
  });
});
