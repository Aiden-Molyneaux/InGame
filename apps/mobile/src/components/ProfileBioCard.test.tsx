import { render, screen } from '@testing-library/react-native';
import { ProfileBioCard } from './ProfileBioCard';

// The targeted RNTL component test stood up now (testing-strategy §9 Foundation harness). Behavior,
// not pixels: the card renders the username + bio it is given.
describe('ProfileBioCard', () => {
  it('renders the username and bio', () => {
    render(<ProfileBioCard username="curator" bio="collector of trophies" />);
    expect(screen.getByText('@curator')).toBeTruthy();
    expect(screen.getByText('collector of trophies')).toBeTruthy();
  });
});
