/**
 * Editor Utilities
 *
 * Central export for TipTap editor extensions and utilities.
 *
 * @module lib/editor
 */

export {
    createSuggestionDecorations,
    createSuggestionWidget,
    getSuggestionPositions,
    projectWithPositions,
    type StreamingSuggestion,
    type SuggestionLike,
    type SuggestionOptions,
    SuggestionsExtension,
    type SuggestionsPluginState,
    suggestionsPluginKey,
    type UISuggestion,
} from "./suggestions-extension";
