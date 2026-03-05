"use client"

import { Check, ChevronDown } from "lucide-react"
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
	ModelSelectorContent,
	ModelSelectorEmpty,
	ModelSelectorGroup,
	ModelSelectorInput,
	ModelSelectorItem,
	ModelSelectorList,
	ModelSelectorLogo,
	ModelSelectorName,
	ModelSelector as ModelSelectorRoot,
	ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MODEL_COOKIE_NAME, type ModelMetadata } from "@/features/models/types/model.types"
import { cn } from "@/lib/utils/cn"

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 // 1 year

/** Number of dynamic models to render per animation frame. */
const DYNAMIC_CHUNK_SIZE = 50

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
	/** Show only the provider icon, hiding model name and chevron */
	compact?: boolean
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
	const secure = globalThis.location?.protocol === "https:" ? ";secure" : ""

	// biome-ignore lint/suspicious/noDocumentCookie: Synchronous cookie write required; Cookie Store API is async and would change this function's signature
	document.cookie = `${MODEL_COOKIE_NAME}=${modelId};path=/;max-age=${COOKIE_MAX_AGE_SECONDS};samesite=lax${secure}`

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
	compact,
}: ModelSelectorProps) {
	const [open, setOpen] = useState(false)
	const inputRef = useRef<HTMLInputElement>(null)

	// ── Progressive rendering for large model lists ──────────
	// Static models render immediately; dynamic models load in chunks
	// via requestAnimationFrame + startTransition to keep UI responsive.
	const staticModels = useMemo(() => models.filter((m) => m.source === "static"), [models])
	const dynamicModels = useMemo(() => models.filter((m) => m.source === "dynamic"), [models])
	const [dynamicRenderedCount, setDynamicRenderedCount] = useState(0)

	useEffect(() => {
		if (!open || dynamicModels.length === 0) return

		let count = 0
		let frameId: number

		const scheduleNextChunk = () => {
			count = Math.min(count + DYNAMIC_CHUNK_SIZE, dynamicModels.length)
			const next = count
			startTransition(() => setDynamicRenderedCount(next))
			if (count < dynamicModels.length) {
				frameId = requestAnimationFrame(scheduleNextChunk)
			}
		}

		frameId = requestAnimationFrame(scheduleNextChunk)
		return () => cancelAnimationFrame(frameId)
	}, [open, dynamicModels])

	const visibleModels = useMemo(() => {
		if (dynamicRenderedCount === 0) return staticModels
		return [...staticModels, ...dynamicModels.slice(0, dynamicRenderedCount)]
	}, [staticModels, dynamicModels, dynamicRenderedCount])

	const selectedModel = useMemo(
		() => models.find((m) => m.id === selectedModelId),
		[models, selectedModelId],
	)

	const groupedModels = useMemo(() => groupModelsByProvider(visibleModels), [visibleModels])

	const handleSelect = useCallback(
		(modelId: string) => {
			persistModelSelection(modelId)
			onModelChange(modelId)
			setOpen(false)
		},
		[onModelChange],
	)

	const handleOpenChange = useCallback((nextOpen: boolean) => {
		setOpen(nextOpen)
		if (!nextOpen) setDynamicRenderedCount(0)
	}, [])

	return (
		<ModelSelectorRoot open={open} onOpenChange={handleOpenChange}>
			<ModelSelectorTrigger asChild>
				<Button
					variant="outline"
					size={compact ? "icon" : "sm"}
					className={cn(compact ? "" : "gap-2", className)}
					aria-label="Select AI model"
					data-testid="model-selector"
				>
					{selectedModel ? (
						<>
							<ModelSelectorLogo
								provider={selectedModel.provider}
								className={compact ? "size-4" : "size-3.5"}
							/>
							{!compact && (
								<ModelSelectorName>{selectedModel.name}</ModelSelectorName>
							)}
						</>
					) : (
						<span className="text-muted-foreground">
							{compact ? "?" : "Select model…"}
						</span>
					)}
					{!compact && <ChevronDown className="size-3.5 shrink-0 opacity-50" />}
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
										value={`${model.provider} ${model.providerModelId} ${model.name} ${model.description ?? ""}`}
										onSelect={() => handleSelect(model.id)}
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
