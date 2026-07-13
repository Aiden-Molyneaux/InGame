import { render, fireEvent, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from '../../store/prefsSlice';
import { PressSheet, type PublishChecklist } from './PressSheet';

jest.mock('../../a11y/useReducedMotion', () => ({ useReducedMotion: () => true }));

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

const CHECK_OK: PublishChecklist = { complexity: 'ok', unique: 'unknown', premium: 'ok', premiumCost: 0 };

function sheet(checklist: PublishChecklist, onPublish = jest.fn(), publishBusy = false) {
  return wrap(
    <PressSheet
      visible
      onClose={jest.fn()}
      busy={false}
      onSavePrivate={jest.fn()}
      onToStyler={jest.fn()}
      checklist={checklist}
      onPublish={onPublish}
      publishBusy={publishBusy}
    />,
  );
}

// PressSheet (canvas board P7) — ◆ PUBLISH live + the CARD-19 checklist states.
describe('PressSheet — the CARD-19 checklist drives ◆ PUBLISH', () => {
  it('all-clear: PUBLISH is live and fires onPublish; the checklist reads ok', () => {
    const onPublish = jest.fn();
    render(sheet(CHECK_OK, onPublish));
    expect(screen.getByText('Enough to stand on its own')).toBeTruthy();
    expect(screen.getByText('Checked against the gallery on publish')).toBeTruthy();
    expect(screen.getByText('Premium components owned')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('◆ Publish'));
    expect(onPublish).toHaveBeenCalledTimes(1);
  });

  it('complexity fail: PUBLISH disables and the row names the floor', () => {
    const onPublish = jest.fn();
    render(sheet({ ...CHECK_OK, complexity: 'fail' }, onPublish));
    expect(screen.getByText('Needs 3 elements or 2 kinds')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('◆ Publish'));
    expect(onPublish).not.toHaveBeenCalled();
  });

  it('dedup fail (a DUPLICATE_COMPOSITION 409 surfaced): the UNIQUE row flips to its fail copy', () => {
    render(sheet({ ...CHECK_OK, unique: 'fail' }));
    expect(screen.getByText('This exact card already exists')).toBeTruthy();
  });

  it('premium debt: the row carries the reconcile cost and PUBLISH stays live (it opens the reconcile)', () => {
    const onPublish = jest.fn();
    render(sheet({ ...CHECK_OK, premium: 'debt', premiumCost: 11 }, onPublish));
    expect(screen.getByText('11')).toBeTruthy(); // the premium checklist row's cost
    expect(screen.getByText(/to reconcile/)).toBeTruthy();
    fireEvent.press(screen.getByLabelText('◆ Publish'));
    expect(onPublish).toHaveBeenCalledTimes(1); // the publish path routes into the ReconcileSheet
  });
});
