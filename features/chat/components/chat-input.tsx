'use client';

import { useState, useCallback, useRef } from 'react';
import { useChatActions, useIsStreaming, useChatStatus } from '../hooks';

export function ChatInput() {
  const [input, setInput] = useState('');
  const { sendMessage, stop } = useChatActions();
  const isStreaming = useIsStreaming();
  const status = useChatStatus();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDisabled = status === 'submitted' || status === 'streaming';

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedInput = input.trim();
    if (!trimmedInput || isDisabled) return;

    setInput('');
    
    await sendMessage({ text: trimmedInput });
  }, [input, isDisabled, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }, [handleSubmit]);

  return (
    <form onSubmit={handleSubmit} className="border-t p-4">
      <div className="mx-auto max-w-3xl">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            className="flex-1 resize-none rounded-lg border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
            rows={1}
            disabled={isDisabled}
          />
          
          {isStreaming ? (
            <button
              type="button"
              onClick={stop}
              className="rounded-lg bg-destructive px-4 py-2 text-destructive-foreground"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || isDisabled}
              className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
