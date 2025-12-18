"use server";

/**
 * Model Selection
 * @module new-arch/lib/ai/models/selection
 *
 * Intelligent model selection based on capabilities, preferences,
 * and availability.
 */

import type {
    AIProviderId,
    ModelCapability,
    ModelSelectionCriteria,
} from "../types";
import {
    getAllModels,
    getAvailableModels,
    getModel,
    type ModelRegistryEntry,
} from "./registry";

// ============================================================================
// Selection Types
// ============================================================================

/** Model selection result */
export type ModelSelectionResult = {
    /** Selected model, if any */
    readonly model: ModelRegistryEntry | null;
    /** Reason for selection or failure */
    readonly reason: string;
    /** Alternative models considered */
    readonly alternatives: readonly ModelRegistryEntry[];
};

/** Model ranking score */
type ModelScore = {
    model: ModelRegistryEntry;
    score: number;
    reasons: string[];
};

// ============================================================================
// Capability Matching
// ============================================================================

/**
 * Check if model has all required capabilities
 */
function hasAllCapabilities(
    model: ModelRegistryEntry,
    capabilities: readonly ModelCapability[]
): boolean {
    return capabilities.every((cap) => model.capabilities.includes(cap));
}

/**
 * Check if model has any of the specified capabilities
 */
function hasAnyCapability(
    model: ModelRegistryEntry,
    capabilities: readonly ModelCapability[]
): boolean {
    return capabilities.some((cap) => model.capabilities.includes(cap));
}

/**
 * Count matching capabilities
 */
function countMatchingCapabilities(
    model: ModelRegistryEntry,
    capabilities: readonly ModelCapability[]
): number {
    return capabilities.filter((cap) => model.capabilities.includes(cap))
        .length;
}

// ============================================================================
// Model Selection Functions
// ============================================================================

/**
 * Get models by capability (having at least one of the specified capabilities)
 */
export function getModelsByCapability(
    capability: ModelCapability | ModelCapability[]
): readonly ModelRegistryEntry[] {
    const capabilities = Array.isArray(capability) ? capability : [capability];
    return getAvailableModels().filter((model) =>
        hasAnyCapability(model, capabilities)
    );
}

/**
 * Get models having ALL specified capabilities
 */
export function getModelsWithAllCapabilities(
    capabilities: readonly ModelCapability[]
): readonly ModelRegistryEntry[] {
    return getAvailableModels().filter((model) =>
        hasAllCapabilities(model, capabilities)
    );
}

/**
 * Get models by provider
 */
export function getModelsByProvider(
    providerId: AIProviderId
): readonly ModelRegistryEntry[] {
    return getAvailableModels().filter(
        (model) => model.providerId === providerId
    );
}

/**
 * Select the best model based on criteria
 */
export function selectModel(
    criteria: ModelSelectionCriteria
): ModelSelectionResult {
    const availableModels = getAvailableModels();

    if (availableModels.length === 0) {
        return {
            model: null,
            reason: "No models available in registry",
            alternatives: [],
        };
    }

    // Filter by required capabilities
    let candidates = [...availableModels];

    if (criteria.requiredCapabilities?.length) {
        const requiredCaps = criteria.requiredCapabilities;
        candidates = candidates.filter((model) =>
            hasAllCapabilities(model, requiredCaps)
        );

        if (candidates.length === 0) {
            return {
                model: null,
                reason: `No models found with all required capabilities: ${criteria.requiredCapabilities.join(", ")}`,
                alternatives: availableModels.slice(0, 5),
            };
        }
    }

    // Filter by context window
    if (criteria.maxContextWindow !== undefined) {
        const maxContext = criteria.maxContextWindow;
        candidates = candidates.filter(
            (model) =>
                model.contextWindow === undefined ||
                model.contextWindow <= maxContext
        );
    }

    // Filter out reasoning models if requested
    if (criteria.excludeReasoning) {
        candidates = candidates.filter(
            (model) =>
                model.reasoningType === undefined ||
                model.reasoningType === "none"
        );
    }

    if (candidates.length === 0) {
        return {
            model: null,
            reason: "No models match the specified criteria",
            alternatives: availableModels.slice(0, 5),
        };
    }

    // Score candidates
    const scores: ModelScore[] = candidates.map((model) => {
        let score = 0;
        const reasons: string[] = [];

        // Prefer models from preferred providers
        if (criteria.preferredProviders?.length) {
            const providerIndex = criteria.preferredProviders.indexOf(
                model.providerId
            );
            if (providerIndex !== -1) {
                score +=
                    (criteria.preferredProviders.length - providerIndex) * 10;
                reasons.push(`Preferred provider: ${model.providerId}`);
            }
        }

        // Bonus for matching optional capabilities
        if (criteria.capabilities?.length) {
            const matchCount = countMatchingCapabilities(
                model,
                criteria.capabilities
            );
            score += matchCount * 5;
            if (matchCount > 0) {
                reasons.push(
                    `Matches ${matchCount}/${criteria.capabilities.length} capabilities`
                );
            }
        }

        // Prefer curated models
        if (model.isCurated) {
            score += 3;
            reasons.push("Curated model");
        }

        // Prefer models with larger context windows (for flexibility)
        if (model.contextWindow) {
            score += Math.min(model.contextWindow / 10_000, 5);
        }

        return { model, score, reasons };
    });

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    const selected = scores[0];
    const alternatives = scores.slice(1, 6).map((s) => s.model);

    return {
        model: selected.model,
        reason: selected.reasons.join("; ") || "Best available match",
        alternatives,
    };
}

