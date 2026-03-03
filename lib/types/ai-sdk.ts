/**
 * Extended tool invocation states used by AI element components.
 *
 * The AI SDK v5 ToolUIPart provides: input-streaming, input-available,
 * output-available, output-error. We extend with approval/denial states
 * for future tool confirmation flows.
 */
export type ExtendedToolState =
	| "input-streaming"
	| "input-available"
	| "approval-requested"
	| "approval-responded"
	| "output-available"
	| "output-error"
	| "output-denied"
