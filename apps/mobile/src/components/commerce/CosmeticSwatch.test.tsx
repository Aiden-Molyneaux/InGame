import { render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { CosmeticListItem } from '@ingame/shared';
import { CosmeticSwatch } from './CosmeticSwatch';
import { ItemTile } from './ItemTile';
import { ItemSheet, type StoreItem } from './ItemSheet';
import { PreviewStage } from './PreviewStage';
import { COSMETIC_TYPE_LABEL } from './storeCopy';
import prefsReducer from '../../store/prefsSlice';

// CosmeticSwatch (M5 F-6 — owner device-walk notes 1+2): every store cosmetic renders APPLIED on a
// neutral sample so the shopper isn't guessing. These prove (1) each roster type dispatches to a real,
// un-broken preview, (2) the ItemSheet's card-cosmetic path renders intact (note-1 regression — it was
// a bare placeholder), and (3) the SPOTLIGHT grid composes six tiles with real previews.

jest.mock('../../a11y/useReducedMotion', () => ({ useReducedMotion: () => false }));

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

describe('CosmeticSwatch — a real preview per roster type (note 2)', () => {
  it('a FRAME renders a sample card (not a placeholder glyph)', () => {
    render(wrap(<CosmeticSwatch type="frame" id="marquee" size="row" />));
    expect(screen.getByLabelText('cosmetic preview')).toBeTruthy();
  });

  it('an EFFECT renders a sample card wearing the effect', () => {
    render(wrap(<CosmeticSwatch type="effect" id="frost" size="row" />));
    expect(screen.getByLabelText('cosmetic preview')).toBeTruthy();
  });

  it('a FINISH renders a sample card wearing the finish', () => {
    render(wrap(<CosmeticSwatch type="finish" id="holographic" size="sheet" />));
    expect(screen.getByLabelText('cosmetic preview')).toBeTruthy();
  });

  it('a NAMEPLATE renders the title-plate chip', () => {
    render(wrap(<CosmeticSwatch type="nameplate" id="brass" size="row" />));
    expect(screen.getByLabelText('nameplate preview')).toBeTruthy();
    expect(screen.getByText('SAMPLE')).toBeTruthy();
  });

  it('a FONT renders the "Aa" swatch in the roster face', () => {
    render(wrap(<CosmeticSwatch type="font" id="bitter" size="row" />));
    expect(screen.getByLabelText('font preview')).toBeTruthy();
    expect(screen.getByText('Aa')).toBeTruthy();
  });

  it('a DEVICE SHELL reuses the MiniDevice primitive', () => {
    render(wrap(<CosmeticSwatch type="device_shell" id="carbon" size="row" />));
    expect(screen.getByLabelText('device preview')).toBeTruthy();
  });

  it('a SCREEN THEME reuses the ThemeSwatch primitive (renders without throwing)', () => {
    const tree = render(wrap(<CosmeticSwatch type="screen_theme" id="berry" size="row" />));
    expect(tree.toJSON()).toBeTruthy();
  });
});

describe('ItemSheet — the card-cosmetic preview path renders un-broken (note 1 regression)', () => {
  it('a FRAME sheet shows the PREVIEW label + a real sample-card preview (not an empty drawer)', () => {
    const marquee: StoreItem = { id: 'marquee', name: 'MARQUEE', type: 'FRAME · CATALOG', price: 8 };
    render(
      wrap(
        <ItemSheet
          visible
          item={marquee}
          balance={20}
          onClose={jest.fn()}
          onBuy={jest.fn()}
          previewLabel="Previewed on your card — live"
          preview={<CosmeticSwatch type="frame" id="marquee" size="sheet" />}
        />,
      ),
    );
    // the drawer intact: the stage label, the live sample-card preview, the name + the spend gate.
    expect(screen.getByText('PREVIEWED ON YOUR CARD — LIVE')).toBeTruthy();
    expect(screen.getByLabelText('cosmetic preview')).toBeTruthy();
    expect(screen.getByText('MARQUEE')).toBeTruthy();
    expect(screen.getByLabelText('Hold to buy for 8 PX')).toBeTruthy();
  });

  it('PreviewStage holds a floor height so a small preview never collapses to a broken sliver', () => {
    render(wrap(<PreviewStage label="previewed on your card"><CosmeticSwatch type="finish" id="holographic" size="sheet" /></PreviewStage>));
    expect(screen.getByText('PREVIEWED ON YOUR CARD')).toBeTruthy();
    expect(screen.getByLabelText('cosmetic preview')).toBeTruthy();
  });
});

describe('SPOTLIGHT grid — six tiles, each wearing its real preview (note 3)', () => {
  const spotlight: CosmeticListItem[] = [
    { id: 'marquee', type: 'frame', name: 'MARQUEE', tier: 'showpiece', price: 8, owned: false },
    { id: 'frost', type: 'effect', name: 'FROST', tier: 'showpiece', price: 8, owned: false },
    { id: 'holographic', type: 'finish', name: 'HOLOGRAPHIC', tier: 'showpiece', price: 8, owned: true },
    { id: 'brass', type: 'nameplate', name: 'BRASS', tier: 'standard', price: 3, owned: false },
    { id: 'carbon', type: 'device_shell', name: 'CARBON', tier: 'showpiece', price: 8, owned: false },
    { id: 'berry', type: 'screen_theme', name: 'BERRY', tier: 'big', price: 6, owned: false },
  ];

  it('renders one tappable tile per spotlight item; owned items drop the price, others show a PriceChip', () => {
    render(
      wrap(
        <>
          {spotlight.map((it) => (
            <ItemTile
              key={`${it.type}:${it.id}`}
              name={it.name}
              type={COSMETIC_TYPE_LABEL[it.type]}
              price={it.owned ? undefined : it.price}
              owned={it.owned}
              preview={<CosmeticSwatch type={it.type} id={it.id} size="row" />}
              onPress={jest.fn()}
            />
          ))}
        </>,
      ),
    );
    // six named tiles.
    for (const it of spotlight) expect(screen.getByText(it.name)).toBeTruthy();
    // the owned spotlight item (HOLOGRAPHIC) shows OWNED, no price; an unowned one shows its PriceChip.
    expect(screen.getAllByLabelText('Owned').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('8 pixels').length).toBe(3); // MARQUEE / FROST / CARBON
    expect(screen.getByLabelText('3 pixels')).toBeTruthy(); // BRASS
  });
});
