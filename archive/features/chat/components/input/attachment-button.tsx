/**
 * AttachmentButton Component
 *
 * Button to trigger file attachment selection for chat input.
 *
 * @module features/chat/components/input/attachment-button
 */

"use client";

import { Paperclip } from "lucide-react";

/**
 * Props for the AttachmentButton component.
 */
export type AttachmentButtonProps = {
    /** Click handler to open file selection */
    onClick: () => void;
    /** Whether the button is disabled */
    disabled?: boolean;
};

/**
 * Button component for attaching files to a chat message.
 *
 * @remarks
 * Renders a paperclip icon button that triggers the file input dialog.
 * Matches the visual style of oldapp/components/multimodal-input.tsx
 *
 * @example
 * ```tsx
 * <AttachmentButton
 *   onClick={() => fileInputRef.current?.click()}
 *   disabled={isLoading}
 * />
 * ```
 */
export function AttachmentButton({ onClick, disabled }: AttachmentButtonProps) {
    return (
        <button
            aria-label="Attach file"
            className="h-8 w-8 rounded-lg p-1 transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
            data-testid="attachments-button"
            disabled={disabled}
            onClick={onClick}
            type="button"
        >
            <Paperclip className="h-4 w-4" />
        </button>
    );
}
