import { useEffect, useMemo, useState } from 'react';

import { api, type ConcernCategory, type SimilarConcern } from '../api/client';

export function SubmitScreen(props: { onSubmitted: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ConcernCategory>('HR');
  const [similar, setSimilar] = useState<SimilarConcern[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => title.trim().length >= 3 && description.trim().length >= 10, [title, description]);

  useEffect(() => {
    const handle = setTimeout(() => {
      void api
        .findSimilar(title, description)
        .then(setSimilar)
        .catch(() => setSimilar([]));
    }, 250);

    return () => clearTimeout(handle);
  }, [title, description]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div>
        <h2 style={{ marginTop: 0 }}>Submit a concern</h2>
        {error ? <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div> : null}

        <label style={{ display: 'block', marginBottom: 8 }}>
          <div style={{ fontSize: 13, color: '#555' }}>Title</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ccc' }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 8 }}>
          <div style={{ fontSize: 13, color: '#555' }}>Category</div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ConcernCategory)}
            style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ccc' }}
          >
            {(['HR', 'Legal', 'Benefits', 'Process', 'Other'] as ConcernCategory[]).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'block', marginBottom: 8 }}>
          <div style={{ fontSize: 13, color: '#555' }}>Description</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={8}
            style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ccc', resize: 'vertical' }}
          />
        </label>

        <button
          disabled={!canSubmit || submitting}
          onClick={async () => {
            setSubmitting(true);
            setError(null);
            try {
              await api.createConcern({ title: title.trim(), description: description.trim(), category });
              setTitle('');
              setDescription('');
              setSimilar([]);
              props.onSubmitted();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Failed to submit');
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </div>

      <div>
        <h2 style={{ marginTop: 0 }}>Similar concerns</h2>
        <div style={{ color: '#555', marginBottom: 8 }}>
          Live duplicate detection (simple cosine similarity over keywords).
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {similar.map((s) => (
            <div key={s.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <strong>{s.title}</strong>
                <span style={{ whiteSpace: 'nowrap' }}>{Math.round(s.score * 100)}%</span>
              </div>
              <div style={{ fontSize: 13, color: '#666' }}>{s.state}</div>
            </div>
          ))}
          {similar.length === 0 ? <div style={{ color: '#555' }}>No similar concerns yet.</div> : null}
        </div>
      </div>
    </div>
  );
}
