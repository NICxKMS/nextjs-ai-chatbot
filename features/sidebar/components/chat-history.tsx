'use client';

import { useChatHistory } from '../hooks';
import { ChatHistoryItem } from './chat-history-item';

interface ChatHistoryProps {
  userId?: string;
}

export function ChatHistory({ userId }: ChatHistoryProps) {
  const { groupedChats, isLoading, hasMore, loadMore, isValidating } = useChatHistory(userId);

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 rounded bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!groupedChats.length) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>No chat history</p>
        <p className="text-sm">Start a new conversation</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {groupedChats.map((group) => (
        <div key={group.group} className="px-2 py-1">
          <h3 className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
            {group.label}
          </h3>
          <ul className="space-y-0.5">
            {group.chats.map((chat) => (
              <ChatHistoryItem key={chat.id} chat={chat} />
            ))}
          </ul>
        </div>
      ))}
      
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={isValidating}
          className="mx-4 my-2 py-2 text-sm text-center text-muted-foreground hover:text-foreground"
        >
          {isValidating ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
}
