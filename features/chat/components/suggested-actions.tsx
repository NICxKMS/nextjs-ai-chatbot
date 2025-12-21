/**
 * SuggestedActions Component
 *
 * Displays quick-start action buttons below the chat input.
 * Each button sends a predefined message when clicked.
 *
 * @module features/chat/components/suggested-actions
 */

'use client';

import { memo, useMemo } from 'react';
import { m as motion } from 'framer-motion';
import type { UseChatHelpers } from '@ai-sdk/react';
import { Button } from '@/shared/components';
import type { ChatMessage, VisibilityType } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface SuggestedActionsProps {
  /** Chat session identifier */
  chatId: string;
  /** AI SDK sendMessage function to send messages */
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  /** Current visibility setting (for memoization) */
  selectedVisibilityType?: VisibilityType;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Pool of suggestions covering various categories.
 * First 4 are shown by default (from OldApp greeting).
 * Additional suggestions available for future expansion.
 */
const SUGGESTION_POOL = [
  // Primary suggestions (from OldApp greeting - shown by default)
  'Explain quantum computing in simple terms',
  'What are the benefits of TypeScript over JavaScript?',
  'Write a Python function to find prime numbers',
  'How do I optimize React performance?',
  
  // Coding
  'Write a React hook for fetching data with loading states',
  'Explain the difference between let, const, and var in JavaScript',
  'Debug this code: [paste your code here]',
  'Convert this function to TypeScript with proper types',
  
  // Writing
  'Help me write a professional email to request time off',
  'Summarize this article in 3 bullet points',
  'Write a creative story opening about a mysterious door',
  'Help me improve this paragraph for clarity',
  
  // Research
  'Compare the pros and cons of React vs Vue',
  'Explain how machine learning works in simple terms',
  'What are the latest trends in web development?',
  'How do I optimize a website for better performance?',
  
  // Creative
  'Generate 5 unique business name ideas for a coffee shop',
  'Create a workout plan for a beginner',
  'Suggest recipes using chicken and vegetables',
  'Plan a weekend trip itinerary for New York City',
] as const;

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Pure implementation of suggested actions.
 */
function PureSuggestedActions({
  chatId,
  sendMessage,
}: SuggestedActionsProps) {
  // Use stable first 4 suggestions to prevent SSR/client hydration mismatch
  const suggestions = useMemo(() => SUGGESTION_POOL.slice(0, 4), []);

  const handleClick = (suggestion: string) => {
    // Update URL to include chat ID
    window.history.replaceState({}, '', `/chat/${chatId}`);

    // Send the suggested message
    sendMessage({
      role: 'user',
      parts: [{ type: 'text', text: suggestion }],
    });
  };

  return (
    <div
      className="grid w-full gap-2 sm:grid-cols-2"
      data-testid="suggested-actions"
    >
      {suggestions.map((suggestion, index) => (
        <motion.div
          key={suggestion}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
        >
          <Button
            variant="outline"
            className="h-auto w-full cursor-pointer whitespace-normal rounded-full p-3 px-4 text-left"
            onClick={() => handleClick(suggestion)}
          >
            {suggestion}
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Memoized suggested actions component.
 *
 * Features:
 * - Grid layout with responsive columns
 * - Staggered animation on mount
 * - Sends predefined messages on click
 *
 * Visual parity with oldapp/components/suggested-actions.tsx
 */
export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }
    return true;
  }
);
