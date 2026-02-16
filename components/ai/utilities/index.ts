/**
 * AI Utility Wrappers - Barrel Export
 *
 * Project wrappers for utility AI elements that add:
 * - Loading indicators with multiple variants
 * - Shimmer effects for streaming text
 * - Suggestion chips for quick actions
 *
 * @module components/ai/utilities
 */

// =============================================================================
// Loader Components
// =============================================================================

export {
	AILoader,
	type AILoaderProps,
} from "./loader"

// =============================================================================
// Shimmer Components
// =============================================================================

export {
	AIShimmer,
	type AIShimmerProps,
} from "./shimmer"

// =============================================================================
// Suggestion Components
// =============================================================================

export {
	AISuggestion,
	type AISuggestionProps,
	AISuggestions,
	type AISuggestionsProps,
} from "./suggestion"
