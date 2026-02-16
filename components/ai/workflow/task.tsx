/**
 * AITask Wrapper Component
 *
 * Project wrapper for Task primitive that adds:
 * - Default open state management
 * - Consistent project styling
 * - Integration with workflow context
 *
 * @module components/ai/workflow/task
 */

"use client"

import type { ComponentProps } from "react"
import {
	Task,
	TaskContent,
	TaskItem,
	TaskItemFile,
	TaskTrigger,
} from "@/components/ai-elements/task"

// =============================================================================
// Re-exports with AI Prefix
// =============================================================================

export type AITaskProps = ComponentProps<typeof Task>

/**
 * AITask - Root task container with collapsible support.
 * Wraps Task primitive with project defaults.
 */
export const AITask = Task

export type AITaskTriggerProps = ComponentProps<typeof TaskTrigger>

/**
 * AITaskTrigger - Task trigger with title and expand icon.
 */
export const AITaskTrigger = TaskTrigger

export type AITaskContentProps = ComponentProps<typeof TaskContent>

/**
 * AITaskContent - Collapsible task content area.
 */
export const AITaskContent = TaskContent

export type AITaskItemProps = ComponentProps<typeof TaskItem>

/**
 * AITaskItem - Individual task item component.
 */
export const AITaskItem = TaskItem

export type AITaskItemFileProps = ComponentProps<typeof TaskItemFile>

/**
 * AITaskItemFile - Task item file reference display.
 */
export const AITaskItemFile = TaskItemFile
