import type { NodeStatus } from '../types';

export function isNodeActive(status: NodeStatus): boolean {
  return status === 'running';
}

export function isNodeFinished(status: NodeStatus): boolean {
  return status === 'done' || status === 'error';
}
