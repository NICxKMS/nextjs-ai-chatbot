/**
 * AIQueue Wrapper Component
 *
 * Project wrapper for Queue primitive that adds:
 * - Message queue management
 * - Todo list tracking
 * - Consistent project styling
 *
 * @module components/ai/workflow/queue
 */

"use client"

import type { ComponentProps } from "react"
import {
	Queue,
	QueueItem,
	QueueItemAction,
	QueueItemActions,
	QueueItemAttachment,
	QueueItemContent,
	QueueItemDescription,
	QueueItemFile,
	QueueItemImage,
	QueueItemIndicator,
	QueueList,
	type QueueMessage,
	type QueueMessagePart,
	QueueSection,
	QueueSectionContent,
	QueueSectionLabel,
	QueueSectionTrigger,
	type QueueTodo,
} from "@/components/ai-elements/queue"

// =============================================================================
// Type Exports
// =============================================================================

export type AIQueueMessagePart = QueueMessagePart
export type AIQueueMessage = QueueMessage
export type AIQueueTodo = QueueTodo

// =============================================================================
// Re-exports with AI Prefix
// =============================================================================

export type AIQueueProps = ComponentProps<typeof Queue>

/**
 * AIQueue - Root queue container.
 * Wraps Queue primitive with project defaults.
 */
export const AIQueue = Queue

export type AIQueueItemProps = ComponentProps<typeof QueueItem>

/**
 * AIQueueItem - Individual queue item component.
 */
export const AIQueueItem = QueueItem

export type AIQueueItemIndicatorProps = ComponentProps<
	typeof QueueItemIndicator
>

/**
 * AIQueueItemIndicator - Queue item status indicator.
 */
export const AIQueueItemIndicator = QueueItemIndicator

export type AIQueueItemContentProps = ComponentProps<typeof QueueItemContent>

/**
 * AIQueueItemContent - Queue item content text.
 */
export const AIQueueItemContent = QueueItemContent

export type AIQueueItemDescriptionProps = ComponentProps<
	typeof QueueItemDescription
>

/**
 * AIQueueItemDescription - Queue item description text.
 */
export const AIQueueItemDescription = QueueItemDescription

export type AIQueueItemActionsProps = ComponentProps<typeof QueueItemActions>

/**
 * AIQueueItemActions - Container for queue item actions.
 */
export const AIQueueItemActions = QueueItemActions

export type AIQueueItemActionProps = ComponentProps<typeof QueueItemAction>

/**
 * AIQueueItemAction - Individual queue item action button.
 */
export const AIQueueItemAction = QueueItemAction

export type AIQueueItemAttachmentProps = ComponentProps<
	typeof QueueItemAttachment
>

/**
 * AIQueueItemAttachment - Container for queue item attachments.
 */
export const AIQueueItemAttachment = QueueItemAttachment

export type AIQueueItemImageProps = ComponentProps<typeof QueueItemImage>

/**
 * AIQueueItemImage - Queue item image attachment preview.
 */
export const AIQueueItemImage = QueueItemImage

export type AIQueueItemFileProps = ComponentProps<typeof QueueItemFile>

/**
 * AIQueueItemFile - Queue item file attachment display.
 */
export const AIQueueItemFile = QueueItemFile

export type AIQueueListProps = ComponentProps<typeof QueueList>

/**
 * AIQueueList - Scrollable queue list container.
 */
export const AIQueueList = QueueList

export type AIQueueSectionProps = ComponentProps<typeof QueueSection>

/**
 * AIQueueSection - Collapsible queue section container.
 */
export const AIQueueSection = QueueSection

export type AIQueueSectionTriggerProps = ComponentProps<
	typeof QueueSectionTrigger
>

/**
 * AIQueueSectionTrigger - Queue section trigger button.
 */
export const AIQueueSectionTrigger = QueueSectionTrigger

export type AIQueueSectionLabelProps = ComponentProps<typeof QueueSectionLabel>

/**
 * AIQueueSectionLabel - Queue section label with count.
 */
export const AIQueueSectionLabel = QueueSectionLabel

export type AIQueueSectionContentProps = ComponentProps<
	typeof QueueSectionContent
>

/**
 * AIQueueSectionContent - Queue section collapsible content.
 */
export const AIQueueSectionContent = QueueSectionContent
