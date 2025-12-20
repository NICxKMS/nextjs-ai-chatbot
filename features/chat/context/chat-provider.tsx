'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { ChatStateContext } from './chat-state-context';
import { ChatActionsContext } from './chat-actions-context';
import type { ChatMessage, ChatState, ChatActions, VisibilityType } from '../types';
import { isDataChatTitlePart } from '../types';

interface ChatProviderProps {
  children: React.ReactNode;
  chatId: string;
  initialMessages?: ChatMessage[];
  modelId: string;
  visibility?: VisibilityType;
  isReadonly?: boolean;
  isGuest?: boolean;
}

export function ChatProvider({
  children,
  chatId,
  initialMessages = [],
  modelId,
  visibility = 'private',
  isReadonly = false,
  isGuest = false,
}: ChatProviderProps) {
  const [title, setTitle] = useState<string | null>(null);
  const [localError, setLocalError] = useState<Error | null>(null);

  const {
    messages,
    sendMessage,
    setMessages,
    regenerate,
    stop: stopChat,
    status,
    error: chatError,
  } = useChat<ChatMessage>({
    id: chatId,
    messages: initialMessages,
    experimental_throttle: 100,
    generateId: () => crypto.randomUUID(),
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest(request) {
        return {
          body: {
            id: request.id,
            message: request.messages.at(-1),
            selectedChatModel: modelId,
            selectedVisibilityType: visibility,
            ...request.body,
          },
        };
      },
    }),
    onData: (dataPart: unknown) => {
      if (isDataChatTitlePart(dataPart)) {
        setTitle(dataPart.data);
      }
    },
    onError: (error) => {
      setLocalError(error instanceof Error ? error : new Error(String(error)));
    },
  });

  // Sync chatError to localError
  useEffect(() => {
    if (chatError) {
      setLocalError(chatError instanceof Error ? chatError : new Error(String(chatError)));
    }
  }, [chatError]);

  const clearError = useCallback(() => {
    setLocalError(null);
  }, []);

  const stop = useCallback(() => {
    stopChat();
  }, [stopChat]);

  // Memoized state - only re-renders when these specific values change
  const stateValue = useMemo<ChatState>(() => ({
    chatId,
    messages,
    status,
    error: localError,
    isReadonly,
    isGuest,
    title,
  }), [chatId, messages, status, localError, isReadonly, isGuest, title]);

  // Memoized actions - stable references
  const actionsValue = useMemo<ChatActions>(() => ({
    sendMessage,
    setMessages,
    regenerate,
    stop,
    clearError,
  }), [sendMessage, setMessages, regenerate, stop, clearError]);

  return (
    <ChatStateContext.Provider value={stateValue}>
      <ChatActionsContext.Provider value={actionsValue}>
        {children}
      </ChatActionsContext.Provider>
    </ChatStateContext.Provider>
  );
}
