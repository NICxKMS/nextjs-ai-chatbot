/**
 * SuggestedActions Component
 *
 * Displays quick-start action buttons below the chat input.
 * Each button sends a predefined message when clicked.
 *
 * @module features/chat/components/suggested-actions
 */

'use client';

import { memo } from 'react';
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

const SUGGESTED_ACTIONS = [
  'What are the advantages of using Next.js?',
  "Write code to demonstrate Dijkstra's algorithm",
  'Help me write an essay about Silicon Valley',
  'What is the weather in San Francisco?',
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
      {SUGGESTED_ACTIONS.map((suggestion, index) => (
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
