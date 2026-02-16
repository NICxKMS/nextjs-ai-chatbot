/**
 * AICheckpoint Wrapper Component
 *
 * Project wrapper for Checkpoint primitive that adds:
 * - Conversation branching support
 * - Restore point management
 * - Consistent project styling
 *
 * @module components/ai/workflow/checkpoint
 */

"use client"

import type { ComponentProps } from "react"
import {
	Checkpoint,
	CheckpointIcon,
	CheckpointTrigger,
} from "@/components/ai-elements/checkpoint"

// =============================================================================
// Re-exports with AI Prefix
// =============================================================================

export type AICheckpointProps = ComponentProps<typeof Checkpoint>

/**
 * AICheckpoint - Root checkpoint container.
 * Displays a checkpoint marker with separator.
 */
export const AICheckpoint = Checkpoint

export type AICheckpointIconProps = ComponentProps<typeof CheckpointIcon>

/**
 * AICheckpointIcon - Checkpoint icon component.
 * Displays bookmark icon by default or custom children.
 */
export const AICheckpointIcon = CheckpointIcon

export type AICheckpointTriggerProps = ComponentProps<typeof CheckpointTrigger>

/**
 * AICheckpointTrigger - Checkpoint trigger button with optional tooltip.
 * Used to restore or navigate to a checkpoint.
 */
export const AICheckpointTrigger = CheckpointTrigger
