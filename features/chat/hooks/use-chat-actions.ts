'use client';

import { useChatActionsContext } from '../context';
import type { ChatActions } from '../types';

/**
 * Hook to access chat mutation actions.
 * Actions are stable references - won't cause re-renders.
 */
export function useChatActions(): ChatActions {
  return useChatActionsContext();
}
