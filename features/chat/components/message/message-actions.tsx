/**
 * Message Actions Component
 *
 * Renders action buttons for messages including copy, vote up/down, and edit.
 * Actions are displayed for assistant messages when not in read-only mode.
 *
 * @module features/chat/components/message/message-actions
 */

'use client';

import { memo, useCallback } from 'react';
import { Copy, ThumbsDown, ThumbsUp, Pencil } from 'lucide-react';
import type { MessageVote, VoteType } from '../../types';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export interface MessageActionsProps {
  /** ID of the message these actions are for */
  messageId: string;
  /** Current vote state for this message */
  vote?: MessageVote;
  /** Callback when user votes on the message */
  onVote?: (vote: VoteType) => void;
  /** Callback when user copies the message */
  onCopy?: () => void;
  /** Callback when user wants to edit the message */
  onEdit?: () => void;
  /** Whether to show edit action (typically for user messages) */
  showEdit?: boolean;
  /** Whether actions are disabled */
  disabled?: boolean;
  /** Optional additional class names */
  className?: string;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface ActionButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  tooltip?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Individual action button with tooltip and hover states.
 */
function ActionButton({
  onClick,
  disabled,
  active,
  tooltip,
  children,
  className,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={cn(
        'inline-flex size-7 items-center justify-center rounded-md',
        'text-muted-foreground transition-colors',
        'hover:bg-muted hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        active && 'bg-muted text-foreground',
        className
      )}
    >
      {children}
    </button>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Renders action buttons for a chat message.
 *
 * For assistant messages: Copy, Thumbs Up, Thumbs Down
 * For user messages (with showEdit): Edit, Copy
 *
 * @example
 * ```tsx
 * // Assistant message actions
 * <MessageActions
 *   messageId="msg-123"
 *   vote={vote}
 *   onVote={handleVote}
 *   onCopy={handleCopy}
 * />
 *
 * // User message actions
 * <MessageActions
 *   messageId="msg-456"
 *   showEdit
 *   onEdit={handleEdit}
 *   onCopy={handleCopy}
 * />
 * ```
 */
export const MessageActions = memo(function MessageActions({
  messageId,
  vote,
  onVote,
  onCopy,
  onEdit,
  showEdit = false,
  disabled = false,
  className,
}: MessageActionsProps) {
  const handleUpvote = useCallback(() => {
    onVote?.('up');
  }, [onVote]);

  const handleDownvote = useCallback(() => {
    onVote?.('down');
  }, [onVote]);

  const handleCopy = useCallback(() => {
    onCopy?.();
  }, [onCopy]);

  const handleEdit = useCallback(() => {
    onEdit?.();
  }, [onEdit]);

  const isUpvoted = vote?.vote === 'up';
  const isDownvoted = vote?.vote === 'down';

  // User message actions layout
  if (showEdit) {
    return (
      <div className={cn('flex items-center gap-0.5 justify-end', className)}>
        {onEdit && (
          <ActionButton
            onClick={handleEdit}
            disabled={disabled}
            tooltip="Edit message"
          >
            <Pencil className="size-3.5" />
          </ActionButton>
        )}
        <ActionButton
          onClick={handleCopy}
          disabled={disabled}
          tooltip="Copy message"
        >
          <Copy className="size-3.5" />
        </ActionButton>
      </div>
    );
  }

  // Assistant message actions layout
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      <ActionButton
        onClick={handleCopy}
        disabled={disabled}
        tooltip="Copy message"
      >
        <Copy className="size-3.5" />
      </ActionButton>

      <ActionButton
        onClick={handleUpvote}
        disabled={disabled || isUpvoted}
        active={isUpvoted}
        tooltip="Good response"
      >
        <ThumbsUp className="size-3.5" />
      </ActionButton>

      <ActionButton
        onClick={handleDownvote}
        disabled={disabled || isDownvoted}
        active={isDownvoted}
        tooltip="Bad response"
      >
        <ThumbsDown className="size-3.5" />
      </ActionButton>
    </div>
  );
});
