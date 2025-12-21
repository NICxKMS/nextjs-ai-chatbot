/**
 * NewChatButton Component
 *
 * Button to start a new chat conversation.
 *
 * @module features/chat/components/new-chat-button
 */

"use client";

/**
 * Plus icon for the new chat button.
 */
function PlusIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}

/**
 * Props for the NewChatButton component.
 */
export interface NewChatButtonProps {
    /** Click handler to create a new chat */
    onClick?: () => void;
}

/**
 * Button component for creating a new chat conversation.
 *
 * @example
 * ```tsx
 * <NewChatButton onClick={() => router.push('/')} />
 * ```
 */
export function NewChatButton({ onClick }: NewChatButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="p-2 rounded-md hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="New chat"
            data-testid="new-chat-button"
        >
            <PlusIcon className="h-5 w-5" />
        </button>
    );
}
