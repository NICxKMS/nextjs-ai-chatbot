/**
 * AI Workflow Wrappers - Barrel Export
 *
 * Project wrappers for workflow-related AI elements that add:
 * - Plan management with streaming support
 * - Task tracking with collapsible sections
 * - Queue management for messages and todos
 * - Checkpoint markers for conversation branching
 *
 * @module components/ai/workflow
 */

// =============================================================================
// Plan Components
// =============================================================================

export {
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
} from "./plan"

// =============================================================================
// Task Components
// =============================================================================

export {
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
} from "./task"

// =============================================================================
// Queue Components
// =============================================================================

export {
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
} from "./queue"

// =============================================================================
// Checkpoint Components
// =============================================================================

export {
	AICheckpoint,
	AICheckpointIcon,
	type AICheckpointIconProps,
	type AICheckpointProps,
	AICheckpointTrigger,
	type AICheckpointTriggerProps,
} from "./checkpoint"
