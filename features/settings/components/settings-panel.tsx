"use client"

import { useId } from "react"
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
import { useSettingsSelector, useSettingsSetter } from "@/features/settings/hooks/use-settings"

// ── Props ───────────────────────────────────────────────────

interface SettingsPanelProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

function clampOutputTokens(value: number): number {
	return Math.max(256, Math.min(1_000_000, value))
}

function TemperatureField() {
	const temperature = useSettingsSelector((settings) => settings.temperature)
	const { updateSettings } = useSettingsSetter()
	const temperatureId = useId()

	return (
		<div className="space-y-2">
			<Label className="flex items-center justify-between" htmlFor={temperatureId}>
				<span>Temperature</span>
				<span className="font-normal text-muted-foreground text-xs tabular-nums">
					{temperature.toFixed(2)}
				</span>
			</Label>
			<Slider
				aria-label="Temperature"
				id={temperatureId}
				max={2}
				min={0}
				onChange={(event) => {
					updateSettings({
						temperature: Number.parseFloat(event.target.value),
					})
				}}
				step={0.01}
				value={temperature}
			/>
			<p className="text-muted-foreground text-xs">
				Higher values produce more creative responses.
			</p>
		</div>
	)
}

function TopPField() {
	const topP = useSettingsSelector((settings) => settings.topP)
	const { updateSettings } = useSettingsSetter()
	const topPId = useId()

	return (
		<div className="space-y-2">
			<Label className="flex items-center justify-between" htmlFor={topPId}>
				<span>Top P</span>
				<span className="font-normal text-muted-foreground text-xs tabular-nums">
					{topP.toFixed(2)}
				</span>
			</Label>
			<Slider
				aria-label="Top P"
				id={topPId}
				max={1}
				min={0}
				onChange={(event) => {
					updateSettings({ topP: Number.parseFloat(event.target.value) })
				}}
				step={0.01}
				value={topP}
			/>
			<p className="text-muted-foreground text-xs">
				Controls diversity via nucleus sampling.
			</p>
		</div>
	)
}

function MaxOutputTokensField() {
	const maxOutputTokens = useSettingsSelector((settings) => settings.maxOutputTokens)
	const { updateSettings } = useSettingsSetter()
	const maxTokensId = useId()

	return (
		<div className="space-y-2">
			<Label className="flex items-center justify-between" htmlFor={maxTokensId}>
				<span>Max Output Tokens</span>
				<span className="font-normal text-muted-foreground text-xs tabular-nums">
					{maxOutputTokens.toLocaleString()}
				</span>
			</Label>
			<Input
				aria-label="Max output tokens"
				id={maxTokensId}
				max={1_000_000}
				min={256}
				onChange={(event) => {
					const value = Number.parseInt(event.target.value, 10)

					if (!Number.isNaN(value)) {
						updateSettings({
							maxOutputTokens: clampOutputTokens(value),
						})
					}
				}}
				step={64}
				type="number"
				value={maxOutputTokens}
			/>
			<p className="text-muted-foreground text-xs">
				Maximum number of tokens in the response (256–1,000,000).
			</p>
		</div>
	)
}

function SystemPromptField() {
	const systemPrompt = useSettingsSelector((settings) => settings.systemPrompt)
	const { updateSettings } = useSettingsSetter()
	const systemPromptId = useId()

	return (
		<Textarea
			aria-label="System prompt"
			id={systemPromptId}
			maxLength={8192}
			onChange={(event) => {
				updateSettings({ systemPrompt: event.target.value })
			}}
			placeholder="You are a helpful assistant..."
			rows={4}
			value={systemPrompt}
		/>
	)
}

function EnableReasoningField() {
	const enableReasoning = useSettingsSelector((settings) => settings.enableReasoning)
	const { updateSettings } = useSettingsSetter()
	const reasoningId = useId()

	return (
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
				checked={enableReasoning}
				id={reasoningId}
				onCheckedChange={(checked) => {
					updateSettings({ enableReasoning: checked })
				}}
			/>
		</div>
	)
}

function ContextDisplayModeField() {
	const isDetailed = useSettingsSelector((settings) => settings.contextDisplayMode === "detailed")
	const { updateSettings } = useSettingsSetter()
	const contextDisplayId = useId()

	return (
		<div className="flex items-center justify-between gap-4 rounded-md border px-3 py-3">
			<div className="space-y-0.5">
				<Label className="cursor-pointer" htmlFor={contextDisplayId}>
					Detailed token usage
				</Label>
				<p className="text-muted-foreground text-xs">
					Show token usage inline instead of on hover.
				</p>
			</div>
			<Switch
				aria-label="Detailed token usage"
				checked={isDetailed}
				id={contextDisplayId}
				onCheckedChange={(checked) => {
					updateSettings({
						contextDisplayMode: checked ? "detailed" : "compact",
					})
				}}
			/>
		</div>
	)
}

// ── Main Component ──────────────────────────────────────────

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
	const { resetSettings } = useSettingsSetter()

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

						<TemperatureField />
						<TopPField />
						<MaxOutputTokensField />
					</section>

					{/* ── System Prompt ───────────────────────── */}
					<section aria-label="System prompt" className="space-y-3">
						<div>
							<h3 className="font-semibold text-sm">System Prompt</h3>
							<p className="text-muted-foreground text-xs">
								Provide instructions that apply to every conversation.
							</p>
						</div>
						<SystemPromptField />
					</section>

					{/* ── Behavior ────────────────────────────── */}
					<section aria-label="Behavior settings" className="space-y-3">
						<div>
							<h3 className="font-semibold text-sm">Behavior</h3>
							<p className="text-muted-foreground text-xs">
								Fine-tune runtime behavior for the chat experience.
							</p>
						</div>

						<EnableReasoningField />
						<ContextDisplayModeField />
					</section>
				</div>

				<SheetFooter className="flex-row gap-2 border-t pt-4">
					<Button onClick={resetSettings} type="button" variant="outline">
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
