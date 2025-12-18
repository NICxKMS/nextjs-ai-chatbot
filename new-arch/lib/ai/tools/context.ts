"use server";

/**
 * Tool Context
 * @module new-arch/lib/ai/tools/context
 *
 * Factory functions for creating tool execution contexts with
 * session, data stream, and chat context.
 */

import type { AppSession } from "../../auth/types";
import type { ToolContext } from "../types";

// ============================================================================
// Context Creation
// ============================================================================

/**
 * Create a tool execution context
 *
 * @param session - Current user session
 * @param dataStream - Data stream writer for real-time updates
 * @param chatId - Current chat identifier
 * @returns Tool context for injection into tool executors
 *
 * @example
 * ```ts
 * const context = createToolContext({
 *   session: userSession,
 *   dataStream: streamWriter,
 *   chatId: 'chat-123',
 * });
 *
 * const result = await weatherTool.execute(params, context);
 * ```
 */
export function createToolContext<TDataStream = unknown>(options: {
    session: AppSession;
    dataStream: TDataStream;
    chatId: string;
}): ToolContext<TDataStream> {
    return {
        session: options.session,
        dataStream: options.dataStream,
        chatId: options.chatId,
    };
}

// ============================================================================
// Context Validation
// ============================================================================

/**
 * Validate that a tool context has all required fields
 */
export function isValidToolContext(
    context: unknown
): context is ToolContext<unknown> {
    if (!context || typeof context !== "object") {
        return false;
    }

    const ctx = context as Record<string, unknown>;
    return (
        "session" in ctx &&
        "dataStream" in ctx &&
        "chatId" in ctx &&
        typeof ctx.chatId === "string"
    );
}

/**
 * Assert that context is valid, throw if not
 */
export function assertValidToolContext(
    context: unknown
): asserts context is ToolContext<unknown> {
    if (!isValidToolContext(context)) {
        throw new Error(
            "Invalid tool context: missing required fields (session, dataStream, chatId)"
        );
    }
}

// ============================================================================
// Context Utilities
// ============================================================================

/**
 * Create a minimal context for testing
 */
export function createTestToolContext<TDataStream = unknown>(
    overrides: Partial<ToolContext<TDataStream>> & { chatId: string }
): ToolContext<TDataStream> {
    return {
        session: overrides.session ?? ({} as AppSession),
        dataStream: overrides.dataStream ?? (undefined as TDataStream),
        chatId: overrides.chatId,
    };
}

/**
 * Extract user ID from tool context
 */
export function getUserIdFromContext(context: ToolContext<unknown>): string {
    return context.session.user.id;
}

/**
 * Extract chat ID from tool context
 */
export function getChatIdFromContext(context: ToolContext<unknown>): string {
    return context.chatId;
}

/**
 * Check if context has a valid session
 */
export function hasValidSession(context: ToolContext<unknown>): boolean {
    return (
        context.session !== null &&
        context.session.user !== null &&
        typeof context.session.user.id === "string"
    );
}

// ============================================================================
// Context Transformation
// ============================================================================

/**
 * Create a new context with updated data stream
 */
export function withDataStream<TOld, TNew>(
    context: ToolContext<TOld>,
    newDataStream: TNew
): ToolContext<TNew> {
    return {
        ...context,
        dataStream: newDataStream,
    };
}

/**
 * Create a new context with updated chat ID
 */
export function withChatId<TDataStream>(
    context: ToolContext<TDataStream>,
    newChatId: string
): ToolContext<TDataStream> {
    return {
        ...context,
        chatId: newChatId,
    };
}

/**
 * Create a new context with updated session
 */
export function withSession<TDataStream>(
    context: ToolContext<TDataStream>,
    newSession: AppSession
): ToolContext<TDataStream> {
    return {
        ...context,
        session: newSession,
    };
}
