/**
 * Theme Toggle Component
 *
 * A component for selecting theme preference (light, dark, system).
 *
 * @module features/settings/components/theme-toggle
 */

"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ThemeMode, ThemeToggleProps } from "../types"

// =============================================================================
// Theme Toggle Component
// =============================================================================

/**
 * Theme toggle component with visual previews
 */
export function ThemeToggle({
	value,
	onChange,
	disabled = false,
}: ThemeToggleProps) {
	const options: Array<{
		value: ThemeMode
		label: string
		icon: typeof Sun
		description: string
	}> = [
		{
			value: "light",
			label: "Light",
			icon: Sun,
			description: "Light theme",
		},
		{
			value: "dark",
			label: "Dark",
			icon: Moon,
			description: "Dark theme",
		},
		{
			value: "system",
			label: "System",
			icon: Monitor,
			description: "Follow system preference",
		},
	]

	return (
		<div
			className={cn(
				"flex gap-2",
				disabled && "opacity-50 pointer-events-none",
			)}
		>
			{options.map((option) => {
				const Icon = option.icon
				const isSelected = value === option.value

				return (
					<button
						className={cn(
							"flex flex-1 flex-col items-center gap-2 rounded-lg border p-3 transition-colors",
							isSelected
								? "border-primary bg-primary/10 text-primary"
								: "border-border hover:border-primary/50 hover:bg-accent",
						)}
						disabled={disabled}
						key={option.value}
						onClick={() => onChange(option.value)}
						type="button"
						aria-pressed={isSelected}
						aria-label={option.description}
					>
						<Icon className="h-5 w-5" />
						<span className="font-medium text-sm">
							{option.label}
						</span>
					</button>
				)
			})}
		</div>
	)
}

// =============================================================================
// Theme Toggle Button Component
// =============================================================================

interface ThemeToggleButtonProps {
	/** Current theme */
	theme: ThemeMode
	/** Callback when theme changes */
	onThemeChange: (theme: ThemeMode) => void
	/** Optional className */
	className?: string
}

/**
 * Compact theme toggle button for use in headers/toolbars
 */
export function ThemeToggleButton({
	theme,
	onThemeChange,
	className,
}: ThemeToggleButtonProps) {
	const cycleTheme = () => {
		const themes: ThemeMode[] = ["light", "dark", "system"]
		const currentIndex = themes.indexOf(theme)
		const nextIndex = (currentIndex + 1) % themes.length
		onThemeChange(themes[nextIndex] as ThemeMode)
	}

	const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor
	const label =
		theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System"

	return (
		<button
			className={cn(
				"inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors",
				className,
			)}
			onClick={cycleTheme}
			type="button"
			aria-label={`Current theme: ${label}. Click to change.`}
		>
			<Icon className="h-4 w-4" />
			<span className="hidden sm:inline">{label}</span>
		</button>
	)
}
