/**
 * Empty State Components
 *
 * Provides consistent empty state UI across the application.
 * Includes configurable illustrations, actions, and messaging.
 *
 * @module shared/components/empty-state
 */

"use client";

import {
    FileTextIcon,
    FolderOpenIcon,
    InboxIcon,
    type LucideIcon,
    MessageSquareIcon,
    SearchIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export type EmptyStateVariant =
    | "default"
    | "chat"
    | "search"
    | "documents"
    | "history"
    | "folder";

export type EmptyStateAction = {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "ghost";
};

export type EmptyStateProps = {
    /** Title text */
    title: string;
    /** Description text */
    description?: string;
    /** Pre-defined variant for default styling */
    variant?: EmptyStateVariant;
    /** Custom icon (overrides variant icon) */
    icon?: LucideIcon;
    /** Icon size in pixels */
    iconSize?: number;
    /** Primary action button */
    action?: EmptyStateAction;
    /** Secondary action button */
    secondaryAction?: EmptyStateAction;
    /** Custom children content */
    children?: React.ReactNode;
    /** Additional class names */
    className?: string;
    /** Compact mode (less padding) */
    compact?: boolean;
};

// =============================================================================
// VARIANT CONFIGURATION
// =============================================================================

const VARIANT_CONFIG: Record<
    EmptyStateVariant,
    { icon: LucideIcon; defaultTitle: string; defaultDescription: string }
> = {
    default: {
        icon: InboxIcon,
        defaultTitle: "No items yet",
        defaultDescription: "Get started by creating your first item.",
    },
    chat: {
        icon: MessageSquareIcon,
        defaultTitle: "No conversations yet",
        defaultDescription: "Start a new conversation to get started.",
    },
    search: {
        icon: SearchIcon,
        defaultTitle: "No results found",
        defaultDescription: "Try adjusting your search terms or filters.",
    },
    documents: {
        icon: FileTextIcon,
        defaultTitle: "No documents",
        defaultDescription: "Create or upload a document to get started.",
    },
    history: {
        icon: FolderOpenIcon,
        defaultTitle: "No history yet",
        defaultDescription: "Your recent activity will appear here.",
    },
    folder: {
        icon: FolderOpenIcon,
        defaultTitle: "This folder is empty",
        defaultDescription: "Add items to this folder to see them here.",
    },
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Empty state display component.
 *
 * Shows a consistent empty state UI with icon, messaging, and optional actions.
 *
 * @example
 * ```tsx
 * // Simple usage with variant
 * <EmptyState variant="chat" />
 *
 * // Custom usage
 * <EmptyState
 *   title="No messages"
 *   description="Start a conversation"
 *   icon={MessageSquareIcon}
 *   action={{ label: "New Chat", onClick: handleNewChat }}
 * />
 * ```
 */
export function EmptyState({
    title,
    description,
    variant = "default",
    icon,
    iconSize = 48,
    action,
    secondaryAction,
    children,
    className,
    compact = false,
}: EmptyStateProps) {
    const config = VARIANT_CONFIG[variant];
    const Icon = icon ?? config.icon;
    const displayTitle = title || config.defaultTitle;
    const displayDescription = description ?? config.defaultDescription;

    return (
        <div
            aria-label={displayTitle}
            className={cn(
                "flex flex-col items-center justify-center text-center",
                compact ? "gap-3 p-4" : "gap-4 p-8",
                className
            )}
            role="status"
        >
            <div className="rounded-full bg-muted p-4">
                <Icon
                    aria-hidden="true"
                    className="text-muted-foreground"
                    size={iconSize}
                    strokeWidth={1.5}
                />
            </div>

            <div className="space-y-1">
                <h3
                    className={cn(
                        "font-medium text-foreground",
                        compact ? "text-sm" : "text-base"
                    )}
                >
                    {displayTitle}
                </h3>
                {displayDescription && (
                    <p
                        className={cn(
                            "text-muted-foreground",
                            compact ? "text-xs" : "text-sm"
                        )}
                    >
                        {displayDescription}
                    </p>
                )}
            </div>

            {children}

            {(action || secondaryAction) && (
                <div className={cn("flex gap-2", compact ? "mt-2" : "mt-4")}>
                    {action && (
                        <Button
                            onClick={action.onClick}
                            size={compact ? "sm" : "default"}
                            variant={action.variant ?? "default"}
                        >
                            {action.label}
                        </Button>
                    )}
                    {secondaryAction && (
                        <Button
                            onClick={secondaryAction.onClick}
                            size={compact ? "sm" : "default"}
                            variant={secondaryAction.variant ?? "outline"}
                        >
                            {secondaryAction.label}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// PRESET COMPONENTS
// =============================================================================

/**
 * Empty chat state with greeting and suggested actions.
 */
export type EmptyChatStateProps = {
    onNewChat?: () => void;
    className?: string;
};

export function EmptyChatState({ onNewChat, className }: EmptyChatStateProps) {
    return (
        <EmptyState
            action={
                onNewChat
                    ? { label: "Start a conversation", onClick: onNewChat }
                    : undefined
            }
            className={className}
            description="Ask me anything about coding, writing, or research."
            icon={MessageSquareIcon}
            title="Hello! How can I help you today?"
        />
    );
}

/**
 * Empty search results state.
 */
export type EmptySearchStateProps = {
    query?: string;
    onClear?: () => void;
    className?: string;
};

export function EmptySearchState({
    query,
    onClear,
    className,
}: EmptySearchStateProps) {
    return (
        <EmptyState
            action={
                onClear
                    ? {
                          label: "Clear search",
                          onClick: onClear,
                          variant: "outline",
                      }
                    : undefined
            }
            className={className}
            description={
                query
                    ? `No results found for "${query}". Try different keywords.`
                    : "Try searching for something."
            }
            title="No results found"
            variant="search"
        />
    );
}

/**
 * Empty history state for sidebar.
 */
export type EmptyHistoryStateProps = {
    onNewChat?: () => void;
    className?: string;
};

export function EmptyHistoryState({
    onNewChat,
    className,
}: EmptyHistoryStateProps) {
    return (
        <EmptyState
            action={
                onNewChat
                    ? { label: "New Chat", onClick: onNewChat }
                    : undefined
            }
            className={className}
            compact
            description="Your conversations will appear here."
            title="No chat history"
            variant="history"
        />
    );
}

/**
 * Empty documents state.
 */
export type EmptyDocumentsStateProps = {
    onUpload?: () => void;
    onNewDocument?: () => void;
    className?: string;
};

export function EmptyDocumentsState({
    onUpload,
    onNewDocument,
    className,
}: EmptyDocumentsStateProps) {
    return (
        <EmptyState
            action={
                onNewDocument
                    ? { label: "Create Document", onClick: onNewDocument }
                    : undefined
            }
            className={className}
            secondaryAction={
                onUpload
                    ? { label: "Upload", onClick: onUpload, variant: "outline" }
                    : undefined
            }
            title="No documents yet"
            variant="documents"
        />
    );
}

/**
 * Inline empty state for smaller areas.
 */
export type InlineEmptyStateProps = {
    message: string;
    icon?: LucideIcon;
    className?: string;
};

export function InlineEmptyState({
    message,
    icon: Icon = InboxIcon,
    className,
}: InlineEmptyStateProps) {
    return (
        <div
            aria-label={message}
            className={cn(
                "flex items-center justify-center gap-2 p-4 text-center text-muted-foreground text-sm",
                className
            )}
            role="status"
        >
            <Icon aria-hidden="true" className="size-4" />
            <span>{message}</span>
        </div>
    );
}
