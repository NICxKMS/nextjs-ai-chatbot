/**
 * AIShimmer Wrapper Component
 *
 * Project wrapper for Shimmer primitive that adds:
 * - Text loading animation
 * - Configurable duration and spread
 * - Consistent project styling
 *
 * @module components/ai/utilities/shimmer
 */

"use client"

import type { ComponentProps } from "react"
import { Shimmer } from "@/components/ai-elements/shimmer"

// =============================================================================
// Re-exports with AI Prefix
// =============================================================================

export type AIShimmerProps = ComponentProps<typeof Shimmer>

/**
 * AIShimmer - Text shimmer effect for loading states.
 * Creates an animated gradient effect over text.
 */
export const AIShimmer = Shimmer
