import React, { type ReactElement } from 'react';
import { render } from '@testing-library/react-native';
import { View, StyleSheet } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from './store/prefsSlice';
import { ScreenHead, HEADER_CONTENT_HEIGHT } from './components/ScreenHead';

// W-B1b (owner: "the header spacing must be independent of the button") — the header title's vertical
// geometry must NOT depend on which trailing control a screen carries. Before the fix, ScreenHead's row
// was in-flow with alignItems:'center', so a trailing control taller than the 21px title (the 34px
// Friends HeaderKey vs the ~24px counters) grew that row and dropped the title ~5px below
// Collection/Profile. The fix pins the row to HEADER_CONTENT_HEIGHT and takes the trailing cluster OUT
// OF FLOW (absolute), so it can never grow the row. RED on main (head has no minHeight, in-flow cluster
// grows the row), GREEN with the fix.

// ScreenHead reads the live theme (themedStyles → useSelector), so it needs a redux Provider.
const renderHead = (node: ReactElement) =>
  render(<Provider store={configureStore({ reducer: { prefs: prefsReducer } })}>{node}</Provider>);

describe('ScreenHead — W-B1b title geometry is invariant to the trailing control', () => {
  it('pins the same band height + title lineHeight with a TALL trailing control and with none', () => {
    const withTall = renderHead(
      <ScreenHead title="Friends" trailing={<View testID="tall" style={{ height: 80, width: 40 }} />} />,
    );
    const bare = renderHead(<ScreenHead title="Collection" />);

    // the head band is pinned identically regardless of the trailing control
    const headWith = StyleSheet.flatten(withTall.getByTestId('screen-head').props.style);
    const headBare = StyleSheet.flatten(bare.getByTestId('screen-head').props.style);
    expect(headWith.minHeight).toBe(HEADER_CONTENT_HEIGHT);
    expect(headBare.minHeight).toBe(HEADER_CONTENT_HEIGHT);

    // the title box == the band on both (deterministic, font-metric-independent)
    const titleWith = StyleSheet.flatten(withTall.getByRole('header').props.style);
    const titleBare = StyleSheet.flatten(bare.getByRole('header').props.style);
    expect(titleWith.lineHeight).toBe(HEADER_CONTENT_HEIGHT);
    expect(titleBare.lineHeight).toBe(HEADER_CONTENT_HEIGHT);
  });

  it('takes the trailing cluster OUT OF FLOW (absolute) so it cannot grow the row', () => {
    const { getByTestId } = renderHead(
      <ScreenHead title="Friends" trailing={<View testID="tall" style={{ height: 80 }} />} />,
    );
    const cluster = StyleSheet.flatten(getByTestId('screen-head-trailing').props.style);
    expect(cluster.position).toBe('absolute');
  });
});
