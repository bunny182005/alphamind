import { useState } from 'react';
import { Award, Target, X, DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { PropagateResult, Signal } from '../types';

interface Props {
  result?: PropagateResult;
  isRunning: boolean;
  ticker: string;
  onReflect: (returns: number) => Promise<void>;
}


function getSignalColor(signal: Signal): string {
  const s = signal.toLowerCase();
  if (s.includes('buy') || s.includes('overweight')) return 'var(--emerald)';
  if (s.includes('sell') || s.includes('underweight')) return 'var(--crimson)';
  return 'var(--amber)';
}

function getSignalIcon(signal: Signal) {
  const s = signal.toLowerCase();
  if (s.includes('buy') || s.includes('overweight')) return <TrendingUp size={20} />;
  if (s.includes('sell') || s.includes('underweight')) return <TrendingDown size={20} />;
  return <Minus size={20} />;
}

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 70 ? 'var(--emerald)' : pct >= 40 ? 'var(--amber)' : 'var(--crimson)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--slate-400)', fontFamily: 'var(--font-mono)' }}>
        <span>CONFIDENCE</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }} />
      </div>
    </div>
  );
}

function ReflectModal({ ticker, onClose, onSubmit }: { ticker: string; onClose: () => void; onSubmit: (r: number) => void }) {
  const [returns, setReturns] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const val = parseFloat(returns);
    if (isNaN(val)) return;
    setLoading(true);
    await onSubmit(val);
    setLoading(false);
    onClose();
  }

  return (
    <div className="modal-overlay" id="reflect-modal">
      <div className="modal-box">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DollarSign size={16} color="var(--emerald)" />
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: 'var(--slate-100)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Post-Trade Reflection
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--slate-400)', marginBottom: 16, lineHeight: 1.6 }}>
          Record the actual returns for <span style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{ticker}</span> to update
          the agent's memory log and improve future decisions.
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
            Position Returns (%)
          </label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              id="reflect-returns-input"
              type="number"
              step="0.01"
              placeholder="e.g. 4.5 or -2.1"
              value={returns}
              onChange={e => setReturns(e.target.value)}
              style={{
                flex: 1,
                background: 'var(--obsidian-3)',
                border: '1px solid var(--slate-700)',
                borderRadius: 6,
                color: parseFloat(returns) >= 0 ? 'var(--emerald)' : 'var(--crimson)',
                fontFamily: 'var(--font-mono)',
                fontSize: 18,
                fontWeight: 700,
                padding: '10px 14px',
                outline: 'none',
              }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--slate-400)' }}>%</span>
          </div>
        </div>

        {/* Quick buttons */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {[-5, -2, 0, 2, 5, 10].map(v => (
            <button key={v} onClick={() => setReturns(String(v))} style={{
              flex: 1, padding: '5px 4px', borderRadius: 5,
              background: v > 0 ? 'rgba(0,229,153,0.1)' : v < 0 ? 'rgba(255,59,105,0.1)' : 'var(--slate-800)',
              border: `1px solid ${v > 0 ? 'rgba(0,229,153,0.2)' : v < 0 ? 'rgba(255,59,105,0.2)' : 'var(--slate-700)'}`,
              color: v > 0 ? 'var(--emerald)' : v < 0 ? 'var(--crimson)' : 'var(--slate-400)',
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}>
              {v > 0 ? '+' : ''}{v}%
            </button>
          ))}
        </div>

        <button
          id="reflect-submit-btn"
          className="btn btn-primary"
          disabled={loading || !returns}
          onClick={handleSubmit}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {loading ? 'Storing…' : 'Store in Memory'}
        </button>
      </div>
    </div>
  );
}

