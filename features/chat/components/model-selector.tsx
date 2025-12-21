/**
 * ModelSelector Component
 *
 * Rich dropdown selector for choosing the AI model for chat.
 * Groups models by provider and shows description, capabilities, badges.
 *
 * @module features/chat/components/model-selector
 */

"use client";

import { RefreshCw } from "lucide-react";
import { useMemo, useOptimistic, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/components/dropdown-menu";
import {
    CheckCircleFillIcon,
    ChevronDownIcon,
} from "@/shared/components/icons";
import { Badge } from "@/shared/ui/badge";
import type { ModelMetadata } from "../types";

/**
 * Featured model IDs - these are curated/flagship models
 */
const FEATURED_MODEL_IDS = [
    "gpt-4o",
    "gpt-4-turbo",
    "claude-3-5-sonnet",
    "claude-3-opus",
    "gemini-1.5-pro",
    "gemini-2.0-flash",
];

/**
 * New model IDs - recently released models
 */
const NEW_MODEL_IDS = [
    "gpt-4o-mini",
    "claude-3-5-haiku",
    "gemini-2.0-flash-exp",
    "o1",
    "o1-mini",
    "o3-mini",
];

/**
 * Get badge type for a model based on its ID
 */
function getModelBadge(modelId: string): "featured" | "new" | null {
    const normalizedId = modelId.toLowerCase();

    if (
        FEATURED_MODEL_IDS.some((id) => normalizedId.includes(id.toLowerCase()))
    ) {
        return "featured";
    }

    if (NEW_MODEL_IDS.some((id) => normalizedId.includes(id.toLowerCase()))) {
        return "new";
    }

    return null;
}

/**
 * Capability labels for display
 */
const capabilityLabels: Record<string, string> = {
    supportsImages: "Vision",
    supportsTools: "Tools",
    supportsReasoning: "Reasoning",
};

/**
 * Provider display names
 */
const providerDisplayNames: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google",
    mistral: "Mistral",
    groq: "Groq",
    perplexity: "Perplexity",
    xai: "xAI",
};

/**
 * Group models by provider
 */
type ProviderGroup = {
    providerId: string;
    displayName: string;
    models: ModelMetadata[];
};

function groupModelsByProvider(models: ModelMetadata[]): ProviderGroup[] {
    const grouped = models.reduce<Record<string, ProviderGroup>>(
        (acc, model) => {
            const providerId = model.provider;
            if (!acc[providerId]) {
                acc[providerId] = {
                    providerId,
                    displayName: providerDisplayNames[providerId] || providerId,
                    models: [],
                };
            }
            acc[providerId].models.push(model);
            return acc;
        },
        {}
    );

    return Object.values(grouped).sort((a, b) =>
        a.displayName.localeCompare(b.displayName)
    );
}

/**
 * Render a single model row in the dropdown
 */
