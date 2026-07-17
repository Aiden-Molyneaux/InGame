import { useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, View, type ViewStyle } from 'react-native';
import { themedStyles } from '../../theme';
import { useScrollLock } from '../ScrollLock';
import { indexFromDrag } from './reorder';

// DragRankList (manifest A4) — the shared FIXED-ROW-HEIGHT drag-to-reorder list backing the Top-10 ARRANGE
// re-rank and the queue reorder. Fixed row height makes the drag translation → destination index pure
// arithmetic (indexFromDrag) — no async row measuring. The lifted row follows the finger (Animated
// translateY); an orange drop-line marks the destination (board P2); the reorder commits on release.
//
// walk-4 — the SHIPPED touch-held-control scroll lock (ScrollLock, design-spec 0.54 round 3: "a
// touch-held control must LOCK its host scroll for the gesture's duration — without it the page pans
// under an active drag and the control fights the scroll"; the canvas TransformDrawer/ColorPicker
// mechanism, counted + context-based so the host ScrollView needs only its `scrollEnabled` seam). A
// drag acquires the lock at grant and releases on drop/terminate; the HOST screen (collection ·
// discover) wires `useScrollLockHost()` onto its ScrollView. Outside any host the context is a no-op.
//
// The gesture is owned by each row's GRIP (a long-press-drag handle) — a plain tap on the row body still
// works (the responder only claims the gesture once the finger moves on the grip). Rows are otherwise
// rendered by the caller via `renderRow`, so this stays a thin presentation shell.

export interface DragRankListProps<T> {
  data: T[];
  keyOf: (item: T) => string;
  rowHeight: number;
  renderRow: (item: T, index: number, dragging: boolean) => ReactNode;
  /** Called with the from/to indices on drop (only when they differ). */
  onReorder: (from: number, to: number) => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export function DragRankList<T>({
  data,
  keyOf,
  rowHeight,
  renderRow,
  onReorder,
  disabled,
  style,
}: DragRankListProps<T>) {
  const styles = useStyles();
  const { lock, unlock } = useScrollLock(); // walk-4 — freeze the host scroll for the drag's duration
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  return (
    <View style={style}>
      {data.map((item, index) => {
        const dragging = dragIndex === index;
        return (
          <View key={keyOf(item)} style={{ height: rowHeight }}>
            {/* the drop-line marks where the lifted row will land (board P2 orange dropline) */}
            {dropIndex === index && dragIndex !== null && dragIndex !== index ? (
              <View style={styles.dropline} pointerEvents="none" />
            ) : null}
            <DragRow
              rowHeight={rowHeight}
              index={index}
              count={data.length}
              disabled={disabled}
              dragging={dragging}
              onStart={() => {
                lock(); // walk-4 — the host ScrollView freezes so the drag doesn't fight the scroll
                setDragIndex(index);
                setDropIndex(index);
              }}
              onMove={(dy) => setDropIndex(indexFromDrag(index, dy, rowHeight, data.length))}
              onEnd={(dy) => {
                unlock(); // release + terminate both route here — one grant, one release (counted)
                const to = indexFromDrag(index, dy, rowHeight, data.length);
                setDragIndex(null);
                setDropIndex(null);
                if (to !== index) onReorder(index, to);
              }}
            >
              {renderRow(item, index, dragging)}
            </DragRow>
          </View>
        );
      })}
    </View>
  );
}

function DragRow({
  index,
  count,
  rowHeight,
  disabled,
  dragging,
  onStart,
  onMove,
  onEnd,
  children,
}: {
  index: number;
  count: number;
  rowHeight: number;
  disabled?: boolean;
  dragging: boolean;
  onStart: () => void;
  onMove: (dy: number) => void;
  onEnd: (dy: number) => void;
  children: ReactNode;
}) {
  const styles = useStyles();
  const translateY = useRef(new Animated.Value(0)).current;
  // Latest props/handlers in a ref so the once-created responder never reads a stale `index` (a row's
  // index shifts after a reorder — same instance by key, new index prop) or a stale callback.
  const latest = useRef({ index, count, disabled, onStart, onMove, onEnd });
  latest.current = { index, count, disabled, onStart, onMove, onEnd };
  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        !latest.current.disabled && latest.current.count > 1 && Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        translateY.setValue(0);
        latest.current.onStart();
      },
      onPanResponderMove: (_e, g) => {
        translateY.setValue(g.dy);
        latest.current.onMove(g.dy);
      },
      onPanResponderRelease: (_e, g) => {
        latest.current.onEnd(g.dy);
        Animated.timing(translateY, { toValue: 0, duration: 120, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => {
        latest.current.onEnd(0);
        translateY.setValue(0);
      },
    }),
  ).current;

  return (
    <Animated.View
      {...responder.panHandlers}
      style={[
        styles.row,
        { height: rowHeight },
        dragging && styles.rowLift,
        { transform: [{ translateY: dragging ? translateY : 0 }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const useStyles = themedStyles((t) => ({
  row: { justifyContent: 'center' },
  rowLift: {
    zIndex: 10,
    elevation: 6,
    opacity: 0.96,
    backgroundColor: t.scr.panelHi,
  },
  // the board's orange drop-line (P2) — where the lifted row lands.
  dropline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: t.scr.accent,
    zIndex: 5,
  },
}));
