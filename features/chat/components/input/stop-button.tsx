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
export interface StopButtonProps {
    /** Click handler to stop generation */
    onClick: () => void;
}

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
            type="button"
            onClick={onClick}
            className="size-7 rounded-full bg-foreground text-background transition-colors duration-200 hover:bg-foreground/90 flex items-center justify-center"
            aria-label="Stop generating"
            data-testid="stop-button"
        >
            <Square className="h-3 w-3 fill-current" />
        </button>
    );
}
