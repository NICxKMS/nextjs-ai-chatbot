/**
 * Model Selector Component
 *
 * A dropdown component for selecting AI models with support for
 * grouping by provider, capability badges, and optimistic updates.
 *
 * @module features/settings/components/model-selector
 */

"use client"

import { useMemo, useOptimistic, useState } from "react"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { ModelOption, ModelSelectorProps } from "../types"

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get badge text for a model
 */
function getBadge(model: ModelOption): string | null {
	if (model.isCurated) {
		return "Featured"
	}

	if (model.source === "discovered") {
		return "Live"
	}

	return null
}

/**
 * Capability display labels
 */
const capabilityLabels: Record<string, string> = {
	reasoning: "Reasoning",
	vision: "Vision",
	audio: "Audio",
	multimodal: "Multimodal",
	code: "Code",
	"function-calling": "Tools",
	streaming: "Streaming",
	chat: "Chat",
}

// =============================================================================
// Model Row Component
// =============================================================================

interface ModelRowProps {
	model: ModelOption
	optimisticModelId: string
	onSelect: (modelId: string) => void
	disabled: boolean
}

/**
 * Render a single model option row
 */
function ModelRow({
	model,
	optimisticModelId,
	onSelect,
	disabled,
}: ModelRowProps) {
	const badge = getBadge(model)

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
						{model.description ? (
							<span className="line-clamp-2 text-muted-foreground text-xs">
								{model.description}
							</span>
						) : null}
					</div>

					<div className="flex items-center gap-2">
						{badge ? (
							<span className="rounded-full bg-primary/10 px-2 py-1 text-primary text-xs">
								{badge}
							</span>
						) : null}

						<div className="text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
							✓
						</div>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
					<span>{model.provider}</span>

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
	)
}

// =============================================================================
// Provider Group Type
// =============================================================================

interface ProviderGroup {
	providerId: string
	displayName: string
	models: ModelOption[]
}

/**
 * Group models by provider
 */
function groupModelsByProvider(models: ModelOption[]): ProviderGroup[] {
	const grouped = models.reduce<Record<string, ProviderGroup>>(
		(acc, model) => {
			const providerId = model.providerId ?? model.provider.toLowerCase()
			if (!acc[providerId]) {
				acc[providerId] = {
					providerId,
					displayName: model.provider,
					models: [],
				}
			}

			const providerGroup = acc[providerId]
			if (providerGroup) {
				providerGroup.models.push(model)
			}
			return acc
		},
		{},
	)

	return Object.values(grouped).sort((a, b) =>
		a.displayName.localeCompare(b.displayName),
	)
}

// =============================================================================
// Model Selector Component
// =============================================================================

/**
 * Model selector dropdown component
 */
export function ModelSelector({
	selectedModelId,
	availableModels,
	onModelChange,
	className,
}: ModelSelectorProps) {
	const [open, setOpen] = useState(false)
	const [optimisticModelId, setOptimisticModelId] =
		useOptimistic(selectedModelId)

	const availableChatModels = useMemo(
		() => availableModels ?? [],
		[availableModels],
	)

	const groupedCatalog = useMemo(
		() => groupModelsByProvider(availableChatModels),
		[availableChatModels],
	)

	const selectedChatModel = useMemo(
		() =>
			availableChatModels.find(
				(chatModel) => chatModel.id === optimisticModelId,
			),
		[optimisticModelId, availableChatModels],
	)

	const handleSelect = (modelId: string) => {
		setOpen(false)
		setOptimisticModelId(modelId)
		onModelChange?.(modelId)
	}

	return (
		<DropdownMenu onOpenChange={setOpen} open={open}>
			<DropdownMenuTrigger
				asChild
				className={cn(
					"w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
					className,
				)}
			>
				<Button
					className="md:h-[34px] md:px-2"
					data-testid="model-selector"
					suppressHydrationWarning
					variant="outline"
				>
					{selectedChatModel?.name ?? "Select model"}
					<span className="ml-1">▼</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				className="max-h-[420px] min-w-[360px] max-w-[93vw] overflow-y-auto sm:min-w-[420px]"
			>
				<div className="flex items-center justify-between px-2 pt-1 pb-2 text-muted-foreground text-xs">
					<div>
						Choose a model (based on your organization's
						entitlements)
					</div>
				</div>

				{groupedCatalog.map((providerGroup) => (
					<div
						className="border-border/70 border-t px-2 py-2"
						key={providerGroup.providerId}
					>
						<div className="mb-1 flex items-center justify-between font-medium text-sm">
							<span>{providerGroup.displayName}</span>
							<span className="text-muted-foreground text-xs">
								{providerGroup.models.length} models
							</span>
						</div>

						<div className="flex flex-col gap-1.5">
							{providerGroup.models.map((model) => (
								<ModelRow
									disabled={false}
									key={model.id}
									model={model}
									optimisticModelId={optimisticModelId}
									onSelect={handleSelect}
								/>
							))}
						</div>
					</div>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
