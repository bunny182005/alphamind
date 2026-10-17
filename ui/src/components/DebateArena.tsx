import { useState } from 'react';
import { TrendingUp, TrendingDown, Scale } from 'lucide-react';
import type { PropagateResult } from '../types';

interface Props {
  result?: PropagateResult;
  isRunning: boolean;
}

export default function DebateArena({ result, isRunning }: Props) {
  const [activeTab, setActiveTab] = useState<'bull' | 'bear' | 'judge'>('bull');

  const tabs = [
    { key: 'bull' as const,  label: 'Bull Case',    Icon: TrendingUp,  color: 'var(--emerald)' },
    { key: 'bear' as const,  label: 'Bear Case',    Icon: TrendingDown, color: 'var(--crimson)' },
    { key: 'judge' as const, label: 'Judge Verdict', Icon: Scale,       color: 'var(--amber)' },
  ];

  const contentMap = {
    bull:  result?.bull_history ?? '',
    bear:  result?.bear_history ?? '',
    judge: result?.judge_decision ?? '',
  };

  const colorMap = {
    bull:  'var(--emerald)',
    bear:  'var(--crimson)',
    judge: 'var(--amber)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-header" style={{ borderBottom: '1px solid var(--slate-800)' }}>
        <Scale size={13} color="var(--violet)" />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--slate-200)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Debate Arena
        </span>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--slate-800)' }}>
        {tabs.map(({ key, label, Icon, color }) => (
          <button
            key={key}
            id={`debate-tab-${key}`}
            onClick={() => setActiveTab(key)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              padding: '9px 6px',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === key ? color : 'transparent'}`,
              color: activeTab === key ? color : 'var(--slate-500)',
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {!result && !isRunning && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 8 }}>
            <Scale size={28} color="var(--slate-700)" />
            <span style={{ color: 'var(--slate-600)', fontSize: 12 }}>Debate will appear after analysis</span>
          </div>
        )}
        {isRunning && !contentMap[activeTab] && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[100, 80, 90, 70].map((w, i) => (
              <div key={i} className="shimmer" style={{ height: 12, width: `${w}%` }} />
            ))}
          </div>
        )}
        {contentMap[activeTab] && (
          <div
            className="report-content"
            style={{
              borderLeft: `3px solid ${colorMap[activeTab]}20`,
              paddingLeft: 16,
              color: activeTab === 'bull' ? 'rgba(0,229,153,0.85)' : activeTab === 'bear' ? 'rgba(255,59,105,0.85)' : 'var(--slate-200)',
            }}
          >
            {contentMap[activeTab]}
          </div>
        )}
      </div>
    </div>
  );
}
