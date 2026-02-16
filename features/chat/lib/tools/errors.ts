/**
 * Tool Execution Error
 *
 * Specialized error class for AI tool execution failures.
 * Provides structured error information for debugging and user feedback.
 *
 * @module features/chat/lib/tools/errors
 */

import { AppError } from "@/lib/errors"

/**
 * Error codes specific to tool execution
 */
export const ToolErrorCodes = {
	/** Tool execution timed out */
	TIMEOUT: "TOOL_TIMEOUT",
	/** Tool execution failed after retries */
	EXECUTION_FAILED: "TOOL_EXECUTION_FAILED",
	/** Invalid tool input */
	INVALID_INPUT: "TOOL_INVALID_INPUT",
	/** Tool not found */
	NOT_FOUND: "TOOL_NOT_FOUND",
	/** External service unavailable */
	SERVICE_UNAVAILABLE: "TOOL_SERVICE_UNAVAILABLE",
	/** Document/artifact not found */
	DOCUMENT_NOT_FOUND: "TOOL_DOCUMENT_NOT_FOUND",
	/** No handler for artifact kind */
	NO_HANDLER: "TOOL_NO_HANDLER",
} as const

export type ToolErrorCode = (typeof ToolErrorCodes)[keyof typeof ToolErrorCodes]

/**
 * Error thrown when a tool execution fails.
 *
 * @example
 * ```typescript
 * throw new ToolExecutionError(
 *   'weather',
 *   ToolErrorCodes.TIMEOUT,
 *   'Weather API request timed out after 30s'
 * );
 * ```
 */
export class ToolExecutionError extends AppError {
	/** Name of the tool that failed */
	readonly toolName: string

	/** Number of retry attempts made */
	readonly attempts: number

	/** Original error if wrapped */
	readonly originalError: Error | undefined

	constructor(
		toolName: string,
		code: ToolErrorCode | string,
		message: string,
		options?: {
			attempts?: number
			originalError?: Error
			statusCode?: number
			details?: Record<string, unknown>
		},
	) {
		super(code, message, options?.statusCode ?? 500, options?.details)
		this.name = "ToolExecutionError"
		this.toolName = toolName
		this.attempts = options?.attempts ?? 1
		this.originalError = options?.originalError ?? undefined
	}

	/**
	 * Creates a timeout error for a tool
	 */
	static timeout(
		toolName: string,
		timeoutMs: number,
		attempts = 1,
	): ToolExecutionError {
		return new ToolExecutionError(
			toolName,
			ToolErrorCodes.TIMEOUT,
			[
				`Tool '${toolName}' execution timed out after ${timeoutMs}ms`,
				`Attempts: ${attempts}`,
			].join(". "),
			{
				attempts,
				statusCode: 408,
				details: { timeoutMs, toolName },
			},
		)
	}

	/**
	 * Creates an execution failed error
	 */
	static executionFailed(
		toolName: string,
		reason: string,
		options?: {
			attempts?: number
			originalError?: Error
			details?: Record<string, unknown>
		},
	): ToolExecutionError {
		return new ToolExecutionError(
			toolName,
			ToolErrorCodes.EXECUTION_FAILED,
			`Tool '${toolName}' execution failed: ${reason}`,
			{
				...options,
				statusCode: 500,
			},
		)
	}

	/**
	 * Creates a document not found error
	 */
	static documentNotFound(
		toolName: string,
		documentId: string,
	): ToolExecutionError {
		return new ToolExecutionError(
			toolName,
			ToolErrorCodes.DOCUMENT_NOT_FOUND,
			`Document '${documentId}' not found for tool '${toolName}'`,
			{
				statusCode: 404,
				details: { documentId, toolName },
			},
		)
	}

	/**
	 * Creates a no handler error
	 */
	static noHandler(toolName: string, kind: string): ToolExecutionError {
		return new ToolExecutionError(
			toolName,
			ToolErrorCodes.NO_HANDLER,
			`No handler found for artifact kind '${kind}' in tool '${toolName}'`,
			{
				statusCode: 400,
				details: { kind, toolName },
			},
		)
	}

	/**
	 * Creates a service unavailable error
	 */
	static serviceUnavailable(
		toolName: string,
		service: string,
		originalError?: Error,
	): ToolExecutionError {
		return new ToolExecutionError(
			toolName,
			ToolErrorCodes.SERVICE_UNAVAILABLE,
			`Service '${service}' unavailable for tool '${toolName}'`,
			originalError
				? {
						statusCode: 503,
						originalError,
						details: { service, toolName },
					}
				: {
						statusCode: 503,
						details: { service, toolName },
					},
		)
	}
}

/**
 * Type guard for ToolExecutionError
 */
export function isToolExecutionError(
	error: unknown,
): error is ToolExecutionError {
	return error instanceof ToolExecutionError
}
