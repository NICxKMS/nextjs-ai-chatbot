"use server";

/**
 * Tool Types
 * @module new-arch/lib/ai/tools/types
 *
 * Type definitions for AI tool integration including tool definitions,
 * results, and execution context.
 */

import type { z } from "zod";
import type { ToolContext, ToolId } from "../types";

// ============================================================================
// Tool Definition Types
// ============================================================================

/** Tool parameter schema type */
export type ToolParameterSchema = z.ZodType<unknown>;

/** Tool execution function type */
export type ToolExecutor<
    TParams = unknown,
    TResult = unknown,
    TDataStream = unknown,
> = (params: TParams, context: ToolContext<TDataStream>) => Promise<TResult>;

/** Tool definition */
export type ToolDefinition<
    TParams = unknown,
    TResult = unknown,
    TDataStream = unknown,
> = {
    /** Unique tool identifier */
    readonly id: ToolId;
    /** Human-readable tool name */
    readonly name: string;
    /** Tool description for the AI model */
    readonly description: string;
    /** Zod schema for input validation */
    readonly inputSchema: z.ZodType<TParams>;
    /** Tool execution function */
    readonly execute: ToolExecutor<TParams, TResult, TDataStream>;
    /** Whether tool requires user confirmation */
    readonly requiresConfirmation?: boolean;
    /** Tool category for grouping */
    readonly category?: ToolCategory;
    /** Estimated execution time in milliseconds */
    readonly estimatedDurationMs?: number;
};

/** Tool categories for organization */
export type ToolCategory =
    | "weather"
    | "document"
    | "suggestion"
    | "search"
    | "code"
    | "image"
    | "utility";

// ============================================================================
// Tool Result Types
// ============================================================================

/** Base tool result */
export type ToolResultBase = {
    /** Tool execution was successful */
    readonly success: boolean;
    /** Execution duration in milliseconds */
    readonly durationMs?: number;
};

/** Successful tool result */
export type ToolResultSuccess<TData = unknown> = ToolResultBase & {
    readonly success: true;
    /** Result data */
    readonly data: TData;
};

/** Failed tool result */
export type ToolResultError = ToolResultBase & {
    readonly success: false;
    /** Error code */
    readonly errorCode: ToolErrorCode;
    /** Human-readable error message */
    readonly errorMessage: string;
    /** Additional error details */
    readonly errorDetails?: unknown;
};

/** Combined tool result type */
export type ToolResult<TData = unknown> =
    | ToolResultSuccess<TData>
    | ToolResultError;

/** Tool error codes */
export type ToolErrorCode =
    | "validation_error"
    | "execution_error"
    | "timeout_error"
    | "permission_denied"
    | "not_found"
    | "rate_limited"
    | "internal_error";

// ============================================================================
// Tool Execution Types
// ============================================================================

/** Tool invocation request */
export type ToolInvocation = {
    /** Tool to invoke */
    readonly toolId: ToolId;
    /** Tool parameters */
    readonly params: unknown;
    /** Unique invocation ID for tracking */
    readonly invocationId: string;
    /** Timestamp when invocation was requested */
    readonly requestedAt: Date;
};

/** Tool invocation status */
export type ToolInvocationStatus =
    | "pending"
    | "executing"
    | "completed"
    | "failed"
    | "cancelled";

/** Tool execution record */
export type ToolExecutionRecord = {
    /** Original invocation */
    readonly invocation: ToolInvocation;
    /** Current status */
    readonly status: ToolInvocationStatus;
    /** Start time */
    readonly startedAt?: Date;
    /** End time */
    readonly completedAt?: Date;
    /** Result (if completed) */
    readonly result?: ToolResult;
};

// ============================================================================
// Tool Metadata Types
// ============================================================================

/** Tool capability flags */
export type ToolCapabilities = {
    /** Tool can stream partial results */
    readonly supportsStreaming: boolean;
    /** Tool can be cancelled mid-execution */
    readonly supportsCancellation: boolean;
    /** Tool execution is idempotent */
    readonly isIdempotent: boolean;
    /** Tool has side effects */
    readonly hasSideEffects: boolean;
};

/** Tool metadata for discovery */
export type ToolMetadata = {
    /** Tool identifier */
    readonly id: ToolId;
    /** Tool name */
    readonly name: string;
    /** Tool description */
    readonly description: string;
    /** Tool category */
    readonly category?: ToolCategory;
    /** Tool capabilities */
    readonly capabilities: ToolCapabilities;
    /** Example input for documentation */
    readonly exampleInput?: unknown;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a successful tool result
 */
export function createSuccessResult<TData>(
    data: TData,
    durationMs?: number
): ToolResultSuccess<TData> {
    return {
        success: true,
        data,
        durationMs,
    };
}

/**
 * Create an error tool result
 */
export function createErrorResult(
    errorCode: ToolErrorCode,
    errorMessage: string,
    errorDetails?: unknown,
    durationMs?: number
): ToolResultError {
    return {
        success: false,
        errorCode,
        errorMessage,
        errorDetails,
        durationMs,
    };
}

/**
 * Check if result is successful
 */
export function isSuccessResult<TData>(
    result: ToolResult<TData>
): result is ToolResultSuccess<TData> {
    return result.success === true;
}

/**
 * Check if result is an error
 */
export function isErrorResult(result: ToolResult): result is ToolResultError {
    return result.success === false;
}
