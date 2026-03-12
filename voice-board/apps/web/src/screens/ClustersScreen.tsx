import { useEffect, useState } from 'react';

import { api, type Cluster } from '../api/client';

export function ClustersScreen() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listClusters()
      .then(setClusters)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load clusters'));
  }, []);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Trending clusters</h2>
      {error ? <div style={{ color: 'crimson' }}>{error}</div> : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {clusters.map((c) => (
          <div key={c.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <strong>{c.title}</strong>
              <span>Votes: {c.aggregatedVoteCount}</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: '#666' }}>
              {c.concernIds.length} concerns · Window {c.windowDays} days
            </div>
            {c.themes.length ? (
              <ul style={{ marginTop: 10 }}>
                {c.themes.map((t, idx) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            ) : (
              <div style={{ marginTop: 10, color: '#555' }}>No extracted themes yet.</div>
            )}
          </div>
        ))}
        {clusters.length === 0 ? <div style={{ color: '#555' }}>No clusters yet (need 5+ similar concerns in 30 days).</div> : null}
      </div>
    </div>
  );
}
