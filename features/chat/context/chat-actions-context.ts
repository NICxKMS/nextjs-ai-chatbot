'use client';

import { createContext, useContext } from 'react';
import type { ChatActions } from '../types';

const ChatActionsContext = createContext<ChatActions | null>(null);

export function useChatActionsContext() {
  const context = useContext(ChatActionsContext);
  if (!context) {
    throw new Error('useChatActionsContext must be used within ChatProvider');
  }
  return context;
}

export { ChatActionsContext };
