/**
 * StopButton Component
 *
 * Button to stop AI response generation.
 *
 * @module features/chat/components/input/stop-button
 */

"use client";

import { Square } from "lucide-react";

/**
 * Props for the StopButton component.
 */
export type StopButtonProps = {
    /** Click handler to stop generation */
    onClick: () => void;
};

/**
 * Button component for stopping AI response generation.
 *
 * @remarks
 * Renders a stop icon (square) button to cancel ongoing streams.
 * Matches the visual style of oldapp/components/multimodal-input.tsx
 *
 * @example
 * ```tsx
 * <StopButton onClick={stop} />
 * ```
 */
export function StopButton({ onClick }: StopButtonProps) {
    return (
        <button
            aria-label="Stop generating"
            className="flex size-7 items-center justify-center rounded-full bg-foreground text-background transition-colors duration-200 hover:bg-foreground/90"
            data-testid="stop-button"
            onClick={onClick}
            type="button"
        >
            <Square className="h-3 w-3 fill-current" />
        </button>
    );
}
