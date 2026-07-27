import { useCallback, useEffect, useState } from 'react';
import type { AdminCosmeticCatalogItem, AdminSpotlightResponse } from '@ingame/shared';
import { fetchCosmeticCatalog, fetchSpotlight, putSpotlight } from '../api/client';
import { describeError } from '../lib/errors';
import { Banner } from '../components/Banner';

// SPOTLIGHT — the curation editor (GET/PUT /admin/spotlight + GET /admin/cosmetics/catalog, Admin IV).
// This is the literal ask that started P7: change the store's lead shelf without a redeploy.
//
// NO AUTOSAVE, on purpose. This is merchandising: the draft lives in component state and only a
// deliberate SAVE writes (a PUT that REPLACES the list and writes the `spotlight.update` audit row).
// Reorder is up/down keys rather than drag — four to eight items, keyboard-operable, and no dnd
// dependency for a list this size.
//
// THE EMPTY SAVE is a real, legitimate choice, not a mistake to block: the server accepts an empty
// list and the newest-N fallback keeps the shelf full, so emptying means "auto-fill". The console
// WARNS (an explicit confirm that names the fallback), the server permits — the ruled posture.

const SOURCE_COPY: Record<AdminSpotlightResponse['source'], string> = {
  curated: 'CURATED — the list below is stored in the database and is what the store renders.',
  seed: 'SEED — nothing has been curated yet, so the SPOTLIGHT_IDS config seed is live. Saving here takes over.',
  fallback:
    'FALLBACK — nothing curated resolves against the premium catalog, so the store is auto-filling with the newest premium entries.',
};

