"use client"

import { type ChangeEvent, useCallback, useId } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useSettings, useSettingsSetter } from "@/features/settings/hooks/use-settings"

// ── Props ───────────────────────────────────────────────────

interface SettingsPanelProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

// ── Main Component ──────────────────────────────────────────

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
	const settings = useSettings()
	const { updateSettings, resetSettings } = useSettingsSetter()

	const temperatureId = useId()
	const topPId = useId()
	const maxTokensId = useId()
	const systemPromptId = useId()
	const reasoningId = useId()

	const handleTemperatureChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			updateSettings({ temperature: Number.parseFloat(e.target.value) })
		},
		[updateSettings],
	)

	const handleTopPChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			updateSettings({ topP: Number.parseFloat(e.target.value) })
		},
		[updateSettings],
	)

	const handleMaxTokensChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			const value = Number.parseInt(e.target.value, 10)
			if (!Number.isNaN(value)) {
				updateSettings({ maxOutputTokens: Math.max(256, Math.min(1_000_000, value)) })
			}
		},
		[updateSettings],
	)

	const handleSystemPromptChange = useCallback(
		(e: ChangeEvent<HTMLTextAreaElement>) => {
			updateSettings({ systemPrompt: e.target.value })
		},
		[updateSettings],
	)

	const handleReasoningToggle = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			updateSettings({ enableReasoning: e.target.checked })
		},
		[updateSettings],
	)

	const handleReset = useCallback(() => {
		resetSettings()
	}, [resetSettings])

	return (
		<Sheet onOpenChange={onOpenChange} open={open}>
			<SheetContent
				aria-describedby={undefined}
				className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md"
				side="right"
			>
				<SheetHeader>
					<SheetTitle>Chat Settings</SheetTitle>
					<SheetDescription>
						Adjust sampling parameters and behavior for AI responses.
					</SheetDescription>
				</SheetHeader>

				<div className="flex flex-1 flex-col gap-6 py-6">
					{/* ── Sampling Parameters ────────────────── */}
					<section aria-label="Sampling parameters" className="space-y-5">
						<div>
							<h3 className="font-semibold text-sm">Sampling</h3>
							<p className="text-muted-foreground text-xs">
								Control how creative or focused the model is.
							</p>
						</div>

						{/* Temperature */}
						<div className="space-y-2">
							<Label
								className="flex items-center justify-between"
								htmlFor={temperatureId}
							>
								<span>Temperature</span>
								<span className="font-normal text-muted-foreground text-xs tabular-nums">
									{settings.temperature.toFixed(2)}
								</span>
							</Label>
							<Slider
								aria-label="Temperature"
								id={temperatureId}
								max={2}
								min={0}
								onChange={handleTemperatureChange}
								step={0.01}
								value={settings.temperature}
							/>
							<p className="text-muted-foreground text-xs">
								Higher values produce more creative responses.
							</p>
						</div>

						{/* Top P */}
						<div className="space-y-2">
							<Label className="flex items-center justify-between" htmlFor={topPId}>
								<span>Top P</span>
								<span className="font-normal text-muted-foreground text-xs tabular-nums">
									{settings.topP.toFixed(2)}
								</span>
							</Label>
							<Slider
								aria-label="Top P"
								id={topPId}
								max={1}
								min={0}
								onChange={handleTopPChange}
								step={0.01}
								value={settings.topP}
							/>
							<p className="text-muted-foreground text-xs">
								Controls diversity via nucleus sampling.
							</p>
						</div>

						{/* Max Output Tokens */}
						<div className="space-y-2">
							<Label
								className="flex items-center justify-between"
								htmlFor={maxTokensId}
							>
								<span>Max Output Tokens</span>
								<span className="font-normal text-muted-foreground text-xs tabular-nums">
									{settings.maxOutputTokens.toLocaleString()}
								</span>
							</Label>
							<Input
								aria-label="Max output tokens"
								id={maxTokensId}
								max={1_000_000}
								min={256}
								onChange={handleMaxTokensChange}
								step={64}
								type="number"
								value={settings.maxOutputTokens}
							/>
							<p className="text-muted-foreground text-xs">
								Maximum number of tokens in the response (256–1,000,000).
							</p>
						</div>
					</section>

					{/* ── System Prompt ───────────────────────── */}
					<section aria-label="System prompt" className="space-y-3">
						<div>
							<h3 className="font-semibold text-sm">System Prompt</h3>
							<p className="text-muted-foreground text-xs">
								Provide instructions that apply to every conversation.
							</p>
						</div>
						<Textarea
							aria-label="System prompt"
							id={systemPromptId}
							maxLength={8192}
							onChange={handleSystemPromptChange}
							placeholder="You are a helpful assistant..."
							rows={4}
							value={settings.systemPrompt}
						/>
					</section>

					{/* ── Behavior ────────────────────────────── */}
					<section aria-label="Behavior settings" className="space-y-3">
						<div>
							<h3 className="font-semibold text-sm">Behavior</h3>
							<p className="text-muted-foreground text-xs">
								Fine-tune runtime behavior for the chat experience.
							</p>
						</div>

						<div className="flex items-center justify-between gap-4 rounded-md border px-3 py-3">
							<div className="space-y-0.5">
								<Label className="cursor-pointer" htmlFor={reasoningId}>
									Enable reasoning
								</Label>
								<p className="text-muted-foreground text-xs">
									Allow reasoning models to stream their thoughts.
								</p>
							</div>
							<Switch
								aria-label="Enable reasoning"
								checked={settings.enableReasoning}
								id={reasoningId}
								onChange={handleReasoningToggle}
							/>
						</div>
					</section>
				</div>

				<SheetFooter className="flex-row gap-2 border-t pt-4">
					<Button onClick={handleReset} type="button" variant="outline">
						Reset to defaults
					</Button>
					<Button onClick={() => onOpenChange(false)} type="button">
						Done
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	)
}
