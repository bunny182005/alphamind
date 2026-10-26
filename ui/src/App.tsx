import { useState } from 'react';
import './index.css';
import Header from './components/Header';
import PipelineDAG from './components/PipelineDAG';
import LogStream from './components/LogStream';
import DebateArena from './components/DebateArena';
import DecisionDeck from './components/DecisionDeck';
import { useApexStream } from './hooks/useApexStream';
import type { AnalystKey } from './types';

const DEFAULT_DATE = new Date().toISOString().split('T')[0];

export default function App() {
  const [ticker, setTicker] = useState('NVDA');
  const [date, setDate] = useState(DEFAULT_DATE);
  const [selectedAnalysts, setSelectedAnalysts] = useState<AnalystKey[]>(['market', 'social', 'news', 'fundamentals']);

  const { logs, nodeStatus, runState, run, postReflect } = useApexStream();

  function toggleAnalyst(a: string) {
    const key = a as AnalystKey;
    setSelectedAnalysts(prev =>
      prev.includes(key)
        ? prev.length > 1 ? prev.filter(x => x !== key) : prev
        : [...prev, key]
    );
  }

  async function handleRun() {
    if (!ticker || !date) return;
    await run(ticker, date, selectedAnalysts);
  }

  async function handleReflect(returns: number) {
    await postReflect(ticker, returns);
  }

  const isRunning = runState.phase === 'running';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header
        ticker={ticker}
        date={date}
        isRunning={isRunning}
        onTickerChange={setTicker}
        onDateChange={setDate}
        selectedAnalysts={selectedAnalysts}
        onToggleAnalyst={toggleAnalyst}
        onRun={handleRun}
      />

      {/* Error banner */}
      {runState.phase === 'error' && (
        <div style={{
          background: 'rgba(255,59,105,0.1)',
          border: '1px solid rgba(255,59,105,0.3)',
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 12,
          color: 'var(--crimson)',
          fontFamily: 'var(--font-mono)',
        }}>
          <span style={{ fontWeight: 700 }}>FATAL ERROR:</span>
          <span>{runState.error?.slice(0, 200)}</span>
        </div>
      )}

      {/* Main grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr 1fr 320px',
          flex: 1,
          overflow: 'hidden',
          gap: 1,
          background: 'var(--slate-800)',
        }}
      >
        {/* Col 1: Pipeline DAG */}
        <div style={{ background: 'var(--obsidian-2)', overflowY: 'auto' }}>
          <PipelineDAG nodeStatus={nodeStatus} isRunning={isRunning} runPhase={runState.phase} />
        </div>

        {/* Col 2: Log stream */}
        <div style={{ background: 'var(--obsidian)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <LogStream logs={logs} isRunning={isRunning} />
        </div>

        {/* Col 3: Debate arena */}
        <div style={{ background: 'var(--obsidian-2)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <DebateArena result={runState.result} isRunning={isRunning} />
        </div>

        {/* Col 4: Decision deck */}
        <div style={{ background: 'var(--obsidian-2)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <DecisionDeck
            result={runState.result}
            isRunning={isRunning}
            ticker={ticker}
            onReflect={handleReflect}
          />
        </div>
      </div>

      {/* Status bar */}
      <div style={{
        height: 24,
        background: 'var(--obsidian-3)',
        borderTop: '1px solid var(--slate-800)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 20,
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
        color: 'var(--slate-500)',
      }}>
        <span style={{ color: 'var(--emerald)' }}>● ALPHAMIND v1.0</span>
        <span>CONNECTED: localhost:8000</span>
        <span>{ticker} | {date}</span>
        <span style={{ color: isRunning ? 'var(--cyan)' : runState.phase === 'done' ? 'var(--emerald)' : 'var(--slate-600)' }}>
          {isRunning ? '⟳ RUNNING' : runState.phase === 'done' ? '✓ COMPLETE' : '◌ IDLE'}
        </span>
        {runState.result && (
          <span style={{ color: 'var(--amber)', marginLeft: 'auto' }}>
            SIGNAL: {runState.result.signal.toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}
