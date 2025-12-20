'use client';

import { useChatMessages, useChatStatus, useIsStreaming } from '../hooks';
import { useScrollToBottom } from '../hooks';
import { MessageItem } from './message-item';
import { useEffect } from 'react';

export function ChatMessages() {
  const messages = useChatMessages();
  const status = useChatStatus();
  const isStreaming = useIsStreaming();
  const { containerRef, endRef, isAtBottom, scrollToBottom } = useScrollToBottom();

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages.length, isAtBottom, scrollToBottom]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>No messages yet.</p>
          <p className="text-sm">Start a conversation below.</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4"
    >
      <div className="mx-auto max-w-3xl space-y-4">
        {messages.map((message, index) => (
          <MessageItem 
            key={message.id} 
            message={message}
            isLast={index === messages.length - 1}
          />
        ))}
        
        {status === 'submitted' && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="animate-pulse">●</span>
            <span>Thinking...</span>
          </div>
        )}
        
        <div ref={endRef} />
      </div>
      
      {!isAtBottom && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-24 right-8 rounded-full bg-primary p-2 text-primary-foreground shadow-lg"
          aria-label="Scroll to bottom"
        >
          ↓
        </button>
      )}
    </div>
  );
}
