import { useMemo, useState } from 'react';

import { ActivityScreen } from './screens/ActivityScreen';
import { ClustersScreen } from './screens/ClustersScreen';
import { CouncilScreen } from './screens/CouncilScreen';
import { FeedScreen } from './screens/FeedScreen';
import { HrAssistantScreen } from './screens/HrAssistantScreen';
import { SubmitScreen } from './screens/SubmitScreen';

type Tab = 'Feed' | 'Submit' | 'Activity' | 'Clusters' | 'HR' | 'Council';
type Role = 'employee' | 'council';

function getInitialRole(): Role {
  try {
    const v = localStorage.getItem('voiceBoardRole');
    return v === 'council' ? 'council' : 'employee';
  } catch {
    return 'employee';
  }
}

export function App() {
  const [role, setRole] = useState<Role>(getInitialRole);
  const [tab, setTab] = useState<Tab>(role === 'council' ? 'Council' : 'Feed');

  const tabs = useMemo<Tab[]>(() => {
    const base: Tab[] = ['Feed', 'Submit', 'Activity', 'Clusters', 'HR'];
    return role === 'council' ? [...base, 'Council'] : base;
  }, [role]);

  const content = useMemo(() => {
    switch (tab) {
      case 'Feed':
        return <FeedScreen />;
      case 'Submit':
        return <SubmitScreen onSubmitted={() => setTab('Feed')} />;
      case 'Activity':
        return <ActivityScreen />;
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
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Employee Council Voice Board</h1>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#444' }}>
          <span style={{ fontSize: 13 }}>Role</span>
          <select
            value={role}
            onChange={(e) => {
              const next = (e.target.value === 'council' ? 'council' : 'employee') as Role;
              setRole(next);
              try {
                localStorage.setItem('voiceBoardRole', next);
              } catch {
                // ignore
              }
              setTab(next === 'council' ? 'Council' : 'Feed');
            }}
            style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #ccc', background: 'white' }}
          >
            <option value="employee">Employee</option>
            <option value="council">Council</option>
          </select>
        </label>
      </div>
      <p style={{ marginTop: 8, color: '#444' }}>MVP: submit concerns, vote, trending clusters, and HR Q&A.</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
        {tabs.map((t) => (
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
