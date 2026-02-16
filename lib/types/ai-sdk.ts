/**
 * AI SDK Type Extensions
 *
 * Extended types for AI SDK tool states beyond the standard types.
 * These support additional tool lifecycle states for confirmation flows.
 *
 * @module lib/types/ai-sdk
 */

/**
 * Extended tool state types that extend the standard AI SDK tool states.
 *
 * Standard states from AI SDK:
 * - input-streaming: Tool input is being streamed
 * - input-available: Tool input is complete and available
 * - output-available: Tool output is available
 * - output-error: Tool execution resulted in an error
 *
 * Extended states for confirmation flows:
 * - approval-requested: Tool requires user approval before execution
 * - approval-responded: User has responded to approval request
 * - output-denied: Tool execution was denied by user
 */
export type ExtendedToolState =
	| "input-streaming"
	| "input-available"
	| "output-available"
	| "output-error"
	| "approval-requested"
	| "approval-responded"
	| "output-denied"
