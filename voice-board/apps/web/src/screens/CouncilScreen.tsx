import { useEffect, useMemo, useState } from 'react';

import { api, type Concern, type ConcernState } from '../api/client';

const states: ConcernState[] = ['Open', 'InDiscussion', 'Planned', 'Resolved'];

const stateHelp: Record<ConcernState, string> = {
  Open: 'Newly submitted. Needs triage and initial discussion.',
  InDiscussion: 'Actively being discussed by council; gathering context and options.',
  Planned: 'Resolution path is agreed; work is planned/in progress.',
  Resolved: 'Decision/action completed. Employees should see closure and references.'
};

export function CouncilScreen() {
  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listConcerns();
      setConcerns(data);
      if (!selectedId && data.length) setSelectedId(data[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(() => concerns.find((c) => c.id === selectedId) ?? null, [concerns, selectedId]);

  if (loading) return <div>Loading…</div>;
  if (error) return <div style={{ color: 'crimson' }}>{error}</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div>
        <h2 style={{ marginTop: 0 }}>Council workspace</h2>
        <div style={{ color: '#555', marginBottom: 10 }}>
          Minimal lifecycle tooling. Use this to move concerns toward resolution.
        </div>

        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 10, background: 'white' }}>
          <strong>Ticket states</strong>
          <ul style={{ marginTop: 8 }}>
            {states.map((s) => (
              <li key={s}>
                <strong>{s}:</strong> {stateHelp[s]}
              </li>
            ))}
          </ul>
        </div>
        <button onClick={refresh}>Refresh</button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
          {concerns.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              style={{
                textAlign: 'left',
                padding: 12,
                borderRadius: 8,
                border: selectedId === c.id ? '2px solid #555' : '1px solid #ccc',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <strong>{c.title}</strong>
                <span style={{ whiteSpace: 'nowrap' }}>{c.state}</span>
              </div>
              <div style={{ color: '#555', fontSize: 13, marginTop: 4 }}>
                {c.category} · ⬆ {c.voteCount} · Priority {c.ai.priorityScore ?? 0}
              </div>
            </button>
          ))}
          {concerns.length === 0 ? <div style={{ color: '#555' }}>No concerns yet.</div> : null}
        </div>
      </div>

      <div>
        <h2 style={{ marginTop: 0 }}>Lifecycle</h2>
        {!selected ? (
          <div style={{ color: '#555' }}>Select a concern.</div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <strong>{selected.title}</strong>
              <span style={{ color: '#555' }}>⬆ {selected.voteCount}</span>
            </div>

            <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{selected.description}</div>

            <div style={{ marginTop: 12, border: '1px solid #ddd', borderRadius: 8, padding: 12, background: 'white' }}>
              <strong>AI signals (council-only)</strong>
              <div style={{ color: '#555', fontSize: 13, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div>
                  <strong>Priority:</strong> {selected.ai?.priorityScore ?? '—'}
                </div>
                <div>
                  <strong>Tone:</strong> {selected.ai?.tone ?? '—'}
                </div>
                <div>
                  <strong>Urgency:</strong> {selected.ai?.urgency ?? '—'}
                </div>
                <div>
                  <strong>Sentiment:</strong>{' '}
                  {typeof selected.ai?.sentiment === 'number' ? selected.ai.sentiment.toFixed(2) : '—'}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>Set state</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  value={selected.state}
                  onChange={async (e) => {
                    const state = e.target.value as ConcernState;
                    setUpdating(true);
                    setError(null);
                    try {
                      await api.setConcernState(selected.id, state);
                      await refresh();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to update');
                    } finally {
                      setUpdating(false);
                    }
                  }}
                  disabled={updating}
                  style={{ padding: 8, borderRadius: 8, border: '1px solid #ccc' }}
                >
                  {states.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                {updating ? <span style={{ color: '#555' }}>Updating…</span> : null}
              </div>

              <div style={{ marginTop: 10, color: '#555' }}>
                <strong>Current:</strong> {selected.state} — {stateHelp[selected.state]}
              </div>

              <div style={{ marginTop: 10, fontSize: 13, color: '#555' }}>
                Tip: mark as Resolved to make it appear in Smart Submission “Resolved topics”.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
