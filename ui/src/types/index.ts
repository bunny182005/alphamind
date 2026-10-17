export type NodeStatus = 'idle' | 'thinking' | 'done' | 'error';

export interface AgentNode {
  id: string;
  label: string;
  icon: string;
  status: NodeStatus;
  group: 'analyst' | 'debate' | 'risk' | 'decision';
}

export interface LogEntry {
  id: string;
  time: string;
  type: 'token' | 'tool_start' | 'tool_end' | 'status' | 'error' | 'chain_start' | 'agent_finish' | 'llm_end';
  agent?: string;
  content: string;
}

export type Signal = 'Buy' | 'Strong Buy' | 'Overweight' | 'Hold' | 'Underweight' | 'Sell' | 'Strong Sell' | 'REVIEW' | '';

export interface PropagateResult {
  run_id: string;
  decision: string;
  signal: Signal;
  market_report: string;
  sentiment_report: string;
  news_report: string;
  fundamentals_report: string;
  bull_history: string;
  bear_history: string;
  judge_decision: string;
  risk_judge_decision: string;
  investment_plan: string;
  final_trade_decision: string;
}

export interface RunState {
  phase: 'idle' | 'running' | 'done' | 'error';
  runId: string;
  ticker: string;
  date: string;
  result?: PropagateResult;
  error?: string;
}

export type AnalystKey = 'market' | 'social' | 'news' | 'fundamentals';
