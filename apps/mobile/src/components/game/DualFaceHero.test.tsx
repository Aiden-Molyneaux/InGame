import { render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { DualFaceHero } from './DualFaceHero';
import prefsReducer from '../../store/prefsSlice';

// F4 (Wave D review) — the REAL DualFaceHero + the REAL StatsBack (only EntryCard, the skia face, is
// stubbed). Every OTHER suite mocks DualFaceHero, so D-1's core claims were proven only at a prop-echo
// seam; this pins them at the real render. StatsBack reads the live theme (useSelector) → a prefs Provider.
jest.mock('../EntryCard', () => ({
  EntryCard: ({ title }: { title: string }) => {
    const { Text } = require('react-native');
    return <Text>{`FACE:${title}`}</Text>;
  },
}));

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

const base = { title: 'Destiny', hours: 210, status: 'playing', since: '2014-09-09', artist: null };

describe('DualFaceHero — the shared dual-face (D-1 reuse, real render)', () => {
  it('(a) OWN defaults (no label props): the OWN face label + the OWN "YOUR STATS" heading', () => {
    render(wrap(<DualFaceHero {...base} percent={68} onInspect={jest.fn()} />));
    expect(screen.getByText('THE FACE')).toBeTruthy();
    // "YOUR STATS" is the REAL StatsBack heading AND the outer back label — both are the OWN default.
    expect(screen.getAllByText('YOUR STATS')).toHaveLength(2);
  });

  it('(b) friend-framing: statsTitle plumbs through to the REAL StatsBack heading', () => {
    render(
      wrap(
        <DualFaceHero
          {...base}
          percent={null}
          statsTitle="RIKO’S STATS"
          faceLabel="RIKO’S FACE"
          onInspect={jest.fn()}
        />,
      ),
    );
    expect(screen.getByText('RIKO’S STATS')).toBeTruthy(); // the real StatsBack heading reads the friend title
    expect(screen.getByText('RIKO’S FACE')).toBeTruthy();
  });

  it('(c) BOTH faces render — the EntryCard front AND the StatsBack back (dual-face not collapsed)', () => {
    render(wrap(<DualFaceHero {...base} percent={68} onInspect={jest.fn()} />));
    expect(screen.getByText('FACE:Destiny')).toBeTruthy(); // front (EntryCard)
    expect(screen.getByText('210')).toBeTruthy(); // back (the StatsBack HOURS row)
    expect(screen.getByText('CARD ARTIST')).toBeTruthy(); // back provenance — proves the real StatsBack rendered
  });

  it('(d) percent=null → the StatsBack COMPLETE row reads "—" (the SOC-11/0026 friend completion gate)', () => {
    render(wrap(<DualFaceHero {...base} percent={null} onInspect={jest.fn()} />));
    expect(screen.getByText('COMPLETE')).toBeTruthy();
    // since is a real date (→ "2014") and artist null (→ "DEFAULT"), so COMPLETE is the ONLY em-dash.
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('(F3) inert face (onInspect undefined) → a plain View, NOT a button; the descriptive label survives', () => {
    render(
      wrap(
        <DualFaceHero
          {...base}
          percent={null}
          faceLabel="RIKO’S FACE"
          faceA11yLabel="Riko’s Destiny card"
          onInspect={undefined}
        />,
      ),
    );
    expect(screen.queryByRole('button')).toBeNull(); // no button role anywhere in the dual-face
    expect(screen.getByLabelText('Riko’s Destiny card')).toBeTruthy(); // still describable to a screen reader
  });

  it('(F3) a real onInspect → the face IS a button (OWN/adopt-able friend path unaffected)', () => {
    render(wrap(<DualFaceHero {...base} percent={68} onInspect={jest.fn()} />));
    expect(screen.getByRole('button')).toBeTruthy();
  });
});
