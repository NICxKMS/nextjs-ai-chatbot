/**
 * ChatHeader Component
 *
 * Header bar for the chat interface containing sidebar toggle,
 * model selector, and action buttons.
 *
 * @module features/chat/components/chat-header
 */

"use client";

import { memo } from "react";
import { SettingsIconButton } from "@/features/settings";
import { useChatMetadata } from "../hooks";
import type { VisibilityType } from "../types";
import { NewChatButton } from "./new-chat-button";
import { SidebarToggle } from "./sidebar-toggle";
import { VisibilitySelector } from "./visibility-selector";

/**
 * Props for the ChatHeader component.
 */
export type ChatHeaderProps = {
    /** Callback when new chat button is clicked */
    onNewChat?: () => void;
    /** Callback when sidebar toggle is clicked */
    onToggleSidebar?: () => void;
    /** Optional additional CSS classes */
    className?: string;
    /** Selected visibility type for the chat */
    selectedVisibilityType?: VisibilityType;
};

/**
 * Pure implementation of the chat header.
 * Separated for memoization optimization.
 */
function PureChatHeader({
    onNewChat,
    onToggleSidebar,
    className = "",
    isReadonly,
    chatId,
    selectedVisibilityType,
}: ChatHeaderProps & {
    isReadonly: boolean;
    chatId: string;
}) {
    // Only show visibility selector for existing chats (non-empty chatId that isn't a new chat placeholder)
    const isExistingChat = chatId && chatId !== "new";

    return (
        <header
            className={`sticky top-0 z-10 flex items-center justify-between gap-2 bg-background px-2 py-1.5 md:px-2 ${className}`.trim()}
        >
            {/* Sidebar toggle - left */}
            <SidebarToggle onClick={onToggleSidebar} />

            {/* Actions - right */}
            <div className="flex items-center gap-1">
                {/* Visibility selector - only for existing chats */}
                {isExistingChat && !isReadonly && selectedVisibilityType && (
                    <VisibilitySelector
                        chatId={chatId}
                        selectedVisibilityType={selectedVisibilityType}
                    />
                )}
                {!isReadonly && (
                    <>
                        <SettingsIconButton />
                        <NewChatButton onClick={onNewChat} />
                    </>
                )}
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
        prevProps.onNewChat === nextProps.onNewChat &&
        prevProps.onToggleSidebar === nextProps.onToggleSidebar &&
        prevProps.className === nextProps.className &&
        prevProps.chatId === nextProps.chatId &&
        prevProps.selectedVisibilityType === nextProps.selectedVisibilityType
    );
});

/**
 * Header component for the chat interface.
 *
 * Contains:
 * - Sidebar toggle (left)
 * - Visibility selector (right, for existing chats)
 * - Settings button (right)
 * - New chat button (right, hidden in readonly mode)
 *
 * @remarks
 * Uses context hooks to access chat state.
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
    selectedVisibilityType,
}: ChatHeaderProps) {
    const { isReadonly, chatId } = useChatMetadata();

    return (
        <MemoizedPureChatHeader
            chatId={chatId}
            className={className}
            isReadonly={isReadonly}
            onNewChat={onNewChat}
            onToggleSidebar={onToggleSidebar}
            selectedVisibilityType={selectedVisibilityType}
        />
    );
}
