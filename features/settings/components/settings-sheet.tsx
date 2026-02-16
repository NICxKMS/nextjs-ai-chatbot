/**
 * Settings Sheet Component
 *
 * A slide-out panel for managing user settings including sampling,
 * system prompt, and behavior options.
 *
 * @module features/settings/components/settings-sheet
 */

"use client"

import { Settings2Icon } from "lucide-react"
import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useAppSettings } from "../hooks"
import type {
	AppSettings,
	SettingsButtonProps,
	SettingsSheetProps,
} from "../types"

// =============================================================================
// Settings Button Component
// =============================================================================

/**
 * Settings button that opens the settings sheet
 */
export function SettingsButton({ className }: SettingsButtonProps) {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button
				className={className}
				onClick={() => setOpen(true)}
				type="button"
				variant="outline"
			>
				<Settings2Icon className="mr-1 h-4 w-4" />
				Settings
			</Button>
			<SettingsSheet open={open} onOpenChange={setOpen} />
		</>
	)
}

// =============================================================================
// Settings Sheet Component
// =============================================================================

/**
 * Settings sheet panel
 */
export function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
	const { settings, updateSettings, resetSettings, isUpdating } =
		useAppSettings()

	const handleSamplingChange = useCallback(
		(partial: Partial<AppSettings["sampling"]>) => {
			updateSettings({
				sampling: { ...settings.sampling, ...partial },
			})
		},
		[settings.sampling, updateSettings],
	)

	const handleNumericInput = useCallback(
		(
			event: React.ChangeEvent<HTMLInputElement>,
			updater: (value: number) => void,
		) => {
			const value = Number.parseFloat(event.target.value)
			if (Number.isNaN(value)) {
				return
			}
			updater(value)
		},
		[],
	)

	return (
		<Sheet onOpenChange={onOpenChange} open={open}>
			<SheetContent
				className="flex w-full flex-col gap-4 sm:max-w-xl"
				side="right"
			>
				<SheetHeader>
					<SheetTitle>Settings</SheetTitle>
				</SheetHeader>

				{/* Sampling Section */}
				<section className="space-y-4">
					<header>
						<h3 className="font-semibold text-sm">Sampling</h3>
						<p className="text-muted-foreground text-xs">
							Adjust how creative or focused the model should be.
						</p>
					</header>

					<div className="space-y-2">
						<Label className="flex items-center justify-between font-medium text-xs">
							<span>Temperature</span>
							<span className="text-muted-foreground text-xs">
								{settings.sampling.temperature.toFixed(2)}
							</span>
						</Label>
						<Input
							max={1.5}
							min={0}
							onChange={(event) =>
								handleNumericInput(event, (value) =>
									handleSamplingChange({
										temperature: Math.min(
											1.5,
											Math.max(
												0,
												Number(value.toFixed(2)),
											),
										),
									}),
								)
							}
							step={0.01}
							type="number"
							value={settings.sampling.temperature}
							disabled={isUpdating}
						/>
					</div>

					<div className="space-y-2">
						<Label className="flex items-center justify-between font-medium text-xs">
							<span>Top P</span>
							<span className="text-muted-foreground text-xs">
								{settings.sampling.topP.toFixed(2)}
							</span>
						</Label>
						<Input
							max={1}
							min={0}
							onChange={(event) =>
								handleNumericInput(event, (value) =>
									handleSamplingChange({
										topP: Math.min(
											1,
											Math.max(
												0,
												Number(value.toFixed(2)),
											),
										),
									}),
								)
							}
							step={0.01}
							type="number"
							value={settings.sampling.topP}
							disabled={isUpdating}
						/>
					</div>

					<div className="space-y-2">
						<Label className="flex items-center justify-between font-medium text-xs">
							<span>Max Output Tokens</span>
							<span className="text-muted-foreground text-xs">
								{settings.sampling.maxOutputTokens.toLocaleString()}
							</span>
						</Label>
						<Input
							max={1_000_000}
							min={256}
							onChange={(event) =>
								handleNumericInput(event, (value) =>
									handleSamplingChange({
										maxOutputTokens: Math.round(
											Math.min(
												1_000_000,
												Math.max(256, value),
											),
										),
									}),
								)
							}
							step={64}
							type="number"
							value={settings.sampling.maxOutputTokens}
							disabled={isUpdating}
						/>
					</div>
				</section>

				{/* System Prompt Section */}
				<section className="space-y-2">
					<header>
						<h3 className="font-semibold text-sm">System Prompt</h3>
						<p className="text-muted-foreground text-xs">
							Provide baseline instructions that apply to every
							conversation.
						</p>
					</header>
					<Textarea
						onChange={(
							event: React.ChangeEvent<HTMLTextAreaElement>,
						) =>
							updateSettings({ systemPrompt: event.target.value })
						}
						placeholder="You are a helpful assistant..."
						rows={4}
						value={settings.systemPrompt}
						disabled={isUpdating}
					/>
				</section>

				{/* Behavior Section */}
				<section className="space-y-3">
					<header>
						<h3 className="font-semibold text-sm">Behavior</h3>
						<p className="text-muted-foreground text-xs">
							Fine-tune runtime options for the chat experience.
						</p>
					</header>

					<SettingToggle
						checked={settings.enableReasoning}
						description="Allow reasoning models to stream their thoughts."
						label="Enable reasoning"
						onCheckedChange={(value) =>
							updateSettings({ enableReasoning: value })
						}
						disabled={isUpdating}
					/>

					<SettingToggle
						checked={settings.streamArtifacts}
						description="Stream artifact updates in real time while generating."
						label="Stream artifacts"
						onCheckedChange={(value) =>
							updateSettings({ streamArtifacts: value })
						}
						disabled={isUpdating}
					/>

					<SettingToggle
						checked={settings.autoScroll}
						description="Automatically follow the latest assistant response."
						label="Auto-scroll conversation"
						onCheckedChange={(value) =>
							updateSettings({ autoScroll: value })
						}
						disabled={isUpdating}
					/>
				</section>

				<SheetFooter className="mt-auto flex flex-col gap-2 sm:flex-row">
					<Button
						onClick={() => {
							resetSettings()
						}}
						type="button"
						variant="outline"
						disabled={isUpdating}
					>
						Reset to defaults
					</Button>
					<Button
						onClick={() => onOpenChange(false)}
						type="button"
						disabled={isUpdating}
					>
						Close
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	)
}

// =============================================================================
// Setting Toggle Component
// =============================================================================

interface SettingToggleProps {
	checked: boolean
	onCheckedChange: (value: boolean) => void
	label: string
	description?: string
	disabled?: boolean
}

/**
 * Toggle setting component with label and description
 */
function SettingToggle({
	checked,
	onCheckedChange,
	label,
	description,
	disabled,
}: SettingToggleProps) {
	return (
		<div className="flex items-start justify-between gap-4 rounded-md border px-3 py-2">
			<div>
				<span className="font-medium text-sm">{label}</span>
				{description ? (
					<p className="text-muted-foreground text-xs">
						{description}
					</p>
				) : null}
			</div>
			<Button
				aria-pressed={checked}
				className={cn(
					"h-6 w-12 rounded-full px-1 text-xs",
					checked ? "bg-primary text-primary-foreground" : "bg-muted",
				)}
				onClick={() => onCheckedChange(!checked)}
				type="button"
				variant="ghost"
				disabled={disabled}
			>
				{checked ? "On" : "Off"}
			</Button>
		</div>
	)
}
