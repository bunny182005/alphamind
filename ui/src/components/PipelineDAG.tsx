import { useEffect, useRef, useState } from 'react';
import {
  BarChart2, Globe, Mic, BookOpen,
  Swords, Shield, TrendingUp, AlertTriangle,
  CheckCircle2, Loader2, XCircle, Scale,
} from 'lucide-react';
import type { NodeStatus } from '../types';

interface Props {
  nodeStatus: Record<string, NodeStatus>;
  isRunning: boolean;
  runPhase: 'idle' | 'running' | 'done' | 'error';
}

interface DagNodeDef {
  id: string;
  label: string;
  sublabel: string;
  Icon: React.FC<{ size?: number; color?: string; style?: React.CSSProperties }>;
  group: 'analyst' | 'debate' | 'risk' | 'decision';
}

const NODES: DagNodeDef[] = [
  { id: 'analyst-market',       label: 'Market Analyst',     sublabel: 'Technical + Price',    Icon: BarChart2,    group: 'analyst'  },
  { id: 'analyst-social',       label: 'Social Analyst',     sublabel: 'Sentiment & Social',   Icon: Mic,          group: 'analyst'  },
  { id: 'analyst-news',         label: 'News Analyst',       sublabel: 'News & Macro',         Icon: Globe,        group: 'analyst'  },
  { id: 'analyst-fundamentals', label: 'Fundamentals',       sublabel: 'Balance Sheet & P&L',  Icon: BookOpen,     group: 'analyst'  },
  { id: 'debate-bull',          label: 'Bull Researcher',    sublabel: 'Long thesis',          Icon: TrendingUp,   group: 'debate'   },
  { id: 'debate-bear',          label: 'Bear Researcher',    sublabel: 'Short thesis',         Icon: Swords,       group: 'debate'   },
  { id: 'debate-judge',         label: 'Debate Judge',       sublabel: 'Verdict synthesis',    Icon: Scale,        group: 'debate'   },
  { id: 'risk-assess',          label: 'Risk Assessment',    sublabel: 'Position sizing',      Icon: Shield,       group: 'risk'     },
  { id: 'decision',             label: 'Portfolio Decision', sublabel: 'Final recommendation', Icon: AlertTriangle, group: 'decision' },
];

const TOTAL = NODES.length;

// Group accent colors (CSS vars)
const GROUP_COLOR: Record<string, string> = {
  analyst:  'var(--cyan)',
  debate:   'var(--violet)',
  risk:     'var(--amber)',
  decision: 'var(--emerald)',
};

const GROUP_GLOW: Record<string, string> = {
  analyst:  'rgba(56,189,248,0.18)',
  debate:   'rgba(139,92,246,0.18)',
  risk:     'rgba(245,158,11,0.18)',
  decision: 'rgba(0,229,153,0.18)',
};

const GROUP_BORDER: Record<string, string> = {
  analyst:  'rgba(56,189,248,0.45)',
  debate:   'rgba(139,92,246,0.45)',
  risk:     'rgba(245,158,11,0.45)',
  decision: 'rgba(0,229,153,0.45)',
};

// Layer section labels
const SECTION_BEFORE: Record<string, string> = {
  'analyst-market': 'ANALYST LAYER',
  'debate-bull':    'DEBATE ARENA',
  'risk-assess':    'RISK LAYER',
  'decision':       'DECISION',
};

