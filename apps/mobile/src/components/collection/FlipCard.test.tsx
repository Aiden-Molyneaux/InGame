import { render, fireEvent, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { CollectionItem } from '@ingame/shared';
import { FlipCard } from './FlipCard';
import prefsReducer from '../../store/prefsSlice';

// Run under reduce-motion (instant swap, back settled) so the tests are deterministic — no async
// AccessibilityInfo read, no Animated timing. The tap grammar + a11y are identical to the animated path
// (the flip animation itself is a visual concern, verified in the running app), so this loses no coverage.
jest.mock('../../a11y/useReducedMotion', () => ({ useReducedMotion: () => true }));

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

// A default-face entry (no composition → CardFace renders the GameCard placeholder, no skia in jest).
const item: CollectionItem = {
  entryId: 'e1',
  gameId: 'g1',
  title: 'Elden Ring',
  developer: 'FromSoftware',
  publisher: null,
  releaseYear: 2022,
  genres: [],
  hours: 211,
  percentComplete: 68,
  status: 'beaten',
  ownedSince: '2022-02-25',
  addedAt: '2022-02-25T00:00:00.000Z',
  nowPlaying: false,
  card: { id: 'default', imageUrl: null, thumbUrl: null, isCustom: false, isPremium: false },
  rating: null,
  notes: null,
};

// FlipCard is CARD-23 mode 2 (FLIP): a tap flips; a long-press + the back's VIEW GAME navigate. These
// tests pin the tap grammar + the CARD-16 a11y so the four-mode law can't silently regress.
describe('FlipCard (COL-12 peek-flip)', () => {
  it('front: a tap FLIPS (onToggle) and never navigates', () => {
    const onToggle = jest.fn();
    const onNavigate = jest.fn();
    render(wrap(<FlipCard item={item} flipped={false} onToggle={onToggle} onNavigate={onNavigate} width={138} height={193} />));
    fireEvent.press(screen.getByRole('button', { name: 'Elden Ring card' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('front: a long-press is the NAVIGATE shortcut', () => {
    const onToggle = jest.fn();
    const onNavigate = jest.fn();
    render(wrap(<FlipCard item={item} flipped={false} onToggle={onToggle} onNavigate={onNavigate} width={138} height={193} />));
    fireEvent(screen.getByRole('button', { name: 'Elden Ring card' }), 'longPress');
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('back: a tap on the card FLIPS IT BACK (onToggle), not navigate', () => {
    // The flipped card's whole face taps back to the front — the flip layer catches stats-area taps
    // (StatsBack's content is pointerEvents:none so taps fall through to it); VIEW GAME is the exception.
    const onToggle = jest.fn();
    const onNavigate = jest.fn();
    render(wrap(<FlipCard item={item} flipped onToggle={onToggle} onNavigate={onNavigate} width={138} height={193} />));
    fireEvent.press(screen.getByRole('button', { name: /Elden Ring stats/ }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('back: the SR label reads the stats out (the card is one a11y element)', () => {
    render(wrap(<FlipCard item={item} flipped onToggle={jest.fn()} onNavigate={jest.fn()} width={138} height={193} />));
    // The whole card is one screen-reader button whose label carries the current face's content — the
    // nested rows/button aren't individually focusable inside an accessible container (the murr a11y fix).
    const card = screen.getByRole('button', { name: /Elden Ring stats/ });
    const label = card.props.accessibilityLabel as string;
    expect(label).toContain('211 hours');
    expect(label).toContain('68 percent complete');
    expect(label).toContain('BEATEN');
  });

  it('back: the View-game accessibility action is the SR NAVIGATE path (CARD-16 non-gesture)', () => {
    const onNavigate = jest.fn();
    render(wrap(<FlipCard item={item} flipped onToggle={jest.fn()} onNavigate={onNavigate} width={138} height={193} />));
    const card = screen.getByRole('button', { name: /Elden Ring stats/ });
    fireEvent(card, 'accessibilityAction', { nativeEvent: { actionName: 'viewgame' } });
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('back: the visible VIEW GAME keycap navigates without re-flipping (touch path)', () => {
    const onToggle = jest.fn();
    const onNavigate = jest.fn();
    render(wrap(<FlipCard item={item} flipped onToggle={onToggle} onNavigate={onNavigate} width={138} height={193} />));
    // The keycap is a11y-hidden (the outer card is the one SR element), so query with includeHiddenElements;
    // it's visually present and settled (reduce-motion → instant), so a sighted touch fires onNavigate.
    fireEvent.press(screen.getByText('VIEW GAME ›', { includeHiddenElements: true }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onToggle).not.toHaveBeenCalled(); // the nested keycap doesn't bubble to the flip tap
  });

  it('reduce-motion — the back is presented instantly (no stuck half-flip)', () => {
    render(wrap(<FlipCard item={item} flipped onToggle={jest.fn()} onNavigate={jest.fn()} width={138} height={193} />));
    expect(screen.getByText('VIEW GAME ›', { includeHiddenElements: true })).toBeTruthy();
  });
});
