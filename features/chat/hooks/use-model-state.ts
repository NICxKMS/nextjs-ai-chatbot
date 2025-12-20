'use client';

import { useModelContext } from '../context';
import type { ModelState, ModelMetadata } from '../types';

/**
 * Hook to access model selection state.
 */
export function useModelState(): ModelState {
  return useModelContext();
}

export function useCurrentModel(): ModelMetadata | undefined {
  const { currentModelId, availableModels } = useModelContext();
  return availableModels.find((m) => m.id === currentModelId);
}
