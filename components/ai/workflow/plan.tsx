/**
 * AIPlan Wrapper Component
 *
 * Project wrapper for Plan primitive that adds:
 * - Default streaming state management
 * - Consistent project styling
 * - Integration with workflow context
 *
 * @module components/ai/workflow/plan
 */

"use client"

import type { ComponentProps } from "react"
import {
	Plan,
	PlanAction,
	PlanContent,
	PlanDescription,
	PlanFooter,
	PlanHeader,
	PlanTitle,
	PlanTrigger,
} from "@/components/ai-elements/plan"

// =============================================================================
// Re-exports with AI Prefix
// =============================================================================

export type AIPlanProps = ComponentProps<typeof Plan>

/**
 * AIPlan - Root plan container with streaming support.
 * Wraps Plan primitive with project defaults.
 */
export const AIPlan = Plan

export type AIPlanHeaderProps = ComponentProps<typeof PlanHeader>

/**
 * AIPlanHeader - Plan header section.
 */
export const AIPlanHeader = PlanHeader

export type AIPlanTitleProps = ComponentProps<typeof PlanTitle>

/**
 * AIPlanTitle - Plan title with shimmer during streaming.
 */
export const AIPlanTitle = PlanTitle

export type AIPlanDescriptionProps = ComponentProps<typeof PlanDescription>

/**
 * AIPlanDescription - Plan description with shimmer during streaming.
 */
export const AIPlanDescription = PlanDescription

export type AIPlanActionProps = ComponentProps<typeof PlanAction>

/**
 * AIPlanAction - Plan action button container.
 */
export const AIPlanAction = PlanAction

export type AIPlanContentProps = ComponentProps<typeof PlanContent>

/**
 * AIPlanContent - Collapsible plan content area.
 */
export const AIPlanContent = PlanContent

export type AIPlanFooterProps = ComponentProps<typeof PlanFooter>

/**
 * AIPlanFooter - Plan footer section.
 */
export const AIPlanFooter = PlanFooter

export type AIPlanTriggerProps = ComponentProps<typeof PlanTrigger>

/**
 * AIPlanTrigger - Plan expand/collapse trigger button.
 */
export const AIPlanTrigger = PlanTrigger
