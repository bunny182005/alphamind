import type { NodeStatus } from '../types';

export function isNodeActive(status: NodeStatus): boolean {
  return status === 'thinking';
}

export function isNodeFinished(status: NodeStatus): boolean {
  return status === 'done' || status === 'error';
}
