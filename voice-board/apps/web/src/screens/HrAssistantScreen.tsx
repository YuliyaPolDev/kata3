import { useState } from 'react';

import { api } from '../api/client';

export function HrAssistantScreen() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<Array<{ docTitle: string; excerpt: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>HR Assistant (RAG)</h2>
      <div style={{ color: '#555', marginBottom: 10 }}>
        Retrieves relevant policy excerpts from local markdown files, then optionally uses the LLM if `OPENAI_API_KEY` is set.
      </div>

      {error ? <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div> : null}

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a policy question"
          style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #ccc' }}
        />
        <button
          disabled={question.trim().length < 3 || loading}
          onClick={async () => {
            setLoading(true);
            setError(null);
            setAnswer(null);
            setSources([]);
            try {
              const res = await api.askHr(question.trim());
              setAnswer(res.answer);
              setSources(res.sources);
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Failed to ask HR');
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? 'Asking…' : 'Ask'}
        </button>
      </div>

      {answer ? (
        <div style={{ marginTop: 16 }}>
          <strong>Answer</strong>
          <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{answer}</div>
        </div>
      ) : null}

      {sources.length ? (
        <div style={{ marginTop: 16 }}>
          <strong>Sources</strong>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            {sources.map((s, idx) => (
              <div key={idx} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 13, color: '#666' }}>{s.docTitle}</div>
                <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{s.excerpt}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
