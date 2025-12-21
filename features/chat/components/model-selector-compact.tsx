/**
 * ModelSelectorCompact Component
 *
 * Compact model selector for the chat input toolbar.
 * Smaller, simpler variant of ModelSelector for inline use.
 *
 * @module features/chat/components/model-selector-compact
 */

"use client";

import { Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/components/dropdown-menu";
import type { ModelMetadata } from "../types";

// =============================================================================
// TYPES
// =============================================================================

export type ModelSelectorCompactProps = {
    /** Available models for selection */
    models: ModelMetadata[];
    /** Currently selected model ID */
    selectedModelId: string;
    /** Callback when model selection changes */
    onModelChange: (modelId: string) => void;
    /** Whether the selector is disabled */
    disabled?: boolean;
    /** Additional CSS classes */
    className?: string;
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Compact model selector for chat input toolbar.
 *
 * @remarks
 * Features:
 * - Small ghost button with CPU icon
 * - Simple dropdown with model names
 * - Truncated display for long model names
 *
 * Visual parity with oldapp/components/model-selector.tsx (compact variant)
 *
 * @example
 * ```tsx
 * <ModelSelectorCompact
 *   models={availableModels}
 *   selectedModelId={currentModelId}
 *   onModelChange={setModelId}
 * />
 * ```
 */
export function ModelSelectorCompact({
    models,
    selectedModelId,
    onModelChange,
    disabled,
    className,
}: ModelSelectorCompactProps) {
    const selectedModel = models.find((m) => m.id === selectedModelId);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    className={cn(
                        "h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground",
                        className
                    )}
                    data-testid="model-selector-compact"
                    disabled={disabled}
                    size="sm"
                    variant="ghost"
                >
                    <Cpu className="size-4" />
                    <span className="max-w-[100px] truncate text-xs">
                        {selectedModel?.name || "Select model"}
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
                {models.map((model) => (
                    <DropdownMenuItem
                        className={cn(
                            selectedModelId === model.id && "bg-accent"
                        )}
                        data-testid={`model-selector-compact-item-${model.id}`}
                        key={model.id}
                        onClick={() => onModelChange(model.id)}
                    >
                        <span className="truncate">{model.name}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
