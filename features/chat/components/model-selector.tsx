/**
 * ModelSelector Component
 *
 * Dropdown selector for choosing the AI model for chat.
 *
 * @module features/chat/components/model-selector
 */

'use client';

import type { ModelMetadata } from '../types';

/**
 * Chevron down icon for the selector.
 */
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/**
 * Props for the ModelSelector component.
 */
export interface ModelSelectorProps {
  /** Currently selected model ID */
  value: string;
  /** List of available models */
  models: ModelMetadata[];
  /** Callback when model selection changes */
  onChange: (modelId: string) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Dropdown selector for choosing the AI model.
 *
 * @remarks
 * Uses native select for accessibility and simplicity.
 * Can be enhanced with Radix UI Select later for custom styling.
 *
 * @example
 * ```tsx
 * <ModelSelector
 *   value={currentModelId}
 *   models={availableModels}
 *   onChange={setModelId}
 *   disabled={isReadonly}
 * />
 * ```
 */
export function ModelSelector({
  value,
  models,
  onChange,
  disabled = false,
  className = '',
}: ModelSelectorProps) {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value);
  };

  // Find current model for display
  const currentModel = models.find((m) => m.id === value);

  return (
    <div className={`relative inline-flex items-center ${className}`.trim()}>
      <select
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className="appearance-none bg-transparent border border-border rounded-md px-3 py-1.5 pr-8 text-sm font-medium cursor-pointer hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Select AI model"
      >
        {models.length === 0 ? (
          <option value="">No models available</option>
        ) : (
          models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))
        )}
      </select>
      <ChevronDownIcon className="absolute right-2 h-4 w-4 pointer-events-none text-muted-foreground" />
    </div>
  );
}
