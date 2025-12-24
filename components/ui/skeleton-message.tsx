/**
 * Message Skeleton Components
 *
 * Loading skeletons for individual chat messages.
 * Supports user and assistant message variants.
 *
 * @module components/ui/skeleton-message
 */

"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/shared/ui/skeleton";

// =============================================================================
// MESSAGE SKELETON
// =============================================================================

export interface MessageSkeletonProps {
    /** Whether this is an assistant message (longer content) */
    isAssistant?: boolean;
    /** Show avatar placeholder */
    showAvatar?: boolean;
    /** Number of lines for assistant messages */
    lineCount?: number;
    /** Additional class names */
    className?: string;
}

/**
 * Single message skeleton.
 * Adapts layout based on message type (user vs assistant).
 *
 * @example
 * ```tsx
 * <MessageSkeleton isAssistant showAvatar />
 * <MessageSkeleton isAssistant={false} showAvatar />
 * ```
 */
export function MessageSkeleton({
    isAssistant = true,
    showAvatar = true,
    lineCount = 3,
    className,
}: MessageSkeletonProps) {
    return (
        <div
            aria-hidden="true"
            className={cn("flex gap-4", className)}
            role="presentation"
        >
            {showAvatar && (
                <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            )}
            <div
                className={cn(
                    "flex flex-1 flex-col gap-2",
                    !showAvatar && "ml-12"
                )}
            >
                {isAssistant ? (
                    <AssistantMessageLines count={lineCount} />
                ) : (
                    <Skeleton className="h-4 w-[40%]" />
                )}
            </div>
        </div>
    );
}

// =============================================================================
// ASSISTANT MESSAGE LINES
// =============================================================================

interface AssistantMessageLinesProps {
    count?: number;
}

/**
 * Multiple lines skeleton for assistant messages.
 * Uses decreasing widths for natural appearance.
 */
function AssistantMessageLines({ count = 3 }: AssistantMessageLinesProps) {
    const widths = ["90%", "75%", "60%", "85%", "45%"];

    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <Skeleton
                    className="h-4"
                    key={i}
                    style={{ width: widths[i % widths.length] }}
                />
            ))}
        </>
    );
}

// =============================================================================
// MESSAGE LIST SKELETON
// =============================================================================

export interface MessageListSkeletonProps {
    /** Number of messages to show */
    count?: number;
    /** Gap between messages */
    gap?: "sm" | "md" | "lg";
    /** Additional class names */
    className?: string;
}

/**
 * List of message skeletons.
 * Alternates between user and assistant messages.
 *
 * @example
 * ```tsx
 * <Suspense fallback={<MessageListSkeleton count={5} />}>
 *   <MessageList messages={messages} />
 * </Suspense>
 * ```
 */
export function MessageListSkeleton({
    count = 4,
    gap = "md",
    className,
}: MessageListSkeletonProps) {
    const gapClasses = {
        sm: "space-y-3",
        md: "space-y-6",
        lg: "space-y-8",
    };

    return (
        <div
            aria-hidden="true"
            aria-label="Loading messages"
            className={cn(gapClasses[gap], className)}
            role="status"
        >
            {Array.from({ length: count }).map((_, i) => (
                <MessageSkeleton isAssistant={i % 2 === 1} key={i} showAvatar />
            ))}
        </div>
    );
}

// =============================================================================
// STREAMING MESSAGE SKELETON
// =============================================================================

export interface StreamingMessageSkeletonProps {
    /** Additional class names */
    className?: string;
}

/**
 * Skeleton for a message that is currently streaming.
 * Shows typing indicator style animation.
 *
 * @example
 * ```tsx
 * {isStreaming && <StreamingMessageSkeleton />}
 * ```
 */
export function StreamingMessageSkeleton({
    className,
}: StreamingMessageSkeletonProps) {
    return (
        <div
            aria-hidden="true"
            aria-label="Assistant is typing"
            className={cn("flex gap-4", className)}
            role="status"
        >
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="flex items-center gap-1 py-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/40" />
                <span
                    className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/40"
                    style={{ animationDelay: "150ms" }}
                />
                <span
                    className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/40"
                    style={{ animationDelay: "300ms" }}
                />
            </div>
        </div>
    );
}
