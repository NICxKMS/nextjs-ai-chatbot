'use client';

import { 
  createContext, 
  useContext, 
  useState, 
  useCallback, 
  useMemo 
} from 'react';
import type { OptimisticChat } from '../types';

interface OptimisticChatsContextValue {
  optimisticChats: OptimisticChat[];
  addOptimisticChat: (chat: OptimisticChat) => void;
  updateOptimisticChat: (id: string, title: string) => void;
  removeOptimisticChat: (id: string) => void;
  clearOptimisticChats: () => void;
}

const OptimisticChatsContext = createContext<OptimisticChatsContextValue | null>(null);

const MAX_OPTIMISTIC_CHATS = 50;

export function useOptimisticChats(): OptimisticChatsContextValue {
  const context = useContext(OptimisticChatsContext);
  if (!context) {
    throw new Error('useOptimisticChats must be used within OptimisticChatsProvider');
  }
  return context;
}

interface OptimisticChatsProviderProps {
  children: React.ReactNode;
}

export function OptimisticChatsProvider({ children }: OptimisticChatsProviderProps) {
  const [optimisticChats, setOptimisticChats] = useState<OptimisticChat[]>([]);
  const [chatIds] = useState(() => new Set<string>());

  const addOptimisticChat = useCallback((chat: OptimisticChat) => {
    // O(1) duplicate check
    if (chatIds.has(chat.id)) return;
    
    chatIds.add(chat.id);
    setOptimisticChats((prev) => {
      const updated = [chat, ...prev];
      // Memory bound
      if (updated.length > MAX_OPTIMISTIC_CHATS) {
        const removed = updated.pop();
        if (removed) chatIds.delete(removed.id);
      }
      return updated;
    });
  }, [chatIds]);

  const updateOptimisticChat = useCallback((id: string, title: string) => {
    setOptimisticChats((prev) =>
      prev.map((chat) =>
        chat.id === id ? { ...chat, title } : chat
      )
    );
  }, []);

  const removeOptimisticChat = useCallback((id: string) => {
    chatIds.delete(id);
    setOptimisticChats((prev) => prev.filter((chat) => chat.id !== id));
  }, [chatIds]);

  const clearOptimisticChats = useCallback(() => {
    chatIds.clear();
    setOptimisticChats([]);
  }, [chatIds]);

  const value = useMemo<OptimisticChatsContextValue>(() => ({
    optimisticChats,
    addOptimisticChat,
    updateOptimisticChat,
    removeOptimisticChat,
    clearOptimisticChats,
  }), [
    optimisticChats,
    addOptimisticChat,
    updateOptimisticChat,
    removeOptimisticChat,
    clearOptimisticChats,
  ]);

  return (
    <OptimisticChatsContext.Provider value={value}>
      {children}
    </OptimisticChatsContext.Provider>
  );
}
