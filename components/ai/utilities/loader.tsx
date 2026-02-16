/**
 * AILoader Wrapper Component
 *
 * Project wrapper for Loader primitive that adds:
 * - Multiple size variants
 * - Consistent project styling
 * - Loading state indicators
 *
 * @module components/ai/utilities/loader
 */

import type { ComponentProps } from "react"
import { Loader } from "@/components/ai-elements/loader"

// =============================================================================
// Re-exports with AI Prefix
// =============================================================================

export type AILoaderProps = ComponentProps<typeof Loader>

/**
 * AILoader - Animated loading spinner.
 * Displays a circular spinner with varying opacity segments.
 */
export const AILoader = Loader
