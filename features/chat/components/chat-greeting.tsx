/**
 * Chat Greeting Component
 *
 * Displays an empty state with helpful suggestions when no messages exist.
 * Users can click suggestions to quickly start a conversation.
 *
 * @module features/chat/components/chat-greeting
 */

'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export interface ChatGreetingProps {
  /** Callback when a suggestion is clicked */
  onSuggestionClick?: (suggestion: string) => void;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SUGGESTIONS = [
  'Explain quantum computing in simple terms',
  'What are the benefits of TypeScript over JavaScript?',
  'Write a Python function to find prime numbers',
  'How do I optimize React performance?',
] as const;

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Chat empty state with greeting and suggestion buttons.
 *
 * @example
 * ```tsx
 * <ChatGreeting
 *   onSuggestionClick={(text) => sendMessage({ content: text })}
 * />
 * ```
 */
export const ChatGreeting = memo(function ChatGreeting({
  onSuggestionClick,
  className,
}: ChatGreetingProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center h-full p-8 text-center',
        className
      )}
    >
      <h1 className="text-2xl font-semibold mb-2">How can I help you today?</h1>
      <p className="text-muted-foreground mb-8">
        Start a conversation or try one of these suggestions:
      </p>
      <div className="grid gap-2 max-w-md w-full">
        {SUGGESTIONS.map((suggestion, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSuggestionClick?.(suggestion)}
            className={cn(
              'p-3 text-left rounded-lg border',
              'hover:bg-muted transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
            )}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
});
