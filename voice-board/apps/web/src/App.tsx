import { useMemo, useState } from 'react';

import { ClustersScreen } from './screens/ClustersScreen';
import { CouncilScreen } from './screens/CouncilScreen';
import { FeedScreen } from './screens/FeedScreen';
import { HrAssistantScreen } from './screens/HrAssistantScreen';
import { SubmitScreen } from './screens/SubmitScreen';

type Tab = 'Feed' | 'Submit' | 'Clusters' | 'HR' | 'Council';

export function App() {
  const [tab, setTab] = useState<Tab>('Feed');

  const content = useMemo(() => {
    switch (tab) {
      case 'Feed':
        return <FeedScreen />;
      case 'Submit':
        return <SubmitScreen onSubmitted={() => setTab('Feed')} />;
      case 'Clusters':
        return <ClustersScreen />;
      case 'HR':
        return <HrAssistantScreen />;
      case 'Council':
        return <CouncilScreen />;
      default:
        return null;
    }
  }, [tab]);

  return (
    <div style={{ maxWidth: 900, margin: '24px auto', fontFamily: 'system-ui, sans-serif', padding: '0 16px' }}>
      <h1 style={{ margin: 0 }}>Employee Council Voice Board</h1>
      <p style={{ marginTop: 8, color: '#444' }}>MVP: submit concerns, vote, trending clusters, and HR Q&A.</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
        {(['Feed', 'Submit', 'Clusters', 'HR', 'Council'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #ccc',
              background: tab === t ? '#eee' : 'white',
              cursor: 'pointer'
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div>{content}</div>
    </div>
  );
}
