/**
 * AI Wrappers - Main Barrel Export
 *
 * Project wrappers for AI elements that compose primitives into
 * higher-level abstractions with project-specific logic.
 *
 * Architecture:
 * - Layer 1: ai-elements/ - Read-only SDK primitives (NEVER MODIFY)
 * - Layer 2: ai/ - Project wrappers (THIS DIRECTORY)
 *
 * @module components/ai
 */

// =============================================================================
// Chat Components
// =============================================================================

export {
	// Input components
	AIChatInput,
	type AIChatInputProps,
	// Conversation components
	AIConversation,
	type AIConversationWrapperProps,
	// Message components
	AIMessage,
	type AIMessageWrapperProps,
	AIThinkingMessage,
	type Attachment,
	type MessageVote,
	useConversationScroll,
} from "./chat"

// =============================================================================
// Reasoning Components
// =============================================================================

export {
	AIReasoningStep,
	type AIReasoningStepProps,
	// Reasoning steps components
	AIReasoningSteps,
	type AIReasoningStepsProps,
	// Thinking components
	AIThinking,
	AIThinkingIndicator,
	type AIThinkingIndicatorProps,
	type AIThinkingProps,
	type ReasoningStep,
	type ReasoningStepStatus,
} from "./reasoning"

// =============================================================================
// Tool Components
// =============================================================================

export {
	// Confirmation components
	AIConfirmation,
	type AIConfirmationWrapperProps,
	AIToolApproval,
	type AIToolApprovalProps,
	// Tool call components
	AIToolCall,
	AIToolCallList,
	type AIToolCallListProps,
	type AIToolCallProps,
	// Tool registry
	AIToolRegistry,
	commonToolPresets,
	createToolRegistry,
	globalToolRegistry,
	registerCommonTools,
	type ToolHandler,
	type ToolRenderer,
	type ToolRendererProps,
	type ToolState,
	useToolRegistry,
} from "./tools"

// =============================================================================
// Content Components
// =============================================================================

export {
	// Web preview components
	AIArtifactPreview,
	type AIArtifactPreviewProps,
	// Code block components
	AICodeBlock,
	AICodeBlockCopyButton,
	type AICodeBlockCopyButtonProps,
	type AICodeBlockWrapperProps,
	AICodePreview,
	type AICodePreviewProps,
	// Image components
	AIImage,
	AIImageGallery,
	type AIImageGalleryProps,
	type AIImageWrapperProps,
	AIWebPreview,
	type AIWebPreviewWrapperProps,
} from "./content"

// =============================================================================
// Workflow Components
// =============================================================================

export {
	// Checkpoint components
	AICheckpoint,
	AICheckpointIcon,
	type AICheckpointIconProps,
	type AICheckpointProps,
	AICheckpointTrigger,
	type AICheckpointTriggerProps,
	// Plan components
	AIPlan,
	AIPlanAction,
	type AIPlanActionProps,
	AIPlanContent,
	type AIPlanContentProps,
	AIPlanDescription,
	type AIPlanDescriptionProps,
	AIPlanFooter,
	type AIPlanFooterProps,
	AIPlanHeader,
	type AIPlanHeaderProps,
	type AIPlanProps,
	AIPlanTitle,
	type AIPlanTitleProps,
	AIPlanTrigger,
	type AIPlanTriggerProps,
	// Queue components
	AIQueue,
	AIQueueItem,
	AIQueueItemAction,
	type AIQueueItemActionProps,
	AIQueueItemActions,
	type AIQueueItemActionsProps,
	AIQueueItemAttachment,
	type AIQueueItemAttachmentProps,
	AIQueueItemContent,
	type AIQueueItemContentProps,
	AIQueueItemDescription,
	type AIQueueItemDescriptionProps,
	AIQueueItemFile,
	type AIQueueItemFileProps,
	AIQueueItemImage,
	type AIQueueItemImageProps,
	AIQueueItemIndicator,
	type AIQueueItemIndicatorProps,
	type AIQueueItemProps,
	AIQueueList,
	type AIQueueListProps,
	type AIQueueMessage,
	type AIQueueMessagePart,
	type AIQueueProps,
	AIQueueSection,
	AIQueueSectionContent,
	type AIQueueSectionContentProps,
	AIQueueSectionLabel,
	type AIQueueSectionLabelProps,
	type AIQueueSectionProps,
	AIQueueSectionTrigger,
	type AIQueueSectionTriggerProps,
	type AIQueueTodo,
	// Task components
	AITask,
	AITaskContent,
	type AITaskContentProps,
	AITaskItem,
	AITaskItemFile,
	type AITaskItemFileProps,
	type AITaskItemProps,
	type AITaskProps,
	AITaskTrigger,
	type AITaskTriggerProps,
} from "./workflow"

// =============================================================================
// Utility Components
// =============================================================================

export {
	// Loader components
	AILoader,
	type AILoaderProps,
	// Shimmer components
	AIShimmer,
	type AIShimmerProps,
	// Suggestion components
	AISuggestion,
	type AISuggestionProps,
	AISuggestions,
	type AISuggestionsProps,
} from "./utilities"
