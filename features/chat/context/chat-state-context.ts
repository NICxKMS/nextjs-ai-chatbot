'use client';

import { createContext, useContext } from 'react';
import type { ChatState } from '../types';

const ChatStateContext = createContext<ChatState | null>(null);

export function useChatStateContext() {
  const context = useContext(ChatStateContext);
  if (!context) {
    throw new Error('useChatStateContext must be used within ChatProvider');
  }
  return context;
}

export { ChatStateContext };
