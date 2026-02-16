/**
 * Model Selector Element Components
 *
 * Compound components for building AI model selection UIs.
 * Uses Command pattern for searchable model selection.
 *
 * @module components/ai-elements/model-selector
 */

import type { ComponentProps, ReactNode } from "react"
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "@/components/ui/command"
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils/index"

export type ModelSelectorProps = ComponentProps<typeof Dialog>

/**
 * Root model selector dialog component.
 */
export const ModelSelector = (props: ModelSelectorProps) => (
	<Dialog {...props} />
)

export type ModelSelectorTriggerProps = ComponentProps<typeof DialogTrigger>

/**
 * Model selector trigger button.
 */
export const ModelSelectorTrigger = (props: ModelSelectorTriggerProps) => (
	<DialogTrigger {...props} />
)

export type ModelSelectorContentProps = ComponentProps<typeof DialogContent> & {
	title?: ReactNode
}

/**
 * Model selector content with command input.
 */
export const ModelSelectorContent = ({
	className,
	children,
	title = "Model Selector",
	...props
}: ModelSelectorContentProps) => (
	<DialogContent className={cn("p-0", className)} {...props}>
		<DialogTitle className="sr-only">{title}</DialogTitle>
		<Command className="**:data-[slot=command-input-wrapper]:h-auto">
			{children}
		</Command>
	</DialogContent>
)

export type ModelSelectorDialogProps = ComponentProps<typeof CommandDialog>

/**
 * Model selector as command dialog.
 */
export const ModelSelectorDialog = (props: ModelSelectorDialogProps) => (
	<CommandDialog {...props} />
)

export type ModelSelectorInputProps = ComponentProps<typeof CommandInput>

/**
 * Model search input component.
 */
export const ModelSelectorInput = ({
	className,
	...props
}: ModelSelectorInputProps) => (
	<CommandInput className={cn("h-auto py-3.5", className)} {...props} />
)

export type ModelSelectorListProps = ComponentProps<typeof CommandList>

/**
 * Model list container.
 */
export const ModelSelectorList = (props: ModelSelectorListProps) => (
	<CommandList {...props} />
)

export type ModelSelectorEmptyProps = ComponentProps<typeof CommandEmpty>

/**
 * Empty state for model search.
 */
export const ModelSelectorEmpty = (props: ModelSelectorEmptyProps) => (
	<CommandEmpty {...props} />
)

export type ModelSelectorGroupProps = ComponentProps<typeof CommandGroup>

/**
 * Model group container.
 */
export const ModelSelectorGroup = (props: ModelSelectorGroupProps) => (
	<CommandGroup {...props} />
)

export type ModelSelectorItemProps = ComponentProps<typeof CommandItem>

/**
 * Individual model selection item.
 */
export const ModelSelectorItem = (props: ModelSelectorItemProps) => (
	<CommandItem {...props} />
)

export type ModelSelectorShortcutProps = ComponentProps<typeof CommandShortcut>

/**
 * Keyboard shortcut indicator.
 */
export const ModelSelectorShortcut = (props: ModelSelectorShortcutProps) => (
	<CommandShortcut {...props} />
)

export type ModelSelectorSeparatorProps = ComponentProps<
	typeof CommandSeparator
>

/**
 * Separator between model groups.
 */
export const ModelSelectorSeparator = (props: ModelSelectorSeparatorProps) => (
	<CommandSeparator {...props} />
)

export type ModelSelectorLogoProps = Omit<
	ComponentProps<"img">,
	"src" | "alt"
> & {
	provider:
		| "openai"
		| "anthropic"
		| "google"
		| "mistral"
		| "meta"
		| "cohere"
		| "perplexity"
		| "deepseek"
		| "xai"
		| "groq"
		| string
}

/**
 * Model provider logo component.
 * Displays the logo for the AI model provider.
 */
export const ModelSelectorLogo = ({
	provider,
	className,
	...props
}: ModelSelectorLogoProps) => {
	// Logo URLs would typically come from a config or CDN
	const logoSrc = `/providers/${provider}.svg`

	return (
		<img
			alt={`${provider} logo`}
			className={cn("size-5", className)}
			src={logoSrc}
			{...props}
		/>
	)
}