export function SpotlightScreen() {
  const [posture, setPosture] = useState<AdminSpotlightResponse | null>(null);
  const [catalog, setCatalog] = useState<AdminCosmeticCatalogItem[]>([]);
  const [draft, setDraft] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [current, picker] = await Promise.all([fetchSpotlight(), fetchCosmeticCatalog()]);
      setPosture(current);
      setCatalog(picker.items);
      setDraft(current.ids);
    } catch (err) {
      setError(describeError(err, 4));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = posture !== null && (draft.length !== posture.ids.length || draft.some((id, i) => posture.ids[i] !== id));

  function entryFor(id: string): AdminCosmeticCatalogItem | undefined {
    return catalog.find((c) => c.id === id);
  }

  function move(index: number, delta: number): void {
    const target = index + delta;
    if (target < 0 || target >= draft.length) return;
    const next = [...draft];
    const a = next[index];
    const b = next[target];
    if (a === undefined || b === undefined) return;
    next[index] = b;
    next[target] = a;
    setDraft(next);
    setFlash(null);
  }

  function add(id: string): void {
    if (draft.includes(id)) return;
    setDraft([...draft, id]);
    setFlash(null);
  }

  function remove(id: string): void {
    setDraft(draft.filter((d) => d !== id));
    setFlash(null);
  }

  async function save(): Promise<void> {
    setSaving(true);
    setSaveError(null);
    setFlash(null);
    try {
      const updated = await putSpotlight(draft);
      setPosture(updated);
      setDraft(updated.ids);
      setConfirmEmpty(false);
      setFlash(
        updated.source === 'fallback'
          ? 'Saved. The curated list is empty, so the store auto-fills with the newest premium entries.'
          : `Saved — ${updated.ids.length} cosmetic${updated.ids.length === 1 ? '' : 's'} in the Spotlight.`,
      );
      // The picker's `spotlighted` flags are now stale — refresh them from the server.
      try {
        const picker = await fetchCosmeticCatalog();
        setCatalog(picker.items);
      } catch {
        /* the save already landed; a stale flag column is not worth an error banner */
      }
    } catch (err) {
      setSaveError(describeError(err, 4));
    } finally {
      setSaving(false);
    }
  }

  function attemptSave(): void {
    if (draft.length === 0) {
      setConfirmEmpty(true);
      return;
    }
    void save();
  }

  const available = catalog.filter((c) => !draft.includes(c.id));

  return (
    <>
      <div className="page-head">
        <h1>Ops · Spotlight</h1>
        <div className="row-gap">
          {dirty && <span className="badge dirty">Unsaved</span>}
          <button type="button" className="btn" onClick={() => void load()} disabled={loading || saving}>
            Revert
          </button>
          <button type="button" className="btn primary" onClick={attemptSave} disabled={!dirty || saving || loading}>
            {saving ? 'Saving…' : 'Save Spotlight'}
          </button>
        </div>
      </div>
      <p className="page-sub">
        The premium shelf the store leads with. Order is display order. Nothing is written until you
        press Save; the write is audited.
      </p>

      {error && <Banner kind="error">{error}</Banner>}
      {saveError && <Banner kind="error">{saveError}</Banner>}
      {flash && <Banner kind="ok">{flash}</Banner>}

      {posture && (
        <div className="panel" style={{ marginBottom: 14 }}>
          <span className={`badge ${posture.source}`}>{posture.source}</span>{' '}
          <span>{SOURCE_COPY[posture.source]}</span>
          {posture.source === 'fallback' && (
            <div className="note" style={{ marginTop: 6 }}>
              Auto-fill shows the newest {posture.fallbackCount}: {posture.resolvedIds.join(', ') || '—'}
            </div>
          )}
        </div>
      )}

      {loading && !posture && <p className="note">Loading…</p>}

      {posture && (
        <div className="two-col">
          <section>
            <h3 style={{ marginBottom: 8 }}>Spotlight ({draft.length})</h3>
            <div className="panel" style={{ padding: 0 }}>
              {draft.length === 0 ? (
                <p className="empty">
                  Empty. Saving an empty list is allowed — the store falls back to the newest{' '}
                  {posture.fallbackCount} premium entries.
                </p>
              ) : (
                <ul className="list">
                  {draft.map((id, index) => {
                    const entry = entryFor(id);
                    return (
                      <li key={id}>
                        <span className="idx">{index + 1}</span>
                        <span className="name">
                          {entry?.name ?? id}
                          <small className="mono">
                            {id}
                            {entry ? ` · ${entry.type} · ${entry.tier}` : ' · not in the premium catalog'}
                          </small>
                        </span>
                        {entry && <span className="spend">{entry.price}</span>}
                        <button
                          type="button"
                          className="btn mini"
                          aria-label={`Move ${entry?.name ?? id} up`}
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="btn mini"
                          aria-label={`Move ${entry?.name ?? id} down`}
                          disabled={index === draft.length - 1}
                          onClick={() => move(index, 1)}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="btn mini"
                          aria-label={`Remove ${entry?.name ?? id}`}
                          onClick={() => remove(id)}
                        >
                          Remove
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <section>
            <h3 style={{ marginBottom: 8 }}>Premium catalog ({available.length} available)</h3>
            <div className="panel" style={{ padding: 0 }}>
              {available.length === 0 ? (
                <p className="empty">Every premium cosmetic is already in the Spotlight.</p>
              ) : (
                <ul className="list">
                  {available.map((item) => (
                    <li key={item.id}>
                      <span className="name">
                        {item.name}
                        <small className="mono">
                          {item.id} · {item.type} · {item.tier}
                        </small>
                      </span>
                      <span className="spend">{item.price}</span>
                      <button
                        type="button"
                        className="btn mini"
                        aria-label={`Add ${item.name}`}
                        onClick={() => add(item.id)}
                      >
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}

      {confirmEmpty && posture && (
        <div className="scrim" role="dialog" aria-modal="true" aria-label="Save an empty Spotlight?">
          <div className="dialog">
            <h2>Save an empty Spotlight?</h2>
            <div className="warn">
              You are clearing the curated list. The store will not go blank — it auto-fills with the
              newest {posture.fallbackCount} premium cosmetics until you curate again.
            </div>
            <p style={{ margin: 0 }}>Save anyway?</p>
            <div className="actions">
              <button type="button" className="btn" onClick={() => setConfirmEmpty(false)} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="btn primary" onClick={() => void save()} disabled={saving}>
                {saving ? 'Saving…' : 'Save empty list'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
