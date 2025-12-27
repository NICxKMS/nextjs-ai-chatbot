/**
 * useModelSelection Hook
 *
 * Manages model selection state with persistence.
 * Extracted from ChatProvider for single responsibility.
 * Uses dependency injection for better testability.
 *
 * @module features/chat/hooks/use-model-selection
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    defaultModelService,
    type IModelService,
} from "../services/model-service";
import type { ModelMetadata, ModelState } from "../types";

export type UseModelSelectionOptions = {
    /** Initial model ID */
    selectedModelId?: string;
    /** Available models (defaults to getAvailableModels()) */
    availableModels?: ModelMetadata[];
    /** Optional model service for dependency injection (testing) */
    modelService?: IModelService;
    /** Optional callback to persist model selection (injected from settings) */
    onModelChange?: (modelId: string) => void;
};

export type UseModelSelectionReturn = ModelState & {
    /** Ref to current model ID (for closures) */
    currentModelIdRef: React.RefObject<string>;
};

/**
 * Hook for model selection state management.
 *
 * @example
 * ```tsx
 * const { currentModelId, setModelId, availableModels, currentModelIdRef } =
 *   useModelSelection({
 *     selectedModelId: "gpt-4",
 *     onModelChange: (id) => saveToSettings(id),
 *   });
 * ```
 */
export function useModelSelection({
    selectedModelId,
    availableModels,
    modelService = defaultModelService,
    onModelChange,
}: UseModelSelectionOptions = {}): UseModelSelectionReturn {
    // Get default from injected service if not provided
    const defaultModelId = selectedModelId ?? modelService.getDefaultModelId();
    const [currentModelId, setCurrentModelId] = useState(defaultModelId);
    const currentModelIdRef = useRef(currentModelId);

    // Keep ref in sync with state
    useEffect(() => {
        currentModelIdRef.current = currentModelId;
    }, [currentModelId]);

    // Callback to set model ID and optionally persist
    const setModelId = useCallback(
        (id: string) => {
            setCurrentModelId(id);
            onModelChange?.(id);
        },
        [onModelChange]
    );

    // Get available models from injected service or override
    const models = useMemo(
        () => availableModels ?? modelService.getAvailableModels(),
        [availableModels, modelService]
    );

    return {
        currentModelId,
        availableModels: models,
        setModelId,
        currentModelIdRef,
    };
}
