import { render } from '@testing-library/react-native';
import { GameCard } from './GameCard';

// GameCard (F-01/F-06) — the full face is always rendered (never cropped); the title is a plate
// label on /grid+/cell, while /mini + /thumb carry NO in-face text (C7/decision 0047 — the host
// names the game beside the card; a11y keeps the label).
describe('GameCard', () => {
  it('renders the title as a label on a plated size (grid)', () => {
    const { getByText } = render(<GameCard title="Hollow Knight" size="grid" />);
    expect(getByText('Hollow Knight')).toBeTruthy();
  });

  it('/mini carries NO in-face title (C7/0047) but keeps the a11y label', () => {
    const { queryByText, getByLabelText } = render(<GameCard title="Celeste" size="mini" />);
    expect(queryByText('Celeste')).toBeNull();
    expect(getByLabelText('Celeste card')).toBeTruthy();
  });

  it('shows the NOW tag when now-playing', () => {
    const { getByText } = render(<GameCard title="Hades" size="grid" nowPlaying />);
    expect(getByText('▶ NOW')).toBeTruthy();
  });
});
