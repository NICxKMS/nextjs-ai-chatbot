/**
 * Sidebar Toggle Component
 *
 * Button to toggle sidebar collapse/expand state with tooltip.
 *
 * @module features/sidebar/components/sidebar-toggle
 */

"use client"

import { PanelLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import type { SidebarToggleProps } from "../types"

/**
 * Sidebar collapse/expand toggle button
 *
 * Provides a button to toggle the sidebar visibility with
 * keyboard shortcut support (Cmd/Ctrl+B) and tooltip.
 */
export function SidebarToggle({ className }: SidebarToggleProps) {
	const { toggleSidebar } = useSidebar()

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					className={cn("h-8 px-2 md:h-fit md:px-2", className)}
					data-testid="sidebar-toggle-button"
					onClick={toggleSidebar}
					variant="outline"
				>
					<PanelLeft size={16} />
				</Button>
			</TooltipTrigger>
			<TooltipContent align="start" className="hidden md:block">
				Toggle Sidebar
			</TooltipContent>
		</Tooltip>
	)
}
