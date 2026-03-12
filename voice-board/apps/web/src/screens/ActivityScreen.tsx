import { useEffect, useMemo, useState } from 'react';

import { api, type ConcernCategory, type ConcernState } from '../api/client';

type ActivityItem = {
  id: string;
  concernId: string;
  concernTitle: string;
  category: ConcernCategory;
  from: ConcernState;
  to: ConcernState;
  at: string;
  by: { type: 'council' | 'system' };
  note?: string;
};

const categories: Array<ConcernCategory | 'All'> = ['All', 'HR', 'Legal', 'Benefits', 'Process', 'Other'];
const states: Array<ConcernState | 'All'> = [
  'All',
  'Submitted',
  'Open',
  'UnderReview',
  'Escalated',
  'InDiscussion',
  'Resolved',
  'Declined',
  'Merged',
  'Split'
];

function toIsoDateBoundary(date: string, kind: 'start' | 'end'): string {
  // Input is YYYY-MM-DD; convert to inclusive ISO bound.
  if (!date) return '';
  return kind === 'start' ? `${date}T00:00:00.000Z` : `${date}T23:59:59.999Z`;
}

export function ActivityScreen() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<ConcernCategory | 'All'>('All');
  const [state, setState] = useState<ConcernState | 'All'>('All');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const query = useMemo(() => {
    const qs = new URLSearchParams();
    if (category !== 'All') qs.set('category', category);
    if (state !== 'All') qs.set('state', state);
    if (from) qs.set('from', toIsoDateBoundary(from, 'start'));
    if (to) qs.set('to', toIsoDateBoundary(to, 'end'));
    return qs.toString();
  }, [category, state, from, to]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listActivity(query);
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Activity feed</h2>
      <div style={{ color: '#555', marginBottom: 10 }}>
        Status changes and outcomes (replaces the bi-weekly tracker).
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, alignItems: 'end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 13, color: '#444' }}>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as any)} style={{ padding: 8, borderRadius: 8, border: '1px solid #ccc' }}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 13, color: '#444' }}>Status</span>
          <select value={state} onChange={(e) => setState(e.target.value as any)} style={{ padding: 8, borderRadius: 8, border: '1px solid #ccc' }}>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 13, color: '#444' }}>From</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #ccc' }} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 13, color: '#444' }}>To</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #ccc' }} />
        </label>
      </div>

      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={refresh} disabled={loading}>
          Refresh
        </button>
        <div style={{ color: '#555', fontSize: 13 }}>{loading ? 'Loading…' : `${items.length} item(s)`}</div>
      </div>

      {error ? <div style={{ color: 'crimson', marginTop: 8 }}>{error}</div> : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
        {items.map((it) => (
          <div key={it.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <strong>{it.concernTitle}</strong>
                <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>ID: {it.concernId}</div>
              </div>
              <span style={{ color: '#555', whiteSpace: 'nowrap' }}>{new Date(it.at).toLocaleString()}</span>
            </div>
            <div style={{ color: '#555', fontSize: 13, marginTop: 4 }}>
              {it.category} · {it.from} → {it.to} · by {it.by.type}
            </div>
            {it.note ? <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{it.note}</div> : null}
          </div>
        ))}
        {!loading && items.length === 0 ? <div style={{ color: '#555' }}>No activity found for the selected filters.</div> : null}
      </div>
    </div>
  );
}
