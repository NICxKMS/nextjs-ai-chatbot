/**
 * Extended AI SDK types for forward-compatibility with v6 features.
 *
 * AI SDK v5 defines state as:
 *   'input-streaming' | 'input-available' | 'output-available' | 'output-error'
 *
 * AI SDK v6 adds approval workflow states:
 *   'approval-requested' | 'approval-responded' | 'output-denied'
 *
 * We define extended types to support both without @ts-expect-error suppressions.
 */
import type { ToolUIPart as SDKToolUIPart } from "ai";

/**
 * Extended tool state including v6 approval workflow states.
 * Use this instead of ToolUIPart["state"] for forward compatibility.
 */
export type ExtendedToolState =
    | SDKToolUIPart["state"]
    | "approval-requested"
    | "approval-responded"
    | "output-denied";

/**
 * Re-export original ToolUIPart for convenience.
 */
export type ToolUIPart = SDKToolUIPart;

/**
 * Type guard for checking if a state is an approval-related state (v6 only).
 */
export function isApprovalState(
    state: ExtendedToolState
): state is "approval-requested" | "approval-responded" | "output-denied" {
    return (
        state === "approval-requested" ||
        state === "approval-responded" ||
        state === "output-denied"
    );
}

/**
 * Type guard for checking if a state indicates completion (output available or error).
 */
export function isCompletedState(
    state: ExtendedToolState
): state is "output-available" | "output-error" | "output-denied" {
    return (
        state === "output-available" ||
        state === "output-error" ||
        state === "output-denied"
    );
}

/**
 * Type guard for checking if a state indicates pending/streaming.
 */
export function isPendingState(
    state: ExtendedToolState
): state is "input-streaming" | "input-available" | "approval-requested" {
    return (
        state === "input-streaming" ||
        state === "input-available" ||
        state === "approval-requested"
    );
}