/**
 * Select model by ID with fallback
 */
export function selectModelById(
    modelId: string,
    fallbackCriteria?: ModelSelectionCriteria
): ModelSelectionResult {
    const model = getModel(modelId);

    if (model?.isAvailable) {
        return {
            model,
            reason: "Exact model ID match",
            alternatives: [],
        };
    }

    if (!model) {
        if (fallbackCriteria) {
            const fallbackResult = selectModel(fallbackCriteria);
            return {
                ...fallbackResult,
                reason: `Model "${modelId}" not found; ${fallbackResult.reason}`,
            };
        }

        return {
            model: null,
            reason: `Model "${modelId}" not found in registry`,
            alternatives: getAvailableModels().slice(0, 5),
        };
    }

    // Model exists but is unavailable
    if (fallbackCriteria) {
        const fallbackResult = selectModel(fallbackCriteria);
        return {
            ...fallbackResult,
            reason: `Model "${modelId}" is unavailable; ${fallbackResult.reason}`,
        };
    }

    return {
        model: null,
        reason: `Model "${modelId}" is currently unavailable`,
        alternatives: getAvailableModels().slice(0, 5),
    };
}

/**
 * Get recommended model for a specific use case
 */
export function getRecommendedModel(
    useCase: "chat" | "reasoning" | "vision" | "code" | "multimodal"
): ModelSelectionResult {
    const useCaseCriteria: Record<string, ModelSelectionCriteria> = {
        chat: {
            requiredCapabilities: ["chat"],
            preferredProviders: ["openai", "anthropic", "google"],
            excludeReasoning: true,
        },
        reasoning: {
            requiredCapabilities: ["reasoning"],
            preferredProviders: ["openai", "anthropic"],
        },
        vision: {
            requiredCapabilities: ["vision"],
            preferredProviders: ["openai", "anthropic", "google"],
        },
        code: {
            requiredCapabilities: ["code"],
            capabilities: ["tooling"],
            preferredProviders: ["openai", "anthropic"],
        },
        multimodal: {
            requiredCapabilities: ["multimodal"],
            preferredProviders: ["google", "openai"],
        },
    };

    return selectModel(useCaseCriteria[useCase] || useCaseCriteria.chat);
}

/**
 * Find models similar to a given model
 */
export function findSimilarModels(
    modelId: string,
    limit = 5
): readonly ModelRegistryEntry[] {
    const sourceModel = getModel(modelId);
    if (!sourceModel) {
        return [];
    }

    const allModels = getAllModels().filter(
        (m) => m.id !== modelId && m.isAvailable
    );

    // Score by capability overlap
    const scored = allModels.map((model) => {
        const overlap = countMatchingCapabilities(
            model,
            sourceModel.capabilities
        );
        const sameProvider =
            model.providerId === sourceModel.providerId ? 2 : 0;
        return { model, score: overlap + sameProvider };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.model);
}
