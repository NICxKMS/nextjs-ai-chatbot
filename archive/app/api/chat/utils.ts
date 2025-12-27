/**
 * Chat API Utilities
 * Helper functions for the chat API handlers.
 *
 * @module app/api/chat/utils
 */

import { generateText, type LanguageModel } from "ai";
import { getLanguageModel, getTitleModel, MODEL_REGISTRY } from "@/lib/ai";
import { validationError } from "@/lib/errors";
import { logger } from "@/lib/utils/logger";

// =============================================================================
// MODEL UTILITIES
// =============================================================================

/**
 * Get the language model instance for a given model ID
 * Uses the unified provider registry pattern (like OldApp)
 * Reasoning models are automatically wrapped with chain-of-thought middleware
 */
export function getModel(modelId: string): LanguageModel {
    if (!MODEL_REGISTRY[modelId]) {
        // OPT-P0-002: Generic error message - don't expose model ID to clients
        throw validationError("Invalid model configuration");
    }

    // Use unified getLanguageModel which handles:
    // 1. Provider resolution via registry
    // 2. Automatic reasoning middleware wrapping
    return getLanguageModel(modelId);
}

// =============================================================================
// TITLE GENERATION
// =============================================================================

/**
 * Generate a title for a new chat based on the first user message.
 * Uses auxiliary model (configurable via AUXILIARY_MODEL_ID) for speed/cost.
 * Falls back to a simple extraction if AI generation fails.
 *
 * @param userMessage - The first user message content
 * @param selectedModelId - The user's selected chat model (used if AUXILIARY_MODEL_ID=USE_SELECTED_MODEL)
 */
export async function generateTitle(
    userMessage: string,
    selectedModelId: string
): Promise<string> {
    // Simple title extraction as fallback
    const fallbackTitle =
        userMessage.length > 50
            ? `${userMessage.substring(0, 47)}...`
            : userMessage;

    try {
        // Use title model for title generation (fast/cheap by default, configurable via TITLE_MODEL_ID)
        const titleModelId = getTitleModel(selectedModelId);
        const titleModel = getLanguageModel(titleModelId);

        const { text } = await generateText({
            model: titleModel,
            system: `You are a title generator. Generate a short, concise title (max 50 chars) for a chat conversation based on the user's first message. Return ONLY the title, no quotes or extra formatting.`,
            prompt: userMessage,
        });

        // Clean and validate the title
        const cleanedTitle = text.trim().replace(/^["']|["']$/g, "");
        return cleanedTitle.length > 0 ? cleanedTitle : fallbackTitle;
    } catch (error) {
        logger.warn("[Chat API] AI title generation failed, using fallback", {
            error,
        });
        return fallbackTitle;
    }
}

/**
 * Generate a fallback title from message content
 */
export function getFallbackTitle(userMessage: string): string {
    return userMessage.length > 50
        ? `${userMessage.substring(0, 47)}...`
        : userMessage;
}
