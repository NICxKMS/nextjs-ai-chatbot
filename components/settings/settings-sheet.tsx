"use client"

/**
 * Settings Sheet Component
 *
 * A button that opens a settings sheet.
 * This is a simplified placeholder - full implementation requires settings store.
 *
 * @module components/settings/settings-sheet
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export function SettingsButton({ className }: { className?: string }) {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button
				className={cn("h-8 px-2 md:h-fit md:px-2", className)}
				onClick={() => setOpen(true)}
				type="button"
				variant="outline"
			>
				<svg
					aria-label="Settings"
					className="mr-1 h-4 w-4"
					fill="none"
					height="16"
					role="img"
					stroke="currentColor"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					viewBox="0 0 24 24"
					width="16"
				>
					<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
					<circle cx="12" cy="12" r="3" />
				</svg>
				<span className="md:sr-only">Settings</span>
			</Button>
			<Sheet onOpenChange={setOpen} open={open}>
				<SheetContent
					className="flex w-full flex-col gap-4 sm:max-w-xl"
					side="right"
				>
					<SheetHeader>
						<SheetTitle>Settings</SheetTitle>
					</SheetHeader>
					<div className="flex flex-1 items-center justify-center text-muted-foreground">
						<p className="text-sm">
							Settings configuration coming soon...
						</p>
					</div>
				</SheetContent>
			</Sheet>
		</>
	)
}
