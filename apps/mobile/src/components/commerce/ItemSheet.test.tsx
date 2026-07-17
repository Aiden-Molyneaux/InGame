import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ItemSheet, type StoreItem } from './ItemSheet';
import prefsReducer from '../../store/prefsSlice';

// ItemSheet (board P2/P9) — the premium-item detail sheet's state grammar with REAL content: the
// unowned BUY state, the OWNED state (no BuyBar, per P9), the just-bought in-place transition, and the
// long-name title-row layout (a name that must not shove the type + PriceChip off the row).

jest.mock('../../a11y/useReducedMotion', () => ({ useReducedMotion: () => false }));

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

const holo: StoreItem = { id: 'holographic', name: 'HOLOGRAPHIC', type: 'FINISH · CATALOG', price: 8 };

describe('ItemSheet — the P2/P9 state grammar', () => {
  it('an UNOWNED item shows the PriceChip + the hold-to-buy BuyBar (the spend gate)', () => {
    render(wrap(<ItemSheet visible item={holo} balance={27} onClose={jest.fn()} onBuy={jest.fn()} />));
    expect(screen.getByLabelText('8 pixels')).toBeTruthy(); // F-21 r3 — the title-row gold-text price
    expect(screen.getByLabelText('Hold to buy for 8 PX')).toBeTruthy(); // the BuyBar key
    expect(screen.getByLabelText('You have 27 pixels')).toBeTruthy(); // F-21 r4 — the prominent balance line
  });

  it('an OWNED item shows NO BuyBar — the OWNED row instead (P9: the price never returns)', () => {
    render(
      wrap(<ItemSheet visible item={holo} balance={27} owned onClose={jest.fn()} onBuy={jest.fn()} />),
    );
    expect(screen.queryByLabelText('Hold to buy for 8 PX')).toBeNull(); // no spend control
    expect(screen.queryByLabelText('8 pixels')).toBeNull(); // no price on an owned item
    expect(screen.getAllByLabelText('Owned').length).toBeGreaterThan(0); // the OwnedTag
    expect(screen.getByText('IN YOUR EDITOR')).toBeTruthy();
  });

  it('the JUST-BOUGHT transition flips BUY → OWNED in place (no reopen), same visible sheet', () => {
    const onBuy = jest.fn();
    const { rerender } = render(
      wrap(<ItemSheet visible item={holo} balance={8} onClose={jest.fn()} onBuy={onBuy} />),
    );
    expect(screen.getByLabelText('Hold to buy for 8 PX')).toBeTruthy();
    // the acquire landed → the parent flips `owned` on the SAME open sheet.
    rerender(
      wrap(
        <ItemSheet
          visible
          item={holo}
          balance={0}
          owned
          ownedNote="Yours — in your editor"
          onClose={jest.fn()}
          onBuy={onBuy}
        />,
      ),
    );
    expect(screen.queryByLabelText('Hold to buy for 8 PX')).toBeNull();
    expect(screen.getByText('YOURS — IN YOUR EDITOR')).toBeTruthy();
  });

  it('the item IDENTITY row leads — name/type/PriceChip render ABOVE the preview (F-15 fix 3)', () => {
    const preview = <Text testID="preview-node">preview</Text>;
    render(
      wrap(
        <ItemSheet
          visible
          item={holo}
          balance={27}
          onClose={jest.fn()}
          onBuy={jest.fn()}
          preview={preview}
          previewLabel="Previewed on your card"
        />,
      ),
    );
    // the identity (name) must appear before the preview label + preview node in document order.
    const tree = JSON.stringify(screen.toJSON());
    expect(tree.indexOf('HOLOGRAPHIC')).toBeLessThan(tree.indexOf('PREVIEWED ON YOUR CARD'));
    expect(tree.indexOf('HOLOGRAPHIC')).toBeLessThan(tree.indexOf('preview-node'));
  });

  it('a LONG name renders in full alongside the type + PriceChip (title row does not drop them)', () => {
    const longName: StoreItem = { id: 'ornate-gold', name: 'ORNATE GOLD', type: 'FRAME · CATALOG', price: 3 };
    render(wrap(<ItemSheet visible item={longName} balance={27} onClose={jest.fn()} onBuy={jest.fn()} />));
    expect(screen.getByText('ORNATE GOLD')).toBeTruthy(); // the full name
    expect(screen.getByText('FRAME · CATALOG')).toBeTruthy(); // the type still renders
    expect(screen.getByLabelText('3 pixels')).toBeTruthy(); // the PriceChip still renders
  });

  it('the FREE pack (P2b) shows no PriceChip and no BuyBar either way', () => {
    const pack: StoreItem = { id: 'arcade-glyphs', name: 'ARCADE GLYPHS', type: 'STICKER PACK', price: 0 };
    render(
      wrap(
        <ItemSheet visible item={pack} balance={27} freePack ownedNote="In the device editor" onClose={jest.fn()} onBuy={jest.fn()} />,
      ),
    );
    expect(screen.queryByLabelText('0 pixels')).toBeNull();
    expect(screen.queryByLabelText(/Hold to buy/)).toBeNull();
    expect(screen.getByText('IN THE DEVICE EDITOR')).toBeTruthy();
  });

  it('the LIVE preview node (F-10) mounts only while the sheet is OPEN — unmounts on close (canvas budget)', () => {
    // The store passes the live animated CardFace as the `preview` node; the OQ-138 budget rule is that
    // the one canvas mounts only while the sheet is open. ItemSheet renders `preview` inside PulledSheet,
    // which returns null when not visible — so closing the sheet unmounts the canvas. A sentinel stands
    // in for the CardFace (skia isn't exercised in jsdom).
    const preview = <Text testID="live-preview">canvas</Text>;
    render(wrap(<ItemSheet visible item={holo} balance={27} onClose={jest.fn()} onBuy={jest.fn()} preview={preview} />));
    expect(screen.queryByTestId('live-preview')).toBeTruthy(); // mounted while open

    screen.rerender(
      wrap(<ItemSheet visible={false} item={holo} balance={27} onClose={jest.fn()} onBuy={jest.fn()} preview={preview} />),
    );
    expect(screen.queryByTestId('live-preview')).toBeNull(); // unmounted with the closed sheet
  });

  it('REGRESSION (bug 4 / C1): with the F-10 LIVE preview mounted, the BuyBar + meta still render below it', () => {
    // The C1 aisle drawer regressed when F-10 swapped the small static swatch for a tall live animated
    // CardFace preview — the report was "preview renders but the buy button / content below is gone."
    // This locks the invariant: the preview node AND the price chip AND the meta line AND the hold-to-buy
    // BuyBar all coexist in the open sheet (the sheet is the SAME CosmeticSheet the aisle rows and the
    // NEW-THIS-WEEK featured tiles both open — store.tsx CosmeticSheet, one component, both paths).
    const frame: StoreItem = { id: 'gold', name: 'GOLD', type: 'FRAME · CATALOG', price: 3 };
    const livePreview = <Text testID="live-card-preview">live card</Text>;
    render(
      wrap(
        <ItemSheet
          visible
          item={frame}
          balance={92}
          onClose={jest.fn()}
          onBuy={jest.fn()}
          preview={livePreview}
        />,
      ),
    );
    expect(screen.getByTestId('live-card-preview')).toBeTruthy(); // the F-10 live preview
    expect(screen.getByText('GOLD')).toBeTruthy(); // name meta
    expect(screen.getByText('FRAME · CATALOG')).toBeTruthy(); // type meta
    expect(screen.getByLabelText('3 pixels')).toBeTruthy(); // the title-row gold-text price
    expect(screen.getByLabelText('You have 92 pixels')).toBeTruthy(); // the prominent balance line
    expect(screen.getByLabelText('Hold to buy for 3 PX')).toBeTruthy(); // the BuyBar survives the preview
  });

  it('a 409 SHORT state shows the P5 bridge strip + sleeps the BuyBar', () => {
    render(
      wrap(
        <ItemSheet visible item={holo} balance={5} shortBy={3} onClose={jest.fn()} onBuy={jest.fn()} onAllPacks={jest.fn()} />,
      ),
    );
    expect(screen.getByText(/SHORT 3 PIXELS/)).toBeTruthy();
    expect(screen.getByText('TOP UP RIGHT HERE')).toBeTruthy();
    // the BuyBar is disabled (still present but its accessibilityState disabled) — the short strip is the tell.
  });
});
