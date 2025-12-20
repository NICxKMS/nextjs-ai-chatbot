import 'server-only';
import { logger } from '@/lib/logging';

interface CircuitBreakerState {
  failures: number;
  openedAt: number | null;
}

const state: CircuitBreakerState = { failures: 0, openedAt: null };

const CONFIG = {
  threshold: 5,
  resetMs: 30_000,
} as const;

export function isCircuitOpen(): boolean {
  if (!state.openedAt) return false;
  if (Date.now() - state.openedAt > CONFIG.resetMs) {
    state.openedAt = null;
    state.failures = 0;
    logger.warn('Redis circuit breaker reset');
    return false;
  }
  return true;
}

export function recordFailure(operation: string, error: unknown): void {
  state.failures++;
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error(`Redis ${operation} failed (${state.failures}/${CONFIG.threshold})`, err);
  
  if (state.failures >= CONFIG.threshold && !state.openedAt) {
    state.openedAt = Date.now();
    logger.error(`Redis circuit breaker OPENED`);
  }
}

export function recordSuccess(): void {
  if (state.failures > 0) state.failures = 0;
}

export async function withCircuitBreaker<T>(
  operation: string,
  fallback: T,
  fn: () => Promise<T>
): Promise<T> {
  if (isCircuitOpen()) return fallback;
  
  try {
    const result = await fn();
    recordSuccess();
    return result;
  } catch (error) {
    recordFailure(operation, error);
    return fallback;
  }
}
