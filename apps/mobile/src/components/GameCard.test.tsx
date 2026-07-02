import { render } from '@testing-library/react-native';
import { GameCard } from './GameCard';

// GameCard (F-01/F-06) — the full face is always rendered (never cropped), and the title is a legible
// label at every size: a plate on /grid, named below on /mini (which drops the F-06 plate).
describe('GameCard', () => {
  it('renders the title as a label on a plated size (grid)', () => {
    const { getByText } = render(<GameCard title="Hollow Knight" size="grid" />);
    expect(getByText('Hollow Knight')).toBeTruthy();
  });

  it('still names the game on /mini (plate dropped, F-06)', () => {
    const { getByText } = render(<GameCard title="Celeste" size="mini" />);
    expect(getByText('Celeste')).toBeTruthy();
  });

  it('shows the NOW tag when now-playing', () => {
    const { getByText } = render(<GameCard title="Hades" size="grid" nowPlaying />);
    expect(getByText('▶ NOW')).toBeTruthy();
  });
});
