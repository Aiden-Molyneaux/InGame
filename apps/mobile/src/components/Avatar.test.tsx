import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { AvatarConfig } from '@ingame/shared';
import prefsReducer from '../store/prefsSlice';
import { Avatar } from './Avatar';

const store = configureStore({ reducer: { prefs: prefsReducer } });
const wrap = (ui: React.ReactElement) => <Provider store={store}>{ui}</Provider>;

// W-4 — the ONE monogram component. The null-config render must be BYTE-IDENTICAL to the historical
// default; a set config repaints the colour pair + glyph + frame.
describe('Avatar (W-4 Monogram Forge consumer)', () => {
  it('null config ⇒ the DEFAULT monogram, byte-identical whether the prop is absent or explicitly null', () => {
    const withoutProp = render(wrap(<Avatar username="Curator" />)).toJSON();
    const withNull = render(wrap(<Avatar username="Curator" avatarConfig={null} />)).toJSON();
    expect(JSON.stringify(withNull)).toEqual(JSON.stringify(withoutProp));
    // derived initials (first two alphanumerics, uppercased).
    expect(JSON.stringify(withoutProp)).toContain('CU');
  });

  it('a set config paints the colour pair + the glyph override', () => {
    const cfg: AvatarConfig = { bg: '#101018', ink: '#ffd23f', glyph: 'AM', frame: 'ring' };
    const tree = JSON.stringify(render(wrap(<Avatar username="Curator" avatarConfig={cfg} />)).toJSON());
    expect(tree).toContain('#101018'); // bg
    expect(tree).toContain('#ffd23f'); // ink
    expect(tree).toContain('AM'); // the glyph override, not the derived CU
    expect(tree).not.toContain('>CU<');
  });

  it('a config WITHOUT a glyph falls back to the derived initials', () => {
    const cfg: AvatarConfig = { bg: '#000000', ink: '#ffffff' };
    const tree = JSON.stringify(render(wrap(<Avatar username="zoe" avatarConfig={cfg} />)).toJSON());
    expect(tree).toContain('ZO');
  });

  it('avatarUrl always wins over a config (a real designed avatar)', () => {
    const cfg: AvatarConfig = { bg: '#101018', ink: '#ffd23f' };
    const tree = JSON.stringify(
      render(wrap(<Avatar username="Curator" avatarUrl="https://cdn/x.png" avatarConfig={cfg} />)).toJSON(),
    );
    expect(tree).toContain('https://cdn/x.png');
    expect(tree).not.toContain('#101018');
  });
});