export default function DecisionDeck({ result, isRunning, ticker, onReflect }: Props) {
  const [showReflect, setShowReflect] = useState(false);
  const [activeReport, setActiveReport] = useState<'final' | 'market' | 'news' | 'social' | 'fundamentals' | 'risk'>('final');

  const signal = (result?.signal ?? '') as Signal;
  const signalColor = getSignalColor(signal);

  const reportTabs = [
    { key: 'final' as const, label: 'Decision' },
    { key: 'market' as const, label: 'Market' },
    { key: 'news' as const, label: 'News' },
    { key: 'social' as const, label: 'Social' },
    { key: 'fundamentals' as const, label: 'Fundament.' },
    { key: 'risk' as const, label: 'Risk' },
  ];

  const reportContent: Record<typeof activeReport, string> = {
    final: result?.final_trade_decision ?? result?.investment_plan ?? '',
    market: result?.market_report ?? '',
    news: result?.news_report ?? '',
    social: result?.sentiment_report ?? '',
    fundamentals: result?.fundamentals_report ?? '',
    risk: result?.risk_judge_decision ?? '',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Section header */}
      <div className="panel-header" style={{ borderBottom: '1px solid var(--slate-800)' }}>
        <Award size={13} color="var(--emerald)" />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--slate-200)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Decision & Risk
        </span>
      </div>

      {/* Decision card */}
      {result ? (
        <div style={{ padding: 12 }}>
          <div
            className={`decision-card ${signal.toLowerCase().includes('buy') ? 'decision-buy' : signal.toLowerCase().includes('sell') ? 'decision-sell' : 'decision-hold'}`}
            style={{
              background: `linear-gradient(135deg, ${signalColor}08 0%, transparent 60%)`,
              border: `1px solid ${signalColor}20`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ color: signalColor }}>{getSignalIcon(signal)}</div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>
                  Recommendation
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 800, color: signalColor, letterSpacing: '0.08em', lineHeight: 1.2 }}>
                  {signal.toUpperCase() || 'REVIEW'}
                </div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <div style={{ fontSize: 10, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                  Asset
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--cyan)' }}>{ticker}</div>
              </div>
            </div>

            <ConfidenceMeter value={signal.includes('Strong') ? 85 : signal.toLowerCase() === 'hold' ? 50 : 70} />

            <button
              id="reflect-btn"
              className="btn btn-ghost"
              onClick={() => setShowReflect(true)}
              style={{ width: '100%', justifyContent: 'center', marginTop: 10, fontSize: 11 }}
            >
              <Target size={13} />
              Post-Trade Reflection
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: 12 }}>
          {isRunning ? (
            <div style={{ padding: 16, borderRadius: 8, border: '1px solid var(--slate-800)', background: 'var(--obsidian-3)' }}>
              <div className="shimmer" style={{ height: 18, width: '60%', marginBottom: 10 }} />
              <div className="shimmer" style={{ height: 10, width: '100%', marginBottom: 6 }} />
              <div className="shimmer" style={{ height: 10, width: '80%', marginBottom: 6 }} />
              <div className="shimmer" style={{ height: 6, width: '100%', marginTop: 10 }} />
            </div>
          ) : (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--slate-600)', borderRadius: 8, border: '1px dashed var(--slate-800)' }}>
              <Award size={28} color="var(--slate-700)" style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
              <div style={{ fontSize: 12 }}>Decision will appear after analysis</div>
            </div>
          )}
        </div>
      )}

      {/* Report tabs */}
      <div style={{ borderTop: '1px solid var(--slate-800)', borderBottom: '1px solid var(--slate-800)', display: 'flex', overflowX: 'auto' }}>
        {reportTabs.map(({ key, label }) => (
          <button
            key={key}
            id={`report-tab-${key}`}
            onClick={() => setActiveReport(key)}
            style={{
              flex: 1,
              padding: '7px 4px',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeReport === key ? 'var(--cyan)' : 'transparent'}`,
              color: activeReport === key ? 'var(--cyan)' : 'var(--slate-500)',
              fontFamily: 'var(--font-sans)',
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 150ms',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Report content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {reportContent[activeReport] ? (
          <div className="report-content">{reportContent[activeReport]}</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--slate-600)', fontSize: 11 }}>
            {isRunning ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '80%' }}>
                {[90, 70, 85, 60].map((w, i) => <div key={i} className="shimmer" style={{ height: 10, width: `${w}%` }} />)}
              </div>
            ) : (
              'No report yet'
            )}
          </div>
        )}
      </div>

      {showReflect && (
        <ReflectModal
          ticker={ticker}
          onClose={() => setShowReflect(false)}
          onSubmit={onReflect}
        />
      )}
    </div>
  );
}