function formatElapsed(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}s`;
}

// Animated radar-ring status dot
function StatusRing({ status, group }: { status: NodeStatus; group: string }) {
  const color = GROUP_COLOR[group];
  if (status === 'thinking') {
    return (
      <span className="dag-ring-wrap">
        <span className="dag-ring-sonar" style={{ borderColor: color }} />
        <span className="dag-ring-core" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      </span>
    );
  }
  if (status === 'done') {
    return <CheckCircle2 size={16} color="var(--emerald)" style={{ filter: 'drop-shadow(0 0 4px #00e599)' }} />;
  }
  if (status === 'error') {
    return <XCircle size={16} color="var(--crimson)" />;
  }
  // idle
  return <span className="dag-ring-idle" />;
}

// Animated laser connector between nodes
function LaserConnector({ fromStatus }: { fromStatus: NodeStatus }) {
  if (fromStatus === 'thinking') {
    return (
      <div className="dag-laser-wrap">
        <div className="dag-laser-track" />
        <div className="dag-laser-packet" />
      </div>
    );
  }
  if (fromStatus === 'done') {
    return <div className="dag-laser-done" />;
  }
  return <div className="dag-laser-idle" />;
}

export default function PipelineDAG({ nodeStatus, isRunning, runPhase }: Props) {
  // elapsed is only ever updated from inside the setInterval callback,
  // never synchronously in the effect body — this is the pattern React
  // recommends for syncing with an external clock system.
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // startTime lives in a ref so we can read it inside the interval callback
  // without re-creating the closure on every render.
  const startTimeRef = useRef<number>(0);

  // Count done nodes
  const doneCount = NODES.filter(n => nodeStatus[n.id] === 'done').length;
  const thinkingIdx = NODES.findIndex(n => nodeStatus[n.id] === 'thinking');
  const currentStep = thinkingIdx >= 0 ? thinkingIdx + 1 : doneCount;
  const pct = Math.round((doneCount / TOTAL) * 100);

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now();
      // All setState calls live inside the interval callback, not in the
      // synchronous effect body — satisfying the set-state-in-effect lint rule.
      timerRef.current = setInterval(() =>
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      , 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning]);

  function getStatus(id: string): NodeStatus {
    return nodeStatus[id] ?? 'idle';
  }

  return (
    <div className="dag-sidebar">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="dag-header">
        <div className="dag-header-top">
          <div className="dag-header-accent" />
          <span className="dag-header-title">Agent Pipeline</span>
          {isRunning && (
            <span className="dag-live-pill">
              <span className="dag-live-dot" />
              LIVE
            </span>
          )}
        </div>

        {/* Progress metrics */}
        <div className="dag-progress-section">
          <div className="dag-progress-track">
            <div
              className="dag-progress-fill"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="dag-progress-meta">
            <span className="dag-step-counter">
              STEP {currentStep} OF {TOTAL} ({pct}%)
            </span>
            {isRunning && (
              <span className="dag-elapsed">
                ⏱ {formatElapsed(elapsed)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Node list ──────────────────────────────────── */}
      <div className="dag-node-list">
        {NODES.map((node, i) => {
          const status = getStatus(node.id);
          const color   = GROUP_COLOR[node.group];
          const glow    = GROUP_GLOW[node.group];
          const border  = GROUP_BORDER[node.group];
          const section = SECTION_BEFORE[node.id];
          const prevStatus = i > 0 ? getStatus(NODES[i - 1].id) : null;

          return (
            <div key={node.id}>
              {/* Section label */}
              {section && (
                <div className="dag-section-label" style={{ color }}>
                  {section}
                </div>
              )}

              {/* Laser connector from previous node */}
              {i > 0 && prevStatus !== null && !section && (
                <LaserConnector fromStatus={prevStatus} />
              )}
              {i > 0 && section && prevStatus !== null && (
                <LaserConnector fromStatus={prevStatus} />
              )}

              {/* Node card */}
              <div
                id={`dag-node-${node.id}`}
                className={[
                  'dag-card',
                  status === 'thinking' ? 'dag-card-thinking' : '',
                  status === 'done'     ? 'dag-card-done'     : '',
                  status === 'error'    ? 'dag-card-error'    : '',
                  // Extra completion glow on the decision node when the whole run is done
                  node.id === 'decision' && runPhase === 'done' ? 'dag-card-complete' : '',
                ].join(' ')}
                style={
                  status === 'thinking' ? {
                    borderColor: border,
                    background: glow,
                    boxShadow: `0 0 20px ${glow}, 0 2px 8px rgba(0,0,0,0.4)`,
                  } : node.id === 'decision' && runPhase === 'done' ? {
                    borderColor: 'rgba(0,229,153,0.55)',
                    background: 'rgba(0,229,153,0.10)',
                    boxShadow: '0 0 28px rgba(0,229,153,0.25), 0 2px 8px rgba(0,0,0,0.4)',
                    transition: 'all 0.6s ease',
                  } : status === 'done' ? {
                    borderColor: 'rgba(0,229,153,0.25)',
                    background: 'rgba(0,229,153,0.04)',
                  } : {}
                }
              >
                {/* Shimmer beam (only on thinking) */}
                {status === 'thinking' && (
                  <div className="dag-shimmer-beam" style={{
                    background: `linear-gradient(90deg, transparent 0%, ${color}22 40%, ${color}55 50%, ${color}22 60%, transparent 100%)`,
                  }} />
                )}

                {/* Status ring */}
                <StatusRing status={status} group={node.group} />

                {/* Icon */}
                <node.Icon
                  size={14}
                  color={
                    status === 'thinking' ? color
                    : status === 'done'   ? 'var(--emerald)'
                    : 'var(--slate-500)'
                  }
                />

                {/* Labels */}
                <div className="dag-card-labels">
                  <div
                    className="dag-card-name"
                    style={{
                      color: status === 'idle' ? 'var(--slate-400)' : 'var(--slate-100)',
                      fontWeight: status === 'thinking' ? 700 : 600,
                    }}
                  >
                    {node.label}
                  </div>
                  <div className="dag-card-sub">{node.sublabel}</div>
                </div>

                {/* Right badge */}
                {status === 'thinking' && (
                  <div className="dag-running-badge" style={{ color }}>
                    <Loader2 size={11} style={{ animation: 'dag-spin 0.6s linear infinite', flexShrink: 0 }} />
                    <span>RUNNING</span>
                  </div>
                )}
                {status === 'done' && (
                  <div className="dag-done-badge">DONE</div>
                )}
                {status === 'error' && (
                  <div className="dag-error-badge">ERR</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
