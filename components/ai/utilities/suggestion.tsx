/**
 * AISuggestion Wrapper Component
 *
 * Project wrapper for Suggestion primitive that adds:
 * - Clickable suggestion chips
 * - Scrollable suggestion container
 * - Consistent project styling
 *
 * @module components/ai/utilities/suggestion
 */

"use client"

import type { ComponentProps } from "react"
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion"

// =============================================================================
// Re-exports with AI Prefix
// =============================================================================

export type AISuggestionsProps = ComponentProps<typeof Suggestions>

/**
 * AISuggestions - Scrollable suggestions container.
 * Provides horizontal scrolling for suggestion chips.
 */
export const AISuggestions = Suggestions

export type AISuggestionProps = ComponentProps<typeof Suggestion>

/**
 * AISuggestion - Individual suggestion button.
 * Calls onClick with the suggestion string when clicked.
 */
export const AISuggestion = Suggestion
