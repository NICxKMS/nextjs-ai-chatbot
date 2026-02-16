/**
 * AI Tool Registry Component
 *
 * Registry for managing custom tool renderers and handlers.
 * Provides a centralized way to register and retrieve tool components.
 *
 * @module components/ai/tools/registry
 */

"use client"

import type { ReactNode } from "react"
import type { ToolState } from "./call"

/**
 * Tool renderer function type
 */
export type ToolRenderer = (props: ToolRendererProps) => ReactNode

/**
 * Props passed to tool renderers
 */
export interface ToolRendererProps {
	/** Tool call ID */
	toolCallId: string
	/** Tool type/name */
	toolType: string
	/** Current state */
	state: ToolState
	/** Input parameters */
	input?: unknown
	/** Output result */
	output?: unknown
	/** Error text if failed */
	errorText?: string
}

/**
 * Tool handler configuration
 */
export interface ToolHandler {
	/** Tool name/type */
	name: string
	/** Display title */
	title?: string
	/** Custom renderer */
	renderer?: ToolRenderer
	/** Whether to auto-expand */
	defaultOpen?: boolean
	/** Whether tool requires approval */
	requiresApproval?: boolean
}

/**
 * Tool Registry class for managing tool handlers
 */
export class AIToolRegistry {
	private handlers: Map<string, ToolHandler> = new Map()

	/**
	 * Register a tool handler
	 */
	register(handler: ToolHandler): void {
		this.handlers.set(handler.name, handler)
	}

	/**
	 * Register multiple tool handlers
	 */
	registerAll(handlers: ToolHandler[]): void {
		for (const handler of handlers) {
			this.register(handler)
		}
	}

	/**
	 * Get a tool handler by name
	 */
	get(name: string): ToolHandler | undefined {
		return this.handlers.get(name)
	}

	/**
	 * Check if a tool is registered
	 */
	has(name: string): boolean {
		return this.handlers.has(name)
	}

	/**
	 * Get all registered tool names
	 */
	getNames(): string[] {
		return Array.from(this.handlers.keys())
	}

	/**
	 * Get renderer for a tool
	 */
	getRenderer(name: string): ToolRenderer | undefined {
		return this.handlers.get(name)?.renderer
	}

	/**
	 * Get title for a tool
	 */
	getTitle(name: string): string {
		return this.handlers.get(name)?.title ?? name
	}

	/**
	 * Check if tool requires approval
	 */
	requiresApproval(name: string): boolean {
		return this.handlers.get(name)?.requiresApproval ?? false
	}

	/**
	 * Remove a tool handler
	 */
	remove(name: string): boolean {
		return this.handlers.delete(name)
	}

	/**
	 * Clear all handlers
	 */
	clear(): void {
		this.handlers.clear()
	}
}

/**
 * Global tool registry instance
 */
export const globalToolRegistry = new AIToolRegistry()

/**
 * Hook to access the tool registry
 */
export const useToolRegistry = () => {
	return globalToolRegistry
}

/**
 * Props for the ToolRegistryProvider component
 */
export interface ToolRegistryProviderProps {
	/** Tool handlers to register */
	tools?: ToolHandler[]
	/** Children to render */
	children: ReactNode
}

/**
 * Create a scoped tool registry with pre-registered tools
 */
export const createToolRegistry = (tools: ToolHandler[]): AIToolRegistry => {
	const registry = new AIToolRegistry()
	registry.registerAll(tools)
	return registry
}

/**
 * Common tool presets
 */
export const commonToolPresets: Record<string, ToolHandler> = {
	"get-weather": {
		name: "get-weather",
		title: "Get Weather",
		defaultOpen: true,
	},
	"create-document": {
		name: "create-document",
		title: "Create Document",
		defaultOpen: true,
		requiresApproval: false,
	},
	"update-document": {
		name: "update-document",
		title: "Update Document",
		defaultOpen: true,
	},
	"request-suggestions": {
		name: "request-suggestions",
		title: "Request Suggestions",
		defaultOpen: true,
	},
}

/**
 * Register common tools to the global registry
 */
export const registerCommonTools = (): void => {
	globalToolRegistry.registerAll(Object.values(commonToolPresets))
}