function ModelRow({
    model,
    isSelected,
    onSelect,
    disabled,
}: {
    model: ModelMetadata;
    isSelected: boolean;
    onSelect: (modelId: string) => void;
    disabled: boolean;
}) {
    const capabilities = model.capabilities
        ? Object.entries(model.capabilities)
              .filter(([key, value]) => value === true && capabilityLabels[key])
              .map(([key]) => capabilityLabels[key])
        : [];

    return (
        <DropdownMenuItem
            asChild
            data-active={isSelected}
            data-testid={`model-selector-item-${model.id}`}
            disabled={disabled}
            onSelect={() => onSelect(model.id)}
        >
            <button
                className="group/item flex w-full flex-col gap-2"
                type="button"
            >
                <div className="flex w-full flex-row items-center justify-between">
                    <div className="flex flex-col items-start gap-1 text-left">
                        <span className="flex items-center gap-2 font-medium text-sm sm:text-base">
                            {model.name}
                            {(() => {
                                const badge = getModelBadge(model.id);
                                if (badge === "featured") {
                                    return (
                                        <Badge
                                            className="text-xs"
                                            variant="secondary"
                                        >
                                            Featured
                                        </Badge>
                                    );
                                }
                                if (badge === "new") {
                                    return (
                                        <Badge
                                            className="text-xs"
                                            variant="outline"
                                        >
                                            New
                                        </Badge>
                                    );
                                }
                                return null;
                            })()}
                        </span>
                        {model.description && (
                            <span className="line-clamp-2 text-muted-foreground text-xs">
                                {model.description}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
                            <CheckCircleFillIcon />
                        </div>
                    </div>
                </div>

                {(capabilities.length > 0 || model.capabilities?.maxTokens) && (
                    <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
                        <span>
                            {providerDisplayNames[model.provider] ||
                                model.provider}
                        </span>

                        {model.capabilities?.maxTokens && (
                            <span>
                                • Context{" "}
                                {model.capabilities.maxTokens.toLocaleString()}{" "}
                                tokens
                            </span>
                        )}

                        {capabilities.map((capability) => (
                            <span
                                className="rounded bg-muted px-2 py-0.5"
                                key={capability}
                            >
                                {capability}
                            </span>
                        ))}
                    </div>
                )}
            </button>
        </DropdownMenuItem>
    );
}

/**
 * Props for the ModelSelector component.
 */
export type ModelSelectorProps = {
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
    /** Optional callback to refresh the model list */
    onRefresh?: () => void | Promise<void>;
};

/**
 * Rich dropdown selector for choosing the AI model.
 *
 * Features:
 * - Groups models by provider
 * - Shows description and capabilities
 * - Capability badges (Vision, Tools, Reasoning)
 * - Context window info
 * - Rich dropdown styling
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
    className = "",
    onRefresh,
}: ModelSelectorProps) {
    const [open, setOpen] = useState(false);
    const [optimisticModelId, setOptimisticModelId] = useOptimistic(value);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const groupedCatalog = useMemo(
        () => groupModelsByProvider(models),
        [models]
    );

    const selectedModel = useMemo(
        () => models.find((model) => model.id === optimisticModelId),
        [optimisticModelId, models]
    );

    const handleSelect = (modelId: string) => {
        setOpen(false);
        setOptimisticModelId(modelId);
        onChange(modelId);
    };

    return (
        <DropdownMenu onOpenChange={setOpen} open={open}>
            <DropdownMenuTrigger
                asChild
                className={cn(
                    "w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
                    className
                )}
                disabled={disabled}
            >
                <Button
                    className="md:h-[34px] md:px-2"
                    data-testid="model-selector"
                    suppressHydrationWarning
                    variant="outline"
                >
                    {selectedModel?.name ?? "Select model"}
                    <ChevronDownIcon />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                className="max-h-[420px] min-w-[360px] max-w-[93vw] overflow-y-auto sm:min-w-[420px]"
            >
                <div className="flex items-center justify-between px-2 pt-1 pb-2 text-muted-foreground text-xs">
                    <div>Choose a model</div>
                    {onRefresh && (
                        <Button
                            className="h-6 px-2 text-xs"
                            disabled={isRefreshing}
                            onClick={async (e) => {
                                e.stopPropagation();
                                setIsRefreshing(true);
                                try {
                                    await onRefresh();
                                } finally {
                                    setIsRefreshing(false);
                                }
                            }}
                            size="sm"
                            variant="ghost"
                        >
                            <RefreshCw
                                className={cn(
                                    "mr-1 size-3",
                                    isRefreshing && "animate-spin"
                                )}
                            />
                            {isRefreshing ? "Refreshing…" : "Refresh"}
                        </Button>
                    )}
                </div>

                {groupedCatalog.map((providerGroup) => (
                    <div
                        className="border-border/70 border-t px-2 py-2"
                        key={providerGroup.providerId}
                    >
                        <div className="mb-1 flex items-center justify-between font-medium text-sm">
                            <span>{providerGroup.displayName}</span>
                            <span className="text-muted-foreground text-xs">
                                {providerGroup.models.length} model
                                {providerGroup.models.length !== 1 ? "s" : ""}
                            </span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            {providerGroup.models.map((model) => (
                                <ModelRow
                                    disabled={disabled}
                                    isSelected={model.id === optimisticModelId}
                                    key={model.id}
                                    model={model}
                                    onSelect={handleSelect}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
