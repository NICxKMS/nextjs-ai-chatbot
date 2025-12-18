"use server";

/**
 * Tools Module
 * @module new-arch/lib/ai/tools
 *
 * AI tool registry, types, and context utilities for tool execution.
 *
 * @example
 * ```ts
 * import {
 *   registerTool,
 *   getTool,
 *   createToolContext,
 *   type ToolDefinition,
 *   type ToolResult,
 * } from '@/lib/ai/tools';
 *
 * // Register a tool
 * registerTool({
 *   id: 'getWeather',
 *   name: 'Get Weather',
 *   description: 'Get current weather for a location',
 *   inputSchema: z.object({ city: z.string() }),
 *   execute: async (params, context) => {
 *     // Tool implementation
 *   },
 * });
 *
 * // Execute tool with context
 * const context = createToolContext({
 *   session: userSession,
 *   dataStream: streamWriter,
 *   chatId: 'chat-123',
 * });
 *
 * const tool = getTool('getWeather');
 * const result = await tool.execute({ city: 'London' }, context);
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
    // Metadata types
    ToolCapabilities,
    ToolCategory,
    ToolDefinition,
    ToolErrorCode,
    ToolExecutionRecord,
    ToolExecutor,
    // Execution types
    ToolInvocation,
    ToolInvocationStatus,
    ToolMetadata,
    // Definition types
    ToolParameterSchema,
    ToolResult,
    // Result types
    ToolResultBase,
    ToolResultError,
    ToolResultSuccess,
} from "./types";

// ============================================================================
// Type Helper Exports
// ============================================================================

export {
    createErrorResult,
    createSuccessResult,
    isErrorResult,
    isSuccessResult,
} from "./types";

// ============================================================================
// Registry Exports
// ============================================================================

export {
    clearToolRegistry,
    // Configuration
    configureToolRegistry,
    getAllToolMetadata,
    getAllTools,
    // Retrieval
    getTool,
    getToolIds,
    // Metadata
    getToolMetadata,
    getToolRegistryConfig,
    getToolRegistryStats,
    getToolsByCategory,
    getToolsRequiringConfirmation,
    // Utilities
    hasTool,
    isToolRegistryInitialized,
    markToolRegistryInitialized,
    // Registration
    registerTool,
    registerTools,
    // Types
    type ToolRegistryConfig,
    unregisterTool,
    validateToolInput,
} from "./registry";

// ============================================================================
// Context Exports
// ============================================================================

export {
    assertValidToolContext,
    createTestToolContext,
    // Creation
    createToolContext,
    getChatIdFromContext,
    // Utilities
    getUserIdFromContext,
    hasValidSession,
    // Validation
    isValidToolContext,
    withChatId,
    // Transformation
    withDataStream,
    withSession,
} from "./context";
