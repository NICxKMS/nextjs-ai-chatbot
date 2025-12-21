/**
 * AI Configuration
 * Ref: 05-ai-integration-optimal-design.md
 *
 * Centralized configuration for AI operations.
 * These can be overridden via environment variables.
 * Set to "USE_SELECTED_MODEL" to use the user's selected chat model.
 *
 * @module lib/ai/config
 */

// =============================================================================
// TOOL MODEL CONFIGURATION
// =============================================================================

/**
 * Model used for tool operations (createDocument, updateDocument, etc.).
 *
 * Defaults to gpt-4o-mini for speed/cost efficiency.
 * Can be overridden via TOOL_MODEL_ID environment variable.
 *
 * Special value: "USE_SELECTED_MODEL" - uses the user's selected chat model
 *
 * @example
 * ```env
 * # Use a fast/cheap model for tools
 * TOOL_MODEL_ID=openai:gpt-4o-mini
 *
 * # Or use the user's selected model
 * TOOL_MODEL_ID=USE_SELECTED_MODEL
 * ```
 */
export const TOOL_MODEL_ID =
    process.env.TOOL_MODEL_ID ?? "openai:gpt-4o-mini";

/**
 * Whether to use the user's selected model for tool operations.
 */
export const USE_SELECTED_MODEL_FOR_TOOLS =
    TOOL_MODEL_ID === "USE_SELECTED_MODEL";

// =============================================================================
// TITLE MODEL CONFIGURATION
// =============================================================================

/**
 * Model used for title generation.
 *
 * Defaults to gpt-4o-mini for speed/cost efficiency.
 * Can be overridden via TITLE_MODEL_ID environment variable.
 *
 * Special value: "USE_SELECTED_MODEL" - uses the user's selected chat model
 *
 * @example
 * ```env
 * # Use a fast/cheap model for title generation
 * TITLE_MODEL_ID=openai:gpt-4o-mini
 *
 * # Or use the user's selected model
 * TITLE_MODEL_ID=USE_SELECTED_MODEL
 * ```
 */
export const TITLE_MODEL_ID =
    process.env.TITLE_MODEL_ID ?? "openai:gpt-4o-mini";

/**
 * Whether to use the user's selected model for title generation.
 */
export const USE_SELECTED_MODEL_FOR_TITLE =
    TITLE_MODEL_ID === "USE_SELECTED_MODEL";

// =============================================================================
// DEFAULT MODEL CONFIGURATION
// =============================================================================

/**
 * Default model for new users.
 * This is the model pre-selected when a user first opens the app.
 *
 * Can be overridden via DEFAULT_MODEL_ID environment variable.
 */
export const DEFAULT_MODEL_ID =
    process.env.DEFAULT_MODEL_ID ?? "google:gemini-2.5-flash-lite";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the model ID to use for tool operations.
 *
 * @param selectedModelId - The user's selected chat model ID
 * @returns The model ID to use for tool operations
 *
 * @example
 * ```ts
 * const toolModelId = getToolModel(userSelectedModel);
 * const model = getLanguageModel(toolModelId);
 * ```
 */
export function getToolModel(selectedModelId: string): string {
    return USE_SELECTED_MODEL_FOR_TOOLS
        ? selectedModelId
        : TOOL_MODEL_ID;
}

/**
 * Get the model ID to use for title generation.
 *
 * @param selectedModelId - The user's selected chat model ID
 * @returns The model ID to use for title generation
 *
 * @example
 * ```ts
 * const titleModelId = getTitleModel(userSelectedModel);
 * const model = getLanguageModel(titleModelId);
 * ```
 */
export function getTitleModel(selectedModelId: string): string {
    return USE_SELECTED_MODEL_FOR_TITLE
        ? selectedModelId
        : TITLE_MODEL_ID;
}
