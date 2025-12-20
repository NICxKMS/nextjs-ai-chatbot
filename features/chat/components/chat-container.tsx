'use client';

import type { ChatMessage, VisibilityType } from '../types';
import { ChatProvider, ModelProvider } from '../context';
import { ChatMessages } from './chat-messages';
import { ChatInput } from './chat-input';
import { ChatHeader } from './chat-header';

interface ChatContainerProps {
  chatId: string;
  initialMessages?: ChatMessage[];
  modelId?: string;
  visibility?: VisibilityType;
  isReadonly?: boolean;
  isGuest?: boolean;
}

export function ChatContainer({
  chatId,
  initialMessages = [],
  modelId = 'gpt-4o',
  visibility = 'private',
  isReadonly = false,
  isGuest = false,
}: ChatContainerProps) {
  return (
    <ModelProvider initialModelId={modelId}>
      <ChatProvider
        chatId={chatId}
        initialMessages={initialMessages}
        modelId={modelId}
        visibility={visibility}
        isReadonly={isReadonly}
        isGuest={isGuest}
      >
        <div className="flex h-full flex-col">
          <ChatHeader />
          <ChatMessages />
          {!isReadonly && <ChatInput />}
        </div>
      </ChatProvider>
    </ModelProvider>
  );
}
