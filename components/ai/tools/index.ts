/**
 * AI Tools Wrappers - Barrel Export
 *
 * Project wrappers for tool-related AI elements that add:
 * - Tool call visualization
 * - Confirmation dialogs
 * - Tool registry for custom renderers
 *
 * @module components/ai/tools
 */

// Re-export types from ai-elements for convenience
export type { AIToolProps } from "./call"
// Tool call components
export {
	AIToolCall,
	AIToolCallList,
	type AIToolCallListProps,
	type AIToolCallProps,
	type ToolState,
} from "./call"
export type { AIConfirmationProps } from "./confirmation"
// Confirmation components
export {
	AIConfirmation,
	type AIConfirmationWrapperProps,
	AIToolApproval,
	type AIToolApprovalProps,
} from "./confirmation"
// Tool registry
export {
	AIToolRegistry,
	commonToolPresets,
	createToolRegistry,
	globalToolRegistry,
	registerCommonTools,
	type ToolHandler,
	type ToolRenderer,
	type ToolRendererProps,
	useToolRegistry,
} from "./registry"
