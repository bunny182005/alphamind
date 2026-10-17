import { Activity, Zap } from 'lucide-react';

interface Props {
  ticker: string;
  date: string;
  isRunning: boolean;
  onTickerChange: (t: string) => void;
  onDateChange: (d: string) => void;
  selectedAnalysts: string[];
  onToggleAnalyst: (a: string) => void;
  onRun: () => void;
}

const PRESETS = ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'GOOGL'];
const ANALYSTS = [
  { key: 'market', label: 'Market' },
  { key: 'social', label: 'Social' },
  { key: 'news', label: 'News' },
  { key: 'fundamentals', label: 'Fundamentals' },
];

export default function Header({ ticker, date, isRunning, onTickerChange, onDateChange, selectedAnalysts, onToggleAnalyst, onRun }: Props) {
  return (
    <header className="header-bar">
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, var(--emerald) 0%, var(--cyan) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Activity size={16} color="#000" />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--slate-100)', letterSpacing: '0.1em' }}>
            APEX QUANT
          </div>
          <div style={{ fontSize: 9, color: 'var(--slate-400)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Multi-Agent Intelligence Terminal
          </div>
        </div>
      </div>

      <div className="divider" style={{ width: 1, height: 36, borderTop: 'none', borderLeft: '1px solid var(--slate-800)', margin: '0 4px' }} />

      {/* Ticker */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <label style={{ fontSize: 9, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ticker</label>
        <input
          className="input-terminal"
          style={{ width: 110 }}
          value={ticker}
          onChange={e => onTickerChange(e.target.value.toUpperCase())}
          placeholder="NVDA"
          id="ticker-input"
        />
      </div>

      {/* Presets */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {PRESETS.map(p => (
          <button key={p} className="preset-chip" onClick={() => onTickerChange(p)} id={`preset-${p}`}>{p}</button>
        ))}
      </div>

      <div className="divider" style={{ width: 1, height: 36, borderTop: 'none', borderLeft: '1px solid var(--slate-800)', margin: '0 4px' }} />

      {/* Date */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <label style={{ fontSize: 9, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Analysis Date</label>
        <input
          type="date"
          style={{
            background: 'var(--obsidian-3)',
            border: '1px solid var(--slate-700)',
            borderRadius: 6,
            color: 'var(--cyan)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            padding: '6px 10px',
            outline: 'none',
            colorScheme: 'dark',
          }}
          value={date}
          onChange={e => onDateChange(e.target.value)}
          id="date-input"
        />
      </div>

      <div className="divider" style={{ width: 1, height: 36, borderTop: 'none', borderLeft: '1px solid var(--slate-800)', margin: '0 4px' }} />

      {/* Analysts */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 9, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 2 }}>Analysts</span>
        {ANALYSTS.map(a => (
          <button
            key={a.key}
            id={`analyst-${a.key}`}
            className={`pill ${selectedAnalysts.includes(a.key) ? 'pill-active' : 'pill-inactive'}`}
            onClick={() => onToggleAnalyst(a.key)}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* Execute */}
      <button
        id="execute-btn"
        className="btn btn-primary"
        disabled={isRunning || !ticker || !date}
        onClick={onRun}
        style={{ position: 'relative', minWidth: 140 }}
      >
        {isRunning ? (
          <>
            <span className="animate-pulse-dot" style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#000', display: 'inline-block'
            }} />
            Running…
          </>
        ) : (
          <>
            <Zap size={14} />
            Execute Analysis
          </>
        )}
      </button>
    </header>
  );
}
