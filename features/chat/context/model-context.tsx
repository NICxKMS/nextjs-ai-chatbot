'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ModelState, ModelMetadata } from '../types';

const ModelContext = createContext<ModelState | null>(null);

export function useModelContext() {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error('useModelContext must be used within ModelProvider');
  }
  return context;
}

const DEFAULT_MODELS: ModelMetadata[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', description: 'Most capable model' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', description: 'Fast and efficient' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
];

interface ModelProviderProps {
  children: React.ReactNode;
  initialModelId?: string;
  models?: ModelMetadata[];
}

export function ModelProvider({ 
  children, 
  initialModelId = 'gpt-4o',
  models = DEFAULT_MODELS 
}: ModelProviderProps) {
  const [currentModelId, setCurrentModelId] = useState(initialModelId);

  const setModelId = useCallback((id: string) => {
    setCurrentModelId(id);
  }, []);

  const value = useMemo<ModelState>(() => ({
    currentModelId,
    availableModels: models,
    setModelId,
  }), [currentModelId, models, setModelId]);

  return (
    <ModelContext.Provider value={value}>
      {children}
    </ModelContext.Provider>
  );
}

export { ModelContext };
