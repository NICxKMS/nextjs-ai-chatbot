'use client';

import { useState, useCallback } from 'react';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputSubmit,
} from '@/shared/components/elements';
import { useChatActions, useChatStatus } from '../hooks';

export interface ChatInputProps {
  chatId?: string;
  isDisabled?: boolean;
}

export function ChatInput({ chatId, isDisabled: externalDisabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const { sendMessage, stop } = useChatActions();
  const status = useChatStatus();

  const isSubmitting = status === 'submitted';
  const isStreaming = status === 'streaming';
  const isDisabled = externalDisabled || isSubmitting || isStreaming;
  const canSubmit = input.trim().length > 0 && !isDisabled;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedInput = input.trim();
      if (!trimmedInput || isDisabled) return;

      setInput('');
      await sendMessage({ text: trimmedInput });
    },
    [input, isDisabled, sendMessage]
  );

  const handleStopClick = useCallback(() => {
    if (isStreaming) {
      stop();
    }
  }, [isStreaming, stop]);

  return (
    <div className="border-t p-4">
      <div className="mx-auto max-w-3xl">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send a message..."
            disabled={isDisabled}
            rows={1}
          />
          <PromptInputToolbar>
            <PromptInputTools />
            {isStreaming ? (
              <PromptInputSubmit
                type="button"
                onClick={handleStopClick}
                status="streaming"
                variant="destructive"
                aria-label="Stop generating"
              />
            ) : (
              <PromptInputSubmit
                disabled={!canSubmit}
                status={isSubmitting ? 'submitted' : 'ready'}
                aria-label="Send message"
              />
            )}
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
}
