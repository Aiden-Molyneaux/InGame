import reducer, { setCollectionView } from './prefsSlice';

// The persisted prefs reducer (F20) — the Collection view-mode preference (COL-07/COL-13).
describe('prefsSlice', () => {
  it('defaults to the shelf view', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual({ collectionView: 'shelf' });
  });

  it('updates the collection view mode', () => {
    const next = reducer({ collectionView: 'shelf' }, setCollectionView('top'));
    expect(next.collectionView).toBe('top');
  });
});
