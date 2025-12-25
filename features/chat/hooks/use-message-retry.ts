"use client";

/**
 * Message Retry Hook
 *
 * Provides retry functionality for failed message sends.
 *
 * @module features/chat/hooks/use-message-retry
 */

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/utils/logger";

// =============================================================================
// TYPES
// =============================================================================

export interface RetryState {
    /** ID of the message being retried */
    messageId: string | null;
    /** Current retry attempt number */
    attempt: number;
    /** Whether a retry is in progress */
    isRetrying: boolean;
    /** Last error that occurred */
    lastError: Error | null;
}

export interface UseMessageRetryOptions {
    /** Maximum number of retry attempts (default: 3) */
    maxRetries?: number;
    /** Initial delay between retries in ms (default: 1000) */
    initialDelay?: number;
    /** Backoff multiplier (default: 2) */
    backoffFactor?: number;
    /** Callback when retry succeeds */
    onRetrySuccess?: () => void;
    /** Callback when all retries fail */
    onRetryFailed?: (error: Error) => void;
}

export interface UseMessageRetryReturn {
    /** Current retry state */
    retryState: RetryState;
    /** Retry a failed message send */
    retryMessage: (
        messageId: string,
        sendFn: () => Promise<void>
    ) => Promise<boolean>;
    /** Cancel an ongoing retry */
    cancelRetry: () => void;
    /** Reset retry state */
    resetRetryState: () => void;
    /** Check if a message can be retried */
    canRetry: (messageId: string) => boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_OPTIONS: Required<
    Omit<UseMessageRetryOptions, "onRetrySuccess" | "onRetryFailed">
> = {
    maxRetries: 3,
    initialDelay: 1000,
    backoffFactor: 2,
};

const INITIAL_RETRY_STATE: RetryState = {
    messageId: null,
    attempt: 0,
    isRetrying: false,
    lastError: null,
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for retrying failed message sends with exponential backoff.
 *
 * Features:
 * - Exponential backoff between retries
 * - Cancellation support
 * - Progress tracking
 * - Toast notifications
 *
 * @param options - Configuration options
 * @returns Retry utilities
 *
 * @example
 * ```tsx
 * const { retryState, retryMessage, cancelRetry } = useMessageRetry({
 *   onRetrySuccess: () => console.log('Message sent!'),
 *   onRetryFailed: (error) => console.error('Failed:', error),
 * });
 *
 * const handleRetry = async () => {
 *   const success = await retryMessage(failedMessageId, async () => {
 *     await sendMessage(messageContent);
 *   });
 * };
 * ```
 */
export function useMessageRetry(
    options: UseMessageRetryOptions = {}
): UseMessageRetryReturn {
    const {
        maxRetries = DEFAULT_OPTIONS.maxRetries,
        initialDelay = DEFAULT_OPTIONS.initialDelay,
        backoffFactor = DEFAULT_OPTIONS.backoffFactor,
        onRetrySuccess,
        onRetryFailed,
    } = options;

    const [retryState, setRetryState] =
        useState<RetryState>(INITIAL_RETRY_STATE);
    const abortControllerRef = useRef<AbortController | null>(null);
    const failedAttemptsRef = useRef<Map<string, number>>(new Map());

    // Calculate delay with exponential backoff
    const getDelay = useCallback(
        (attempt: number): number => {
            const delay = initialDelay * backoffFactor ** attempt;
            // Add jitter (±25%)
            const jitter = delay * 0.25 * (Math.random() * 2 - 1);
            return Math.round(delay + jitter);
        },
        [initialDelay, backoffFactor]
    );

    // Sleep with abort support
    const sleep = useCallback(
        (ms: number, signal: AbortSignal): Promise<void> =>
            new Promise((resolve, reject) => {
                if (signal.aborted) {
                    reject(new DOMException("Aborted", "AbortError"));
                    return;
                }

                const timeoutId = setTimeout(resolve, ms);
                signal.addEventListener("abort", () => {
                    clearTimeout(timeoutId);
                    reject(new DOMException("Aborted", "AbortError"));
                });
            }),
        []
    );

    // Retry a message send
    const retryMessage = useCallback(
        async (
            messageId: string,
            sendFn: () => Promise<void>
        ): Promise<boolean> => {
            // Cancel any existing retry
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            const controller = new AbortController();
            abortControllerRef.current = controller;

            // Track failed attempts for this message
            const currentAttempts =
                failedAttemptsRef.current.get(messageId) ?? 0;

            if (currentAttempts >= maxRetries) {
                toast.error(
                    "Maximum retries reached. Please try sending a new message."
                );
                return false;
            }

            setRetryState({
                messageId,
                attempt: currentAttempts + 1,
                isRetrying: true,
                lastError: null,
            });

            let attempt = currentAttempts;

            while (attempt < maxRetries) {
                try {
                    // Check if aborted
                    if (controller.signal.aborted) {
                        throw new DOMException("Aborted", "AbortError");
                    }

                    // Attempt to send
                    await sendFn();

                    // Success!
                    setRetryState(INITIAL_RETRY_STATE);
                    failedAttemptsRef.current.delete(messageId);
                    toast.success("Message sent successfully!");
                    onRetrySuccess?.();
                    return true;
                } catch (error) {
                    // Don't retry on abort
                    if (
                        error instanceof DOMException &&
                        error.name === "AbortError"
                    ) {
                        setRetryState({
                            messageId,
                            attempt,
                            isRetrying: false,
                            lastError: error,
                        });
                        return false;
                    }

                    const err =
                        error instanceof Error
                            ? error
                            : new Error(String(error));
                    attempt++;
                    failedAttemptsRef.current.set(messageId, attempt);

                    setRetryState({
                        messageId,
                        attempt,
                        isRetrying: true,
                        lastError: err,
                    });

                    if (attempt >= maxRetries) {
                        // All retries failed
                        setRetryState({
                            messageId,
                            attempt,
                            isRetrying: false,
                            lastError: err,
                        });
                        toast.error(
                            "Failed to send message after multiple attempts."
                        );
                        onRetryFailed?.(err);
                        return false;
                    }

                    // Wait before next retry
                    const delay = getDelay(attempt - 1);
                    toast.info(
                        `Retrying in ${Math.round(delay / 1000)}s... (${attempt}/${maxRetries})`
                    );

                    try {
                        await sleep(delay, controller.signal);
                    } catch (sleepError) {
                        // Aborted during sleep - log for visibility
                        logger.warn("Message retry aborted during sleep", {
                            operation: "messageRetry",
                            messageId,
                            attempt,
                            error:
                                sleepError instanceof Error
                                    ? sleepError.message
                                    : "Unknown error",
                        });
                        setRetryState({
                            messageId,
                            attempt,
                            isRetrying: false,
                            lastError: err,
                        });
                        return false;
                    }
                }
            }

            return false;
        },
        [maxRetries, getDelay, sleep, onRetrySuccess, onRetryFailed]
    );

    // Cancel ongoing retry
    const cancelRetry = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setRetryState((prev) => ({
            ...prev,
            isRetrying: false,
        }));
    }, []);

    // Reset retry state
    const resetRetryState = useCallback(() => {
        cancelRetry();
        setRetryState(INITIAL_RETRY_STATE);
        failedAttemptsRef.current.clear();
    }, [cancelRetry]);

    // Check if a message can be retried
    const canRetry = useCallback(
        (messageId: string): boolean => {
            const attempts = failedAttemptsRef.current.get(messageId) ?? 0;
            return attempts < maxRetries;
        },
        [maxRetries]
    );

    return {
        retryState,
        retryMessage,
        cancelRetry,
        resetRetryState,
        canRetry,
    };
}
