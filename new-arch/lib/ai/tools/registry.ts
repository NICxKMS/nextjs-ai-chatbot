"use server";

/**
 * Tool Registry
 * @module new-arch/lib/ai/tools/registry
 *
 * Central registry for AI tools with lookup, validation, and execution support.
 */

import type { ToolId } from "../types";
import type {
    ToolCapabilities,
    ToolCategory,
    ToolDefinition,
    ToolMetadata,
} from "./types";

// ============================================================================
// Registry Types
// ============================================================================

/** Tool registry configuration */
export type ToolRegistryConfig = {
    /** Enable strict validation of tool inputs */
    readonly strictValidation: boolean;
    /** Default execution timeout in milliseconds */
    readonly defaultTimeoutMs: number;
    /** Enable execution logging */
    readonly enableLogging: boolean;
};

/** Registry state */
type RegistryState = {
    tools: Map<ToolId, ToolDefinition<any, any, any>>;
    isInitialized: boolean;
};

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_REGISTRY_CONFIG: ToolRegistryConfig = {
    strictValidation: true,
    defaultTimeoutMs: 30_000, // 30 seconds
    enableLogging: false,
};

/** Default tool capabilities */
const DEFAULT_CAPABILITIES: ToolCapabilities = {
    supportsStreaming: false,
    supportsCancellation: false,
    isIdempotent: false,
    hasSideEffects: true,
};

// ============================================================================
// Registry Implementation
// ============================================================================

/** Internal registry state */
const state: RegistryState = {
    tools: new Map(),
    isInitialized: false,
};

/** Current configuration */
let config: ToolRegistryConfig = { ...DEFAULT_REGISTRY_CONFIG };

/**
 * Configure the tool registry
 */
export function configureToolRegistry(
    newConfig: Partial<ToolRegistryConfig>
): void {
    config = { ...config, ...newConfig };
}

/**
 * Register a tool in the registry
 */
export function registerTool<TParams, TResult, TDataStream>(
    tool: ToolDefinition<TParams, TResult, TDataStream>
): void {
    state.tools.set(tool.id, tool);
}

/**
 * Register multiple tools at once
 */
export function registerTools(
    tools: readonly ToolDefinition<any, any, any>[]
): void {
    for (const tool of tools) {
        registerTool(tool);
    }
}

/**
 * Unregister a tool from the registry
 */
export function unregisterTool(toolId: ToolId): boolean {
    return state.tools.delete(toolId);
}

/**
 * Get a tool by ID
 */
export function getTool<
    TParams = unknown,
    TResult = unknown,
    TDataStream = unknown,
>(toolId: ToolId): ToolDefinition<TParams, TResult, TDataStream> | undefined {
    return state.tools.get(toolId) as
        | ToolDefinition<TParams, TResult, TDataStream>
        | undefined;
}

/**
 * Get all registered tools
 */
export function getAllTools(): readonly ToolDefinition[] {
    return Array.from(state.tools.values());
}

/**
 * Get tools by category
 */
export function getToolsByCategory(
    category: ToolCategory
): readonly ToolDefinition[] {
    return Array.from(state.tools.values()).filter(
        (tool) => tool.category === category
    );
}

/**
 * Get all tool IDs
 */
export function getToolIds(): readonly ToolId[] {
    return Array.from(state.tools.keys());
}

/**
 * Check if a tool exists in the registry
 */
export function hasTool(toolId: ToolId): boolean {
    return state.tools.has(toolId);
}

/**
 * Get tool metadata for discovery
 */
export function getToolMetadata(toolId: ToolId): ToolMetadata | undefined {
    const tool = state.tools.get(toolId);
    if (!tool) {
        return;
    }

    return {
        id: tool.id,
        name: tool.name,
        description: tool.description,
        category: tool.category,
        capabilities: DEFAULT_CAPABILITIES,
    };
}

/**
 * Get all tool metadata
 */
export function getAllToolMetadata(): readonly ToolMetadata[] {
    return Array.from(state.tools.values()).map((tool) => ({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        category: tool.category,
        capabilities: DEFAULT_CAPABILITIES,
    }));
}

/**
 * Get tools that require confirmation
 */
export function getToolsRequiringConfirmation(): readonly ToolDefinition[] {
    return Array.from(state.tools.values()).filter(
        (tool) => tool.requiresConfirmation === true
    );
}

/**
 * Validate tool input against schema
 */
export function validateToolInput<TParams>(
    toolId: ToolId,
    input: unknown
): { valid: true; data: TParams } | { valid: false; errors: string[] } {
    const tool = state.tools.get(toolId);
    if (!tool) {
        return { valid: false, errors: [`Tool "${toolId}" not found`] };
    }

    const result = tool.inputSchema.safeParse(input);
    if (result.success) {
        return { valid: true, data: result.data as TParams };
    }

    const errors = result.error.errors.map(
        (e) => `${e.path.join(".")}: ${e.message}`
    );
    return { valid: false, errors };
}

/**
 * Get registry statistics
 */
export function getToolRegistryStats(): {
    totalTools: number;
    byCategory: Record<string, number>;
    requireConfirmation: number;
} {
    const tools = Array.from(state.tools.values());
    const byCategory: Record<string, number> = {};

    for (const tool of tools) {
        const category = tool.category || "uncategorized";
        byCategory[category] = (byCategory[category] || 0) + 1;
    }

    return {
        totalTools: tools.length,
        byCategory,
        requireConfirmation: tools.filter((t) => t.requiresConfirmation).length,
    };
}

/**
 * Clear all tools from the registry
 */
export function clearToolRegistry(): void {
    state.tools.clear();
    state.isInitialized = false;
}

/**
 * Check if registry is initialized
 */
export function isToolRegistryInitialized(): boolean {
    return state.isInitialized;
}

/**
 * Mark registry as initialized
 */
export function markToolRegistryInitialized(): void {
    state.isInitialized = true;
}

/**
 * Get current registry configuration
 */
export function getToolRegistryConfig(): Readonly<ToolRegistryConfig> {
    return { ...config };
}
