import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { PersonSummary } from '@ingame/shared';
import prefsReducer from '../../store/prefsSlice';

jest.mock('../../a11y/useReducedMotion', () => ({ useReducedMotion: () => true }));

import { FriendActionsSheet } from './FriendActionsSheet';

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

const PERSON: PersonSummary = { userId: 'u-1', username: 'riko', avatarUrl: null, relationship: 'friend' };

function renderSheet(over: Partial<React.ComponentProps<typeof FriendActionsSheet>> = {}) {
  const cb = {
    onClose: jest.fn(),
    onView: jest.fn(),
    onCompare: jest.fn(),
    onRecommend: jest.fn(),
    onUnfriend: jest.fn(),
    onReport: jest.fn(),
    onBlock: jest.fn(),
    ...over,
  };
  render(wrap(<FriendActionsSheet visible person={PERSON} {...cb} />));
  return cb;
}

describe('FriendActionsSheet — P6 actions menu routing (no SHARE)', () => {
  it('renders every action row and NO share', () => {
    renderSheet();
    expect(screen.getByText('VIEW PROFILE')).toBeTruthy();
    expect(screen.getByText('COMPARE HOURS')).toBeTruthy();
    expect(screen.getByText('RECOMMEND A GAME')).toBeTruthy();
    expect(screen.getByText('UNFRIEND')).toBeTruthy();
    expect(screen.getByText('REPORT')).toBeTruthy();
    expect(screen.getByText('BLOCK')).toBeTruthy();
    expect(screen.queryByText(/SHARE/)).toBeNull();
  });

  it('each row fires its callback', () => {
    const cb = renderSheet();
    fireEvent.press(screen.getByText('VIEW PROFILE'));
    expect(cb.onView).toHaveBeenCalled();
    fireEvent.press(screen.getByText('COMPARE HOURS'));
    expect(cb.onCompare).toHaveBeenCalled();
    fireEvent.press(screen.getByText('RECOMMEND A GAME'));
    expect(cb.onRecommend).toHaveBeenCalled();
    fireEvent.press(screen.getByText('UNFRIEND'));
    expect(cb.onUnfriend).toHaveBeenCalled();
    fireEvent.press(screen.getByText('REPORT'));
    expect(cb.onReport).toHaveBeenCalled();
    fireEvent.press(screen.getByText('BLOCK'));
    expect(cb.onBlock).toHaveBeenCalled();
  });

  it('null person → renders nothing', () => {
    render(wrap(<FriendActionsSheet visible person={null} onClose={jest.fn()} onView={jest.fn()} onCompare={jest.fn()} onRecommend={jest.fn()} onUnfriend={jest.fn()} onReport={jest.fn()} onBlock={jest.fn()} />));
    expect(screen.queryByText('VIEW PROFILE')).toBeNull();
  });
});
