import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { StatsBack } from './StatsBack';
import prefsReducer from '../../store/prefsSlice';

// StatsBack reads the live theme (useTheme → useSelector), so it needs a redux Provider (GameCard.test
// pattern — a minimal prefs-only store defaults to Midnight/Teal).
const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

const base = { hours: 132, percent: 100, status: 'BEATEN', since: '2011-05-01', artist: 'MAVERICK' } as const;

describe('StatsBack (CARD-01 stats back)', () => {
  it('renders the stats + provenance', () => {
    const { getByText } = render(wrap(<StatsBack {...base} />));
    expect(getByText('YOUR STATS')).toBeTruthy();
    expect(getByText('132')).toBeTruthy(); // HOURS
    expect(getByText('100%')).toBeTruthy(); // COMPLETE
    expect(getByText('BEATEN')).toBeTruthy(); // STATUS
    expect(getByText('2011')).toBeTruthy(); // SINCE (year slice)
    expect(getByText('CARD ARTIST')).toBeTruthy();
    expect(getByText('MAVERICK')).toBeTruthy();
  });

  it('falls back for a null designer / null completion (the COL-12 null cases)', () => {
    const { getByText, getAllByText } = render(wrap(<StatsBack {...base} percent={null} since={null} artist={null} />));
    expect(getByText('DEFAULT')).toBeTruthy(); // artist ?? DEFAULT
    // percent null → "—" and since null → "—" both render the em-dash.
    expect(getAllByText('—')).toHaveLength(2);
  });

  // The backward-compat guarantee: without gameTitle/footer the game-page render is unchanged.
  it('shows NO game title and NO footer by default (game-page render)', () => {
    const { queryByText } = render(wrap(<StatsBack {...base} />));
    expect(queryByText('MINECRAFT')).toBeNull();
    expect(queryByText('FOOTERMARK')).toBeNull();
  });

  // COL-12 — the collection flip back opts into the game name + a VIEW GAME footer slot.
  it('renders the game title (uppercased) beside the YOUR STATS eyebrow when gameTitle is set', () => {
    const { getByText } = render(wrap(<StatsBack {...base} gameTitle="Minecraft" />));
    expect(getByText('MINECRAFT')).toBeTruthy();
    expect(getByText('YOUR STATS')).toBeTruthy(); // demoted to eyebrow, still present
  });

  it('renders the footer slot when provided', () => {
    const { getByText } = render(wrap(<StatsBack {...base} footer={<Text>FOOTERMARK</Text>} />));
    expect(getByText('FOOTERMARK')).toBeTruthy();
  });
});
