export interface ExecutionTelemetry {
  runId: string;
  ticker: string;
  durationSeconds: number;
  tokensProcessed?: number;
  totalCostEstimate?: number;
}
