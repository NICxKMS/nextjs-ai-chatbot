/**
 * ChatContainer Component
 *
 * Layout wrapper for the chat interface that provides flex column structure.
 * Orchestrates the layout of header, messages, and input areas.
 *
 * @module features/chat/components/chat-container
 */

'use client';

/**
 * Props for the ChatContainer component.
 */
export interface ChatContainerProps {
  /** Child components (header, messages, input) */
  children: React.ReactNode;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Container component providing the main chat layout structure.
 *
 * Uses flex column layout to arrange:
 * - Header at top (flex-shrink-0)
 * - Messages in middle (flex-1, scrollable)
 * - Input at bottom (flex-shrink-0)
 *
 * @example
 * ```tsx
 * <ChatContainer>
 *   <ChatHeader />
 *   <ChatMessages />
 *   <ChatInput />
 * </ChatContainer>
 * ```
 */
export function ChatContainer({
  children,
  className = '',
}: ChatContainerProps) {
  return (
    <div
      className={`flex flex-col h-full min-h-0 bg-background ${className}`.trim()}
      role="main"
      aria-label="Chat interface"
    >
      {children}
    </div>
  );
}
