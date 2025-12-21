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
            aria-hidden="true"
            className={className}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
        >
            <line x1="12" x2="12" y1="5" y2="19" />
            <line x1="5" x2="19" y1="12" y2="12" />
        </svg>
    );
}

/**
 * Props for the NewChatButton component.
 */
export type NewChatButtonProps = {
    /** Click handler to create a new chat */
    onClick?: () => void;
};

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
            aria-label="New chat"
            className="rounded-md p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="new-chat-button"
            onClick={onClick}
            type="button"
        >
            <PlusIcon className="h-5 w-5" />
        </button>
    );
}
