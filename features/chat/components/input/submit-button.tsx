/**
 * SubmitButton Component
 *
 * Button to submit a chat message.
 *
 * @module features/chat/components/input/submit-button
 */

'use client';

import { ArrowUp } from 'lucide-react';

/**
 * Props for the SubmitButton component.
 */
export interface SubmitButtonProps {
  /** Whether the button is disabled */
  disabled?: boolean;
}

/**
 * Button component for submitting a chat message.
 *
 * @remarks
 * Renders an arrow-up icon button styled as the primary action.
 * Matches the visual style of oldapp/components/multimodal-input.tsx
 *
 * @example
 * ```tsx
 * <SubmitButton disabled={!canSubmit} />
 * ```
 */
export function SubmitButton({ disabled }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="size-8 rounded-full bg-primary text-primary-foreground transition-colors duration-200 hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground flex items-center justify-center"
      aria-label="Send message"
      data-testid="send-button"
    >
      <ArrowUp className="size-4" />
    </button>
  );
}
