/**
 * ChatHeader Component
 *
 * Header bar for the chat interface containing sidebar toggle,
 * model selector, and action buttons.
 *
 * @module features/chat/components/chat-header
 */

"use client";

import type { ReactNode } from "react";
import { memo } from "react";
import { useChatMetadata } from "../hooks";
import type { VisibilityType } from "../types";
import { NewChatButton } from "./new-chat-button";
import { VisibilitySelector } from "./visibility-selector";

/**
 * Props for the ChatHeader component.
 */
export type ChatHeaderProps = {
    /** Callback when new chat button is clicked */
    onNewChat?: () => void;
    /** Optional additional CSS classes */
    className?: string;
    /** Selected visibility type for the chat */
    selectedVisibilityType?: VisibilityType;
    /** Slot for sidebar toggle component (injected from app layer) */
    sidebarToggle?: ReactNode;
    /** Slot for settings button component (injected from app layer) */
    settingsButton?: ReactNode;
};

/**
 * Pure implementation of the chat header.
 * Separated for memoization optimization.
 */
function PureChatHeader({
    onNewChat,
    className = "",
    isReadonly,
    chatId,
    selectedVisibilityType,
    sidebarToggle,
    settingsButton,
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
            {/* Sidebar toggle - left (injected via slot) */}
            {sidebarToggle}

            {/* Actions - right */}
            <div
                aria-label="Chat actions"
                className="flex items-center gap-1"
                role="toolbar"
            >
                {/* Visibility selector - only for existing chats */}
                {isExistingChat && !isReadonly && selectedVisibilityType && (
                    <VisibilitySelector
                        chatId={chatId}
                        selectedVisibilityType={selectedVisibilityType}
                    />
                )}
                {!isReadonly && (
                    <>
                        {/* Settings button (injected via slot) */}
                        {settingsButton}
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
        prevProps.className === nextProps.className &&
        prevProps.chatId === nextProps.chatId &&
        prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
        prevProps.sidebarToggle === nextProps.sidebarToggle &&
        prevProps.settingsButton === nextProps.settingsButton
    );
});

/**
 * Header component for the chat interface.
 *
 * Contains:
 * - Sidebar toggle (left, injected via slot)
 * - Visibility selector (right, for existing chats)
 * - Settings button (right, injected via slot)
 * - New chat button (right, hidden in readonly mode)
 *
 * @remarks
 * Uses slot props for cross-feature components (SidebarToggle, SettingsButton).
 * This allows the app layer to wire features together without direct coupling.
 * Memoized to prevent unnecessary re-renders when parent updates.
 *
 * @example
 * ```tsx
 * // In app layer where features are composed:
 * <ChatHeader
 *   onNewChat={() => router.push('/')}
 *   sidebarToggle={<SidebarToggle />}
 *   settingsButton={<SettingsIconButton />}
 * />
 * ```
 */
export function ChatHeader({
    onNewChat,
    className,
    selectedVisibilityType,
    sidebarToggle,
    settingsButton,
}: ChatHeaderProps) {
    const { isReadonly, chatId } = useChatMetadata();

    return (
        <MemoizedPureChatHeader
            chatId={chatId}
            className={className}
            isReadonly={isReadonly}
            onNewChat={onNewChat}
            selectedVisibilityType={selectedVisibilityType}
            settingsButton={settingsButton}
            sidebarToggle={sidebarToggle}
        />
    );
}
