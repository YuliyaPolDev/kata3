import { useEffect, useMemo, useState } from 'react';

import { api, type Concern, type ConcernState } from '../api/client';

const states: ConcernState[] = [
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

const stateHelp: Record<ConcernState, string> = {
  Submitted: 'Just submitted; not yet opened for voting (system stage).',
  Open: 'Open for voting; initial triage required.',
  UnderReview: 'Council is reviewing; gathering details and options.',
  Escalated: 'Escalated for deeper review/leadership involvement.',
  InDiscussion: 'Actively being discussed by council; aligning on decision/action.',
  Resolved: 'Decision/action completed. Employees should see closure and references.',
  Declined: 'Declined with a reason (communicated to the submitter).',
  Merged: 'Merged into another topic; votes combined and history preserved.',
  Split: 'Split into subtopics; original links to new topics and votes redistributed.'
};

export function CouncilScreen() {
  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [agendaText, setAgendaText] = useState<string | null>(null);
  const [buildingAgenda, setBuildingAgenda] = useState(false);
  const [resolutionDraft, setResolutionDraft] = useState<string | null>(null);
  const [draftingResolution, setDraftingResolution] = useState(false);
  const [nextState, setNextState] = useState<ConcernState>('Open');
  const [note, setNote] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [splitATitle, setSplitATitle] = useState('');
  const [splitADescription, setSplitADescription] = useState('');
  const [splitBTitle, setSplitBTitle] = useState('');
  const [splitBDescription, setSplitBDescription] = useState('');

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

  const mergeTargets = useMemo(() => {
    if (!selected) return concerns;
    return concerns.filter((c) => c.id !== selected.id);
  }, [concerns, selected]);

  useEffect(() => {
    if (!selected) return;
    setNextState(selected.state);
    setNote('');
    setDeclineReason('');
    setMergeTargetId('');
    setSplitATitle('');
    setSplitADescription('');
    setSplitBTitle('');
    setSplitBDescription('');
    setResolutionDraft(null);
  }, [selectedId]);

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
                <div>
                  <strong>{c.title}</strong>
                  <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>ID: {c.id}</div>
                </div>
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
              <div>
                <strong>{selected.title}</strong>
                <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>ID: {selected.id}</div>
              </div>
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

            <div style={{ marginTop: 12, border: '1px solid #ddd', borderRadius: 8, padding: 12, background: 'white' }}>
              <strong>AI tools (council-only)</strong>
              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  disabled={buildingAgenda}
                  onClick={async () => {
                    setBuildingAgenda(true);
                    setError(null);
                    try {
                      const r = await api.buildAgenda();
                      setAgendaText(r.agenda);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to build agenda');
                    } finally {
                      setBuildingAgenda(false);
                    }
                  }}
                >
                  Build agenda
                </button>
                <button
                  disabled={draftingResolution}
                  onClick={async () => {
                    setDraftingResolution(true);
                    setError(null);
                    try {
                      const r = await api.draftResolution(selected.id, note.trim() || undefined);
                      setResolutionDraft(r.draft);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to draft resolution');
                    } finally {
                      setDraftingResolution(false);
                    }
                  }}
                >
                  Draft resolution update
                </button>
                {buildingAgenda ? <span style={{ color: '#555' }}>Building agenda…</span> : null}
                {draftingResolution ? <span style={{ color: '#555' }}>Drafting…</span> : null}
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Agenda</div>
                {agendaText ? (
                  <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 10, whiteSpace: 'pre-wrap', background: '#fafafa' }}>
                    {agendaText}
                  </div>
                ) : (
                  <div style={{ color: '#555', fontSize: 13 }}>No agenda generated.</div>
                )}
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Resolution draft</div>
                {resolutionDraft ? (
                  <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 10, whiteSpace: 'pre-wrap', background: '#fafafa' }}>
                    {resolutionDraft}
                  </div>
                ) : (
                  <div style={{ color: '#555', fontSize: 13 }}>No draft generated.</div>
                )}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>Transition</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={nextState}
                  onChange={(e) => setNextState(e.target.value as ConcernState)}
                  disabled={updating}
                  style={{ padding: 8, borderRadius: 8, border: '1px solid #ccc' }}
                >
                  {states.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <button
                  disabled={updating}
                  onClick={async () => {
                    setUpdating(true);
                    setError(null);
                    try {
                      await api.setConcernState(selected.id, nextState, note.trim() || undefined);
                      await refresh();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to update');
                    } finally {
                      setUpdating(false);
                    }
                  }}
                >
                  Apply
                </button>

                {updating ? <span style={{ color: '#555' }}>Updating…</span> : null}
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>Note / reason</div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note (recommended for transparency)"
                  rows={3}
                  style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ccc' }}
                />
              </div>

              <div style={{ marginTop: 10, color: '#555' }}>
                <strong>Current:</strong> {selected.state} — {stateHelp[selected.state]}
              </div>

              <div style={{ marginTop: 10, fontSize: 13, color: '#555' }}>
                Tip: mark as Resolved to make it appear in Smart Submission “Resolved topics”.
              </div>

              <div style={{ marginTop: 12, borderTop: '1px solid #eee', paddingTop: 12 }}>
                <strong>Outcomes</strong>

                <div style={{ marginTop: 10, border: '1px solid #ddd', borderRadius: 8, padding: 12, background: 'white' }}>
                  <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>Decline (requires reason)</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      placeholder="Reason for decline"
                      style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #ccc' }}
                    />
                    <button
                      disabled={updating || declineReason.trim().length < 3}
                      onClick={async () => {
                        setUpdating(true);
                        setError(null);
                        try {
                          await api.declineConcern(selected.id, declineReason.trim());
                          await refresh();
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to decline');
                        } finally {
                          setUpdating(false);
                        }
                      }}
                    >
                      Decline
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 10, border: '1px solid #ddd', borderRadius: 8, padding: 12, background: 'white' }}>
                  <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>Merge into topic (moves votes)</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <select
                      value={mergeTargetId}
                      onChange={(e) => setMergeTargetId(e.target.value)}
                      style={{ flex: 1, minWidth: 280, padding: 8, borderRadius: 8, border: '1px solid #ccc', background: 'white' }}
                    >
                      <option value="">Select a target topic…</option>
                      {mergeTargets.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} (ID: {t.id})
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={updating || mergeTargetId.trim().length < 3}
                      onClick={async () => {
                        setUpdating(true);
                        setError(null);
                        try {
                          await api.mergeConcern(selected.id, mergeTargetId.trim(), note.trim() || undefined);
                          await refresh();
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to merge');
                        } finally {
                          setUpdating(false);
                        }
                      }}
                    >
                      Merge
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 10, border: '1px solid #ddd', borderRadius: 8, padding: 12, background: 'white' }}>
                  <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>Split into A + B (redistributes votes)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>A title</div>
                      <input value={splitATitle} onChange={(e) => setSplitATitle(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ccc' }} />
                      <div style={{ fontSize: 12, color: '#666', margin: '8px 0 4px' }}>A description</div>
                      <textarea value={splitADescription} onChange={(e) => setSplitADescription(e.target.value)} rows={3} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ccc' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>B title</div>
                      <input value={splitBTitle} onChange={(e) => setSplitBTitle(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ccc' }} />
                      <div style={{ fontSize: 12, color: '#666', margin: '8px 0 4px' }}>B description</div>
                      <textarea value={splitBDescription} onChange={(e) => setSplitBDescription(e.target.value)} rows={3} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ccc' }} />
                    </div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <button
                      disabled={
                        updating ||
                        splitATitle.trim().length < 3 ||
                        splitADescription.trim().length < 10 ||
                        splitBTitle.trim().length < 3 ||
                        splitBDescription.trim().length < 10
                      }
                      onClick={async () => {
                        setUpdating(true);
                        setError(null);
                        try {
                          await api.splitConcern(selected.id, {
                            a: { title: splitATitle.trim(), description: splitADescription.trim() },
                            b: { title: splitBTitle.trim(), description: splitBDescription.trim() },
                            note: note.trim() || undefined
                          });
                          await refresh();
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to split');
                        } finally {
                          setUpdating(false);
                        }
                      }}
                    >
                      Split
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12, borderTop: '1px solid #eee', paddingTop: 12 }}>
                <strong>Transition history</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {(selected.lifecycle ?? []).slice(0, 15).map((e) => (
                    <div key={e.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10, background: 'white' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ fontSize: 13, color: '#555' }}>
                          {e.from} → {e.to} · by {e.by.type}
                        </div>
                        <div style={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap' }}>{new Date(e.at).toLocaleString()}</div>
                      </div>
                      {e.note ? <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{e.note}</div> : null}
                    </div>
                  ))}
                  {(selected.lifecycle ?? []).length === 0 ? <div style={{ color: '#555' }}>No history yet.</div> : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
