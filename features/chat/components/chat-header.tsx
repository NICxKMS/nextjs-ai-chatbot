/**
 * ChatHeader Component
 *
 * Header bar for the chat interface containing sidebar toggle,
 * model selector, and action buttons.
 *
 * @module features/chat/components/chat-header
 */

'use client';

import { memo } from 'react';
import { useChatMetadata, useModelState } from '../hooks';
import { ModelSelector } from './model-selector';
import { NewChatButton } from './new-chat-button';
import { SidebarToggle } from './sidebar-toggle';

/**
 * Props for the ChatHeader component.
 */
export interface ChatHeaderProps {
  /** Callback when new chat button is clicked */
  onNewChat?: () => void;
  /** Callback when sidebar toggle is clicked */
  onToggleSidebar?: () => void;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Pure implementation of the chat header.
 * Separated for memoization optimization.
 */
function PureChatHeader({
  onNewChat,
  onToggleSidebar,
  className = '',
  isReadonly,
  currentModelId,
  availableModels,
  setModelId,
}: ChatHeaderProps & {
  isReadonly: boolean;
  currentModelId: string;
  availableModels: ReturnType<typeof useModelState>['availableModels'];
  setModelId: (id: string) => void;
}) {
  return (
    <header
      className={`sticky top-0 z-10 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2 border-b border-border ${className}`.trim()}
      role="banner"
    >
      {/* Sidebar toggle - left */}
      <div className="flex-shrink-0">
        <SidebarToggle onClick={onToggleSidebar} />
      </div>

      {/* Model selector - center */}
      <div className="flex-1 flex justify-center">
        <ModelSelector
          value={currentModelId}
          models={availableModels}
          onChange={setModelId}
          disabled={isReadonly}
        />
      </div>

      {/* Actions - right */}
      <div className="flex-shrink-0">
        {!isReadonly && <NewChatButton onClick={onNewChat} />}
      </div>
    </header>
  );
}

/**
 * Memoized pure header to prevent unnecessary re-renders.
 */
const MemoizedPureChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.isReadonly === nextProps.isReadonly &&
    prevProps.currentModelId === nextProps.currentModelId &&
    prevProps.availableModels === nextProps.availableModels &&
    prevProps.onNewChat === nextProps.onNewChat &&
    prevProps.onToggleSidebar === nextProps.onToggleSidebar &&
    prevProps.className === nextProps.className
  );
});

/**
 * Header component for the chat interface.
 *
 * Contains:
 * - Sidebar toggle (left)
 * - Model selector dropdown (center, disabled in readonly mode)
 * - New chat button (right, hidden in readonly mode)
 *
 * @remarks
 * Uses context hooks to access chat and model state.
 * Memoized to prevent unnecessary re-renders when parent updates.
 *
 * @example
 * ```tsx
 * <ChatHeader
 *   onNewChat={() => router.push('/')}
 *   onToggleSidebar={() => setSidebarOpen(!open)}
 * />
 * ```
 */
export function ChatHeader({
  onNewChat,
  onToggleSidebar,
  className,
}: ChatHeaderProps) {
  const { isReadonly } = useChatMetadata();
  const { currentModelId, availableModels, setModelId } = useModelState();

  return (
    <MemoizedPureChatHeader
      onNewChat={onNewChat}
      onToggleSidebar={onToggleSidebar}
      className={className}
      isReadonly={isReadonly}
      currentModelId={currentModelId}
      availableModels={availableModels}
      setModelId={setModelId}
    />
  );
}
