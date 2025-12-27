/**
 * Chat Skeleton Components
 *
 * Loading skeletons for chat list and chat-related UI.
 * Provides consistent loading states for chat features.
 *
 * @module components/ui/skeleton-chat
 */

"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/shared/ui/skeleton";

// =============================================================================
// CHAT LIST SKELETON
// =============================================================================

export interface ChatListSkeletonProps {
    /** Number of chat items to show */
    count?: number;
    /** Additional class names */
    className?: string;
}

/**
 * Skeleton for chat list/history view.
 * Shows placeholder items matching the chat list layout.
 *
 * @example
 * ```tsx
 * <Suspense fallback={<ChatListSkeleton count={5} />}>
 *   <ChatList />
 * </Suspense>
 * ```
 */
export function ChatListSkeleton({
    count = 5,
    className,
}: ChatListSkeletonProps) {
    return (
        <div
            aria-hidden="true"
            aria-label="Loading chat list"
            className={cn("flex flex-col gap-2 p-4", className)}
            role="status"
        >
            {Array.from({ length: count }).map((_, i) => (
                <ChatListItemSkeleton key={i} />
            ))}
        </div>
    );
}

// =============================================================================
// CHAT LIST ITEM SKELETON
// =============================================================================

export interface ChatListItemSkeletonProps {
    /** Additional class names */
    className?: string;
}

/**
 * Single chat list item skeleton.
 * Matches the layout of a chat history item.
 */
export function ChatListItemSkeleton({ className }: ChatListItemSkeletonProps) {
    return (
        <div
            aria-hidden="true"
            className={cn("flex items-center gap-3 rounded-lg p-2", className)}
        >
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
            </div>
        </div>
    );
}

// =============================================================================
// CHAT SKELETON
// =============================================================================

export interface ChatSkeletonProps {
    /** Number of message skeletons to show */
    messageCount?: number;
    /** Show header section */
    showHeader?: boolean;
    /** Show input section */
    showInput?: boolean;
    /** Additional class names */
    className?: string;
}

/**
 * Full chat view skeleton.
 * Shows header, messages, and input placeholder.
 *
 * @example
 * ```tsx
 * <Suspense fallback={<ChatSkeleton messageCount={3} />}>
 *   <ChatView chatId={id} />
 * </Suspense>
 * ```
 */
export function ChatSkeleton({
    messageCount = 3,
    showHeader = true,
    showInput = true,
    className,
}: ChatSkeletonProps) {
    return (
        <div
            aria-hidden="true"
            aria-label="Loading chat"
            className={cn("flex h-full flex-col", className)}
            role="status"
        >
            {showHeader && (
                <div className="flex h-14 items-center border-b px-4">
                    <Skeleton className="h-6 w-32" />
                </div>
            )}

            <div className="flex-1 space-y-6 overflow-hidden p-4">
                {Array.from({ length: messageCount }).map((_, i) => (
                    <ChatMessageSkeleton isAssistant={i % 2 === 1} key={i} />
                ))}
            </div>

            {showInput && (
                <div className="border-t p-4">
                    <Skeleton className="h-12 w-full rounded-lg" />
                </div>
            )}
        </div>
    );
}

// =============================================================================
// CHAT MESSAGE SKELETON (inline variant)
// =============================================================================

interface ChatMessageSkeletonProps {
    isAssistant?: boolean;
}

function ChatMessageSkeleton({ isAssistant = true }: ChatMessageSkeletonProps) {
    return (
        <div className="flex gap-4">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
                {isAssistant ? (
                    <>
                        <Skeleton className="h-4 w-[90%]" />
                        <Skeleton className="h-4 w-[75%]" />
                        <Skeleton className="h-4 w-[60%]" />
                    </>
                ) : (
                    <Skeleton className="h-4 w-[40%]" />
                )}
            </div>
        </div>
    );
}
