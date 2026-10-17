import { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';
import type { LogEntry } from '../types';

interface Props {
  logs: LogEntry[];
  isRunning: boolean;
}

const TYPE_CONFIG: Record<string, { tag: string; cls: string }> = {
  token:       { tag: 'TKN', cls: 'log-tag-token' },
  tool_start:  { tag: 'TOOL', cls: 'log-tag-tool' },
  tool_end:    { tag: 'TOOL', cls: 'log-tag-tool' },
  status:      { tag: 'SYS',  cls: 'log-tag-status' },
  error:       { tag: 'ERR',  cls: 'log-tag-error' },
  chain_start: { tag: 'CHN',  cls: 'log-tag-chain' },
  agent_finish:{ tag: 'FIN',  cls: 'log-tag-finish' },
  llm_end:     { tag: 'LLM',  cls: 'log-tag-status' },
};

export default function LogStream({ logs, isRunning }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="panel-header" style={{ borderBottom: '1px solid var(--slate-800)' }}>
        <Terminal size={13} color="var(--emerald)" />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--slate-200)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Live Agent Stream
        </span>
        {isRunning && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <div className="animate-pulse-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--emerald)' }} />
            <span style={{ fontSize: 10, color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>{logs.length} events</span>
          </div>
        )}
      </div>

      <div className="log-terminal" style={{ flex: 1, minHeight: 0, maxHeight: '100%' }} id="log-stream">
        {logs.length === 0 && (
          <div style={{ color: 'var(--slate-600)', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '20px 0', textAlign: 'center' }}>
            <div style={{ marginBottom: 8 }}>{'>'} Awaiting execution…</div>
            <div style={{ fontSize: 10, color: 'var(--slate-700)' }}>Agent thoughts will stream here in real-time</div>
          </div>
        )}
        {logs.map(log => {
          const cfg = TYPE_CONFIG[log.type] ?? { tag: 'MSG', cls: 'log-tag-status' };
          return (
            <div key={log.id} className="log-line">
              <span className="log-time">{log.time}</span>
              <span className={`log-tag ${cfg.cls}`}>[{cfg.tag}]</span>
              {log.agent && (
                <span style={{ color: 'var(--violet)', fontSize: 11, flexShrink: 0 }}>{log.agent.replace(/_/g, ' ')}</span>
              )}
              <span className="log-content">{log.content}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Cursor blink when running */}
      {isRunning && (
        <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid var(--slate-800)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--emerald)' }}>{'>'}</span>
          <span style={{
            display: 'inline-block', width: 8, height: 14,
            background: 'var(--emerald)',
            animation: 'blink 1s step-end infinite',
          }} />
        </div>
      )}
    </div>
  );
}
