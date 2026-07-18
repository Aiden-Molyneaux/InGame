import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import prefsReducer from '../../store/prefsSlice';
import { AttributeSection, type AttributeOption } from './AttributeSection';
import type { CardComposition } from '../../render/composition';

// walk2 A5 — the styler premium PriceChip layering. In the CardRail (the one-strip-canvas rail,
// decision 0068) the badges rendered INSIDE the Pressable tiles, which are EARLIER siblings of the
// absolutely-positioned strip canvas — RN paints later siblings on top and a child's zIndex can't
// escape its parent, so the card canvas painted OVER every price ("cost hidden", owner walk2). The fix
// hoists the badges into the same above-strip overlay the selection pip got at 0068. These tests pin
// the hoist structurally: the chip must NOT be a descendant of any Pressable tile (it lives in the
// overlay layer, painted after — thus above — the strip).

// The skia strip lazy-imports; keep the test hermetic (the boundary would swallow it anyway).
jest.mock('../canvas/lazySkia', () => ({ LazyCompositionStrip: () => null }));

const COMP = {} as CardComposition;
const OPTIONS: AttributeOption[] = [
  { id: 'free-1', name: 'Plain', preview: COMP },
  { id: 'prem-1', name: 'Foil', preview: COMP },
];

type TestNode = { parent: TestNode | null; type: unknown };
function hasPressableAncestor(node: TestNode): boolean {
  let p: TestNode | null = node.parent;
  while (p) {
    const ty = p.type as { displayName?: string; name?: string } | string;
    const name = typeof ty === 'string' ? ty : (ty?.displayName ?? ty?.name ?? '');
    if (/Pressable/.test(String(name))) return true;
    p = p.parent;
  }
  return false;
}

function renderRail(badges: Record<string, { owned: boolean; price: number }>, selectedId = 'free-1') {
  const store = configureStore({ reducer: { prefs: prefsReducer } });
  return render(
    <Provider store={store}>
      <AttributeSection
        heading="FRAME"
        options={OPTIONS}
        selectedId={selectedId}
        onSelect={() => {}}
        previewKind="card"
        badges={badges}
      />
    </Provider>,
  );
}

describe('CARD-13 walk2-A5: premium PriceChip reads ABOVE the strip canvas', () => {
  it('an unowned premium tile shows its price, hoisted out of the tile (above the strip)', () => {
    renderRail({ 'prem-1': { owned: false, price: 250 } });
    const price = screen.getByText('250');
    // the chip lives in the above-strip overlay, NOT inside the Pressable tile (whose paint the
    // absolute strip canvas covers) — a re-nest regresses to the hidden-cost bug.
    expect(hasPressableAncestor(price as unknown as TestNode)).toBe(false);
    // the tile still announces the price to a11y (badgeLabel unchanged)
    expect(screen.getByLabelText('Foil, premium — 250 pixels')).toBeTruthy();
  });

  it('the owned ✓ and selected PREVIEW badges ride the same overlay', () => {
    renderRail({ 'prem-1': { owned: true, price: 250 } });
    expect(hasPressableAncestor(screen.getByText('✓') as unknown as TestNode)).toBe(false);

    renderRail({ 'prem-1': { owned: false, price: 250 } }, 'prem-1');
    expect(hasPressableAncestor(screen.getByText('PREVIEW') as unknown as TestNode)).toBe(false);
  });
});
