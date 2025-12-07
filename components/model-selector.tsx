"use client";

import { useMemo, useOptimistic, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
    ModelMetadata,
    ProviderCatalog,
} from "@/lib/ai/model-catalog-types";
import { forceRefreshModelCatalog } from "@/lib/ai/model-registry";
import { logError } from "@/lib/log";
import { cn } from "@/lib/utils";
import { CheckCircleFillIcon, ChevronDownIcon } from "./icons";

const getBadge = (model: ModelMetadata) => {
    if (model.isCurated) {
        return "Featured";
    }

    if (model.source === "discovered") {
        return "Live";
    }

    return null;
};

const capabilityLabels: Record<string, string> = {
    reasoning: "Reasoning",
    vision: "Vision",
    audio: "Audio",
    multimodal: "Multimodal",
    code: "Code",
    tooling: "Tools",
};

function renderModelRow({
    model,
    optimisticModelId,
    onSelect,
    disabled,
}: {
    model: ModelMetadata;
    optimisticModelId: string;
    onSelect: (modelId: string) => void;
    disabled: boolean;
}) {
    const badge = getBadge(model);

    return (
        <DropdownMenuItem
            asChild
            data-active={model.id === optimisticModelId}
            data-testid={`model-selector-item-${model.id}`}
            disabled={disabled}
            key={model.id}
            onSelect={() => onSelect(model.id)}
        >
            <button
                className="group/item flex w-full flex-col gap-2"
                type="button"
            >
                <div className="flex w-full flex-row items-center justify-between">
                    <div className="flex flex-col items-start gap-1 text-left">
                        <span className="font-medium text-sm sm:text-base">
                            {model.name}
                        </span>
                        {model.description && (
                            <span className="line-clamp-2 text-muted-foreground text-xs">
                                {model.description}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {badge ? (
                            <span className="rounded-full bg-primary/10 px-2 py-1 text-primary text-xs">
                                {badge}
                            </span>
                        ) : null}

                        <div className="text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
                            <CheckCircleFillIcon />
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
                    <span>{model.providerName}</span>

                    {model.release ? (
                        <span>• Released {model.release}</span>
                    ) : null}

                    {model.contextWindow ? (
                        <span>
                            • Context {model.contextWindow.toLocaleString()}{" "}
                            tokens
                        </span>
                    ) : null}

                    {model.capabilities
                        .filter((capability) => capabilityLabels[capability])
                        .map((capability) => (
                            <span
                                className="rounded bg-muted px-2 py-0.5"
                                key={capability}
                            >
                                {capabilityLabels[capability] ?? capability}
                            </span>
                        ))}

                    {model.price ? <span>• {model.price}</span> : null}
                </div>
            </button>
        </DropdownMenuItem>
    );
}

function groupModelsByProvider(models: ModelMetadata[]): ProviderCatalog[] {
    const grouped = models.reduce<Record<string, ProviderCatalog>>(
        (acc, model) => {
            if (!acc[model.providerId]) {
                acc[model.providerId] = {
                    providerId: model.providerId,
                    displayName: model.providerName,
                    models: [],
                    fetchedAt: "",
                };
            }

            const providerGroup = acc[model.providerId];
            if (providerGroup) {
                providerGroup.models.push(model);
            }
            return acc;
        },
        {}
    );

    return Object.values(grouped).sort((a, b) =>
        a.displayName.localeCompare(b.displayName)
    );
}

export function ModelSelector({
    selectedModelId,
    className,
    availableModels,
}: {
    selectedModelId: string;
    availableModels?: ModelMetadata[];
} & React.ComponentProps<typeof Button>) {
    const [open, setOpen] = useState(false);
    const [optimisticModelId, setOptimisticModelId] =
        useOptimistic(selectedModelId);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const availableChatModels = useMemo(
        () => availableModels ?? [],
        [availableModels]
    );

    const groupedCatalog = useMemo(
        () => groupModelsByProvider(availableChatModels),
        [availableChatModels]
    );

    const selectedChatModel = useMemo(
        () =>
            availableChatModels.find(
                (chatModel) => chatModel.id === optimisticModelId
            ),
        [optimisticModelId, availableChatModels]
    );

    return (
        <DropdownMenu onOpenChange={setOpen} open={open}>
            <DropdownMenuTrigger
                asChild
                className={cn(
                    "w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
                    className
                )}
            >
                <Button
                    className="md:h-[34px] md:px-2"
                    data-testid="model-selector"
                    variant="outline"
                >
                    {selectedChatModel?.name}
                    <ChevronDownIcon />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                className="max-h-[420px] min-w-[360px] max-w-[93vw] overflow-y-auto sm:min-w-[420px]"
            >
                <div className="flex items-center justify-between px-2 pt-1 pb-2 text-muted-foreground text-xs">
                    <div>
                        Choose a model (based on your organization’s
                        entitlements)
                    </div>
                    <Button
                        disabled={isRefreshing}
                        onClick={() => {
                            setIsRefreshing(true);
                            forceRefreshModelCatalog()
                                .catch((error) => {
                                    logError(
                                        "Model catalog refresh failed",
                                        error
                                    );
                                })
                                .finally(() => setIsRefreshing(false));
                        }}
                        size="sm"
                        variant="ghost"
                    >
                        {isRefreshing ? "Refreshing…" : "Refresh"}
                    </Button>
                </div>

                {groupedCatalog.map((providerCatalog) => {
                    return (
                        <div
                            className="border-border/70 border-t px-2 py-2"
                            key={providerCatalog.providerId}
                        >
                            <div className="mb-1 flex items-center justify-between font-medium text-sm">
                                <span>{providerCatalog.displayName}</span>
                                <span className="text-muted-foreground text-xs">
                                    {providerCatalog.models.length} models
                                </span>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                {providerCatalog.models.map((model) =>
                                    renderModelRow({
                                        model,
                                        optimisticModelId,
                                        disabled: false,
                                        onSelect: (id) => {
                                            setOpen(false);
                                            setOptimisticModelId(id);
                                        },
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
