import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, type ConcernCategory, type PrecheckResult } from '../api/client';

type CategoryChoice = ConcernCategory | 'Auto';

export function SubmitScreen(props: { onSubmitted: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryChoice, setCategoryChoice] = useState<CategoryChoice>('Auto');
  const [precheck, setPrecheck] = useState<PrecheckResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => title.trim().length >= 3 && description.trim().length >= 10, [title, description]);

  useEffect(() => {
    const handle = setTimeout(() => {
      void api
        .precheck({ title, description })
        .then(setPrecheck)
        .catch(() => setPrecheck(null));
    }, 250);

    return () => clearTimeout(handle);
  }, [title, description]);

  const suggestedCategory = precheck?.suggestedCategory ?? 'Other';
  const effectiveCategory = categoryChoice === 'Auto' ? undefined : categoryChoice;

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
            value={categoryChoice}
            onChange={(e) => setCategoryChoice(e.target.value as CategoryChoice)}
            style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #ccc' }}
          >
            <option value="Auto">Auto (suggested: {suggestedCategory})</option>
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
              await api.createConcern({
                title: title.trim(),
                description: description.trim(),
                category: effectiveCategory
              });
              setTitle('');
              setDescription('');
              setPrecheck(null);
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
        <h2 style={{ marginTop: 0 }}>Was this already answered?</h2>
        <div style={{ color: '#555', marginBottom: 8 }}>
          Checks resolved topics, HR policies, and open duplicates in real-time.
        </div>

        <Section title="Resolved topics">
          {precheck?.resolvedTopics?.length ? (
            precheck.resolvedTopics.map((s) => (
              <Item key={s.id} title={s.title} right={`${Math.round(s.score * 100)}%`} subtitle={s.state} />
            ))
          ) : (
            <Empty text="No similar resolved topics found." />
          )}
        </Section>

        <Section title="Company KB & Policies">
          {precheck?.policyExcerpts?.length ? (
            precheck.policyExcerpts.map((p, idx) => (
              <div key={idx} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <strong>{p.docTitle}</strong>
                  <span style={{ whiteSpace: 'nowrap' }}>Score {p.score}</span>
                </div>
                <div style={{ marginTop: 6, whiteSpace: 'pre-wrap', color: '#333' }}>{p.excerpt}</div>
              </div>
            ))
          ) : (
            <Empty text="No relevant policy excerpts found." />
          )}
        </Section>

        <Section title="Open topics (duplicates)">
          {precheck?.openTopics?.length ? (
            precheck.openTopics.map((s) => (
              <Item key={s.id} title={s.title} right={`${Math.round(s.score * 100)}%`} subtitle={s.state} />
            ))
          ) : (
            <Empty text="No similar open topics found." />
          )}
          {precheck?.openTopics?.length ? (
            <div style={{ marginTop: 8, color: '#555' }}>Tip: consider voting/commenting instead of creating a new topic.</div>
          ) : null}
        </Section>
      </div>
    </div>
  );
}

function Section(props: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{props.title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{props.children}</div>
    </div>
  );
}

function Item(props: { title: string; right: string; subtitle?: string }) {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <strong>{props.title}</strong>
        <span style={{ whiteSpace: 'nowrap' }}>{props.right}</span>
      </div>
      {props.subtitle ? <div style={{ fontSize: 13, color: '#666' }}>{props.subtitle}</div> : null}
    </div>
  );
}

function Empty(props: { text: string }) {
  return <div style={{ color: '#555' }}>{props.text}</div>;
}
