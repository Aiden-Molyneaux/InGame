import React from 'react';
import { Text } from 'react-native';
import { render, screen, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from './store/prefsSlice';
import { ScrollLockContext } from './components/ScrollLock';
import { DragRankList } from './components/wtp/DragRankList';

// P10 walk-4 — the drag-lock signal (the shipped ScrollLock mechanism, design-spec 0.54 round 3):
// DragRankList must ACQUIRE the host scroll lock at drag grant and RELEASE it on drop/terminate, so
// the host ScrollView (collection · discover pass `scrollEnabled` off useScrollLockHost) freezes for
// the gesture's duration — "as you drag up and down, the screen scrolls and screws it up" (owner walk).
// The PanResponder wrappers are driven directly via the row's responder props (deterministic — no
// synthetic gesture machinery), with a minimal touchHistory the gestureState math accepts.

type TestNode = { type: unknown; props: Record<string, unknown>; children: unknown[] };

// Depth-first hunt for the first node carrying PanResponder's onResponderGrant wrapper.
function findResponderNode(node: TestNode): TestNode | null {
  if (node.props && typeof node.props.onResponderGrant === 'function') return node;
  for (const child of node.children ?? []) {
    if (typeof child === 'object' && child !== null) {
      const hit = findResponderNode(child as TestNode);
      if (hit) return hit;
    }
  }
  return null;
}

const fakeTouchEvent = {
  nativeEvent: { changedTouches: [], identifier: 0, locationX: 0, locationY: 0, pageX: 0, pageY: 0, target: 0, timestamp: 0, touches: [] },
  touchHistory: {
    mostRecentTimeStamp: 0,
    numberActiveTouches: 1,
    indexOfSingleActiveTouch: 0,
    touchBank: [
      {
        touchActive: true,
        startTimeStamp: 0,
        startPageX: 0,
        startPageY: 0,
        currentTimeStamp: 0,
        currentPageX: 0,
        currentPageY: 0,
        previousTimeStamp: 0,
        previousPageX: 0,
        previousPageY: 0,
      },
    ],
  },
};

function renderList(api: { lock: jest.Mock; unlock: jest.Mock }) {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  return render(
    <Provider store={store}>
      <ScrollLockContext.Provider value={api}>
        <DragRankList
          data={[{ id: 'a' }, { id: 'b' }]}
          keyOf={(i) => i.id}
          rowHeight={88}
          onReorder={() => {}}
          renderRow={(i) => <Text>{`ROW:${i.id}`}</Text>}
        />
      </ScrollLockContext.Provider>
    </Provider>,
  );
}

describe('WTP-01/COL-13 walk-4: DragRankList acquires the ScrollLock for the drag duration', () => {
  it('locks on drag grant, unlocks on release (host freeze via the shipped seam)', () => {
    const api = { lock: jest.fn(), unlock: jest.fn() };
    const tree = renderList(api);
    expect(screen.getByText('ROW:a')).toBeTruthy();
    // the instance tree keeps function props (toJSON strips them) — hunt the PanResponder wrapper there.
    const inst = findResponderNode(tree.root as unknown as TestNode);
    expect(inst).toBeTruthy();
    const props = inst!.props as {
      onResponderGrant: (e: unknown) => void;
      onResponderRelease: (e: unknown) => void;
    };
    act(() => props.onResponderGrant(fakeTouchEvent));
    expect(api.lock).toHaveBeenCalledTimes(1);
    expect(api.unlock).not.toHaveBeenCalled();
    act(() => props.onResponderRelease(fakeTouchEvent));
    expect(api.unlock).toHaveBeenCalledTimes(1);
  });

  it('a terminated gesture (scroll steal) still releases the lock', () => {
    const api = { lock: jest.fn(), unlock: jest.fn() };
    const tree = renderList(api);
    const inst = findResponderNode(tree.root as unknown as TestNode);
    const props = inst!.props as {
      onResponderGrant: (e: unknown) => void;
      onResponderTerminate: (e: unknown) => void;
    };
    act(() => props.onResponderGrant(fakeTouchEvent));
    act(() => props.onResponderTerminate(fakeTouchEvent));
    expect(api.lock).toHaveBeenCalledTimes(1);
    expect(api.unlock).toHaveBeenCalledTimes(1);
  });
});
