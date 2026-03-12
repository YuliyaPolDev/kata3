import { useEffect, useMemo, useState } from 'react';

import { api, type Concern } from '../api/client';

export function FeedScreen() {
  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listConcerns();
      setConcerns(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const selected = useMemo(() => concerns.find((c) => c.id === selectedId) ?? null, [concerns, selectedId]);

  if (loading) return <div>Loading…</div>;
  if (error) return <div style={{ color: 'crimson' }}>{error}</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Concerns</h2>
          <button onClick={refresh}>Refresh</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                <span style={{ whiteSpace: 'nowrap' }}>⬆ {c.voteCount}</span>
              </div>
              <div style={{ color: '#555', fontSize: 13, marginTop: 4 }}>
                {c.category} · {c.state}
              </div>
            </button>
          ))}
          {concerns.length === 0 ? <div style={{ color: '#555' }}>No concerns yet.</div> : null}
        </div>
      </div>

      <div>
        <h2 style={{ margin: 0 }}>Details</h2>
        {!selected ? (
          <div style={{ color: '#555', marginTop: 8 }}>Select a concern from the list.</div>
        ) : (
          <ConcernDetail concern={selected} onUpvote={async () => {
            await api.upvote(selected.id);
            await refresh();
          }} onCommentAdded={refresh} />
        )}
      </div>
    </div>
  );
}

function ConcernDetail(props: { concern: Concern; onUpvote: () => Promise<void>; onCommentAdded: () => Promise<void> | void }) {
  const { concern } = props;
  const [comments, setComments] = useState<{ id: string; text: string; createdAt: string }[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    let mounted = true;
    api
      .listComments(concern.id)
      .then((c) => {
        if (mounted) setComments(c);
      })
      .catch(() => {
        if (mounted) setComments([]);
      });
    return () => {
      mounted = false;
    };
  }, [concern.id]);

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <strong>{concern.title}</strong>
        <button onClick={() => void props.onUpvote()}>Upvote</button>
      </div>
      <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{concern.description}</div>

      <div style={{ marginTop: 12, color: '#555', fontSize: 13 }}>
        Category: {concern.category} · State: {concern.state}
      </div>

      <div style={{ marginTop: 16 }}>
        <strong>Comments</strong>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {comments.map((c) => (
            <div key={c.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 8 }}>
              <div style={{ fontSize: 12, color: '#666' }}>{new Date(c.createdAt).toLocaleString()}</div>
              <div>{c.text}</div>
            </div>
          ))}
          {comments.length === 0 ? <div style={{ color: '#555' }}>No comments yet.</div> : null}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment"
            style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #ccc' }}
          />
          <button
            onClick={async () => {
              const trimmed = text.trim();
              if (!trimmed) return;
              await api.addComment(concern.id, trimmed);
              setText('');
              const updated = await api.listComments(concern.id);
              setComments(updated);
              await props.onCommentAdded();
            }}
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
}
