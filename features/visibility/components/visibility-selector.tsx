"use client"

import { type ReactNode, useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { CheckCircleFillIcon, ChevronDownIcon, GlobeIcon, LockIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useChatSessionContext } from "@/features/chat/hooks/use-chat-session-context"
import { updateChatVisibility } from "@/features/visibility/actions/update-visibility"
import type { VisibilityType } from "@/features/visibility/types/visibility.types"
import { cn } from "@/lib/utils/cn"

// ── Visibility options ───────────────────────────────────────

const visibilities: Array<{
	id: VisibilityType
	label: string
	description: string
	icon: ReactNode
}> = [
	{
		id: "private",
		label: "Private",
		description: "Only you can access this chat",
		icon: <LockIcon />,
	},
	{
		id: "public",
		label: "Public",
		description: "Anyone with the link can access this chat",
		icon: <GlobeIcon />,
	},
]

// ── Component ────────────────────────────────────────────────

/**
 * Dropdown selector for toggling chat visibility between Private and Public.
 *
 * Reads `visibility` and `setVisibility` from ChatSessionContext (CV-01 Option A).
 * On selection: instantly updates context, then persists via Server Action.
 * On failure: reverts context + shows toast error.
 *
 * Hidden on mobile (md:flex). Only shown for own chats (not readonly).
 */
export function VisibilitySelector({ className }: { className?: string }) {
	const { chatId, visibility, setVisibility, isReadonly } = useChatSessionContext()
	const [open, setOpen] = useState(false)
	const [isPending, startTransition] = useTransition()

	const selectedVisibility = useMemo(
		() => visibilities.find((v) => v.id === visibility),
		[visibility],
	)

	// Don't render for readonly chats (shared/public viewed by non-owner)
	if (isReadonly) return null

	const handleSelect = (newVisibility: VisibilityType) => {
		if (isPending || newVisibility === visibility) {
			setOpen(false)
			return
		}

		const previousVisibility = visibility

		// Instant context update
		setVisibility(newVisibility)
		setOpen(false)

		// Persist via Server Action in a transition
		startTransition(async () => {
			const result = await updateChatVisibility({
				chatId,
				visibility: newVisibility,
			})

			if (!result.success) {
				// Revert on failure
				setVisibility(previousVisibility)
				toast.error("Failed to update chat visibility")
			}
		})
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
					className="hidden h-8 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 md:flex md:h-fit md:px-2"
					data-testid="visibility-selector"
					disabled={isPending}
					variant="outline"
				>
					{selectedVisibility?.icon}
					<span className="md:sr-only">{selectedVisibility?.label}</span>
					<ChevronDownIcon />
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="start" className="min-w-[300px]">
				{visibilities.map((item) => (
					<DropdownMenuItem
						className="group/item flex flex-row items-center justify-between gap-4"
						data-active={item.id === visibility}
						data-testid={`visibility-selector-item-${item.id}`}
						disabled={isPending}
						key={item.id}
						onSelect={() => handleSelect(item.id)}
					>
						<div className="flex flex-col items-start gap-1">
							{item.label}
							{item.description && (
								<div className="text-muted-foreground text-xs">
									{item.description}
								</div>
							)}
						</div>
						<div className="text-foreground opacity-0 group-data-[active=true]/item:opacity-100 dark:text-foreground">
							<CheckCircleFillIcon />
						</div>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
