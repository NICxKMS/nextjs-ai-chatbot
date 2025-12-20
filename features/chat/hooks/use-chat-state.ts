'use client';

import { useChatStateContext } from '../context';
import type { ChatState, ChatStatus, ChatMessage } from '../types';

/**
 * Hook to access read-only chat state.
 * Only re-renders when state values change.
 */
export function useChatState(): ChatState {
  return useChatStateContext();
}

/**
 * Selector hooks for fine-grained subscriptions
 */
export function useChatMessages(): ChatMessage[] {
  const { messages } = useChatStateContext();
  return messages;
}

export function useChatStatus(): ChatStatus {
  const { status } = useChatStateContext();
  return status;
}

export function useChatError(): Error | null {
  const { error } = useChatStateContext();
  return error;
}

export function useChatTitle(): string | null {
  const { title } = useChatStateContext();
  return title;
}

export function useIsStreaming(): boolean {
  const { status } = useChatStateContext();
  return status === 'streaming';
}

export function useIsReadonly(): boolean {
  const { isReadonly } = useChatStateContext();
  return isReadonly;
}
