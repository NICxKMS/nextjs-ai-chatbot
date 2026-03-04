"use client"

import { Check, ChevronDown } from "lucide-react"
import { useCallback, useMemo, useRef, useState } from "react"

import {
	ModelSelectorContent,
	ModelSelectorEmpty,
	ModelSelectorGroup,
	ModelSelectorInput,
	ModelSelectorItem,
	ModelSelectorList,
	ModelSelectorLogo,
	ModelSelectorName,
	ModelSelectorRoot,
	ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MODEL_COOKIE_NAME, type ModelMetadata } from "@/features/models/types/model.types"
import { cn } from "@/lib/utils/cn"

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 // 1 year

// ── Types ───────────────────────────────────────────────────────────────────

export interface ModelSelectorProps {
	/** Currently selected model ID (e.g. "google:gemini-2.5-flash") */
	selectedModelId: string
	/** Callback when user selects a different model */
	onModelChange: (modelId: string) => void
	/** Available models to display */
	models: ModelMetadata[]
	/** Additional CSS classes for the trigger button */
	className?: string
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
	google: "Google",
	openai: "OpenAI",
	openrouter: "OpenRouter",
	anthropic: "Anthropic",
	deepseek: "DeepSeek",
	mistral: "Mistral",
}

function formatProviderName(provider: string): string {
	return PROVIDER_DISPLAY_NAMES[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1)
}

function groupModelsByProvider(models: ModelMetadata[]): Map<string, ModelMetadata[]> {
	const groups = new Map<string, ModelMetadata[]>()
	for (const model of models) {
		const existing = groups.get(model.provider)
		if (existing) {
			existing.push(model)
		} else {
			groups.set(model.provider, [model])
		}
	}
	return groups
}

/**
 * Persist model selection to cookie (server-readable) and localStorage.
 *
 * Cookie is read server-side by `getDefaultModel()` in `features/models/lib/models.ts`.
 * localStorage provides fast client-side reads.
 */
function persistModelSelection(modelId: string): void {
	// biome-ignore lint/suspicious/noDocumentCookie: Synchronous cookie write required; Cookie Store API is async and would change this function's signature
	document.cookie = `${MODEL_COOKIE_NAME}=${encodeURIComponent(modelId)};path=/;max-age=${COOKIE_MAX_AGE_SECONDS};samesite=lax`

	try {
		localStorage.setItem(MODEL_COOKIE_NAME, modelId)
	} catch {
		// localStorage may be unavailable (private browsing, storage limit exceeded)
	}
}

// ── Component ───────────────────────────────────────────────────────────────

/**
 * Model selector — searchable dropdown grouped by provider.
 *
 * Displays available AI models with name, description, provider logo, and
 * capability badges. Selection persists to both cookie (server-readable)
 * and localStorage. Models are passed via props from the server
 * (fetched via `getAvailableModels()`).
 */
export function ModelSelector({
	selectedModelId,
	onModelChange,
	models,
	className,
}: ModelSelectorProps) {
	const [open, setOpen] = useState(false)
	const [search, setSearch] = useState("")
	const inputRef = useRef<HTMLInputElement>(null)

	const selectedModel = useMemo(
		() => models.find((m) => m.id === selectedModelId),
		[models, selectedModelId],
	)

	const filteredModels = useMemo(() => {
		const query = search.trim().toLowerCase()
		if (!query) return models
		return models.filter(
			(m) =>
				m.name.toLowerCase().includes(query) ||
				m.description?.toLowerCase().includes(query) ||
				m.provider.toLowerCase().includes(query) ||
				m.providerModelId.toLowerCase().includes(query),
		)
	}, [models, search])

	const groupedModels = useMemo(() => groupModelsByProvider(filteredModels), [filteredModels])

	const handleSelect = useCallback(
		(modelId: string) => {
			persistModelSelection(modelId)
			onModelChange(modelId)
			setOpen(false)
			setSearch("")
		},
		[onModelChange],
	)

	const handleOpenChange = useCallback((nextOpen: boolean) => {
		setOpen(nextOpen)
		if (!nextOpen) {
			setSearch("")
		}
	}, [])

	return (
		<ModelSelectorRoot open={open} onOpenChange={handleOpenChange}>
			<ModelSelectorTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className={cn("gap-2", className)}
					aria-label="Select AI model"
					data-testid="model-selector"
				>
					{selectedModel ? (
						<>
							<ModelSelectorLogo
								provider={selectedModel.provider}
								className="size-3.5"
							/>
							<ModelSelectorName>{selectedModel.name}</ModelSelectorName>
						</>
					) : (
						<span className="text-muted-foreground">Select model…</span>
					)}
					<ChevronDown className="size-3.5 shrink-0 opacity-50" />
				</Button>
			</ModelSelectorTrigger>

			<ModelSelectorContent
				onOpenAutoFocus={(e) => {
					e.preventDefault()
					inputRef.current?.focus()
				}}
			>
				<ModelSelectorInput
					ref={inputRef}
					placeholder="Search models…"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					aria-label="Search models"
				/>

				<ModelSelectorList aria-label="Available models">
					{groupedModels.size === 0 ? (
						<ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
					) : (
						Array.from(groupedModels.entries()).map(([provider, providerModels]) => (
							<ModelSelectorGroup
								key={provider}
								heading={formatProviderName(provider)}
							>
								{providerModels.map((model) => (
									<ModelSelectorItem
										key={model.id}
										selected={model.id === selectedModelId}
										onClick={() => handleSelect(model.id)}
									>
										<div className="flex flex-1 flex-col gap-1">
											<div className="flex items-center gap-2">
												<ModelSelectorLogo
													provider={model.provider}
													className="size-3.5"
												/>
												<ModelSelectorName className="font-medium">
													{model.name}
												</ModelSelectorName>
												{model.id === selectedModelId && (
													<Check className="ml-auto size-4 shrink-0" />
												)}
											</div>
											{model.description && (
												<p className="line-clamp-1 text-muted-foreground text-xs">
													{model.description}
												</p>
											)}
											<CapabilityBadges model={model} />
										</div>
									</ModelSelectorItem>
								))}
							</ModelSelectorGroup>
						))
					)}
				</ModelSelectorList>
			</ModelSelectorContent>
		</ModelSelectorRoot>
	)
}

// ── Capability Badges ───────────────────────────────────────────────────────

function CapabilityBadges({ model }: { model: ModelMetadata }) {
	const badges: string[] = []

	if (model.supportsToolCalling) badges.push("Tools")
	if (model.supportsReasoning) badges.push("Reasoning")
	if (model.modalities.input.includes("image")) badges.push("Vision")
	if (model.modalities.input.includes("audio")) badges.push("Audio")

	if (badges.length === 0) return null

	return (
		<div className="flex flex-wrap gap-1">
			{badges.map((badge) => (
				<Badge key={badge} variant="secondary" className="px-1.5 py-0 text-[10px]">
					{badge}
				</Badge>
			))}
		</div>
	)
}
