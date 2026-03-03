"use client"

import { Settings2Icon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { PlusIcon } from "@/components/icons"
import { SidebarToggle } from "@/components/sidebar-toggle"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useChatSessionContext } from "@/features/chat/hooks/use-chat-session-context"
import { SettingsPanel } from "@/features/settings/components/settings-panel"

export function ChatHeader() {
	const { chatModel, availableModels, isReadonly } = useChatSessionContext()
	const [settingsOpen, setSettingsOpen] = useState(false)
	const modelLabel = availableModels.find((m) => m.id === chatModel)?.name ?? chatModel

	return (
		<header className="sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
			<SidebarToggle />
			{/* Model selector placeholder — functional ModelSelector wired in P6-T05 */}
			<span className="truncate text-sm" data-testid="chat-model-label">
				{modelLabel}
			</span>
			{/* Visibility selector placeholder slot — wired in P6-T08 */}
			{!isReadonly && <div data-slot="visibility-selector" />}

			<div className="ml-auto flex items-center gap-1">
				<Tooltip>
					<TooltipTrigger asChild>
						<Button asChild className="h-8 px-2 md:h-fit md:px-2" variant="outline">
							<Link href="/">
								<PlusIcon size={16} />
								<span className="md:sr-only">New Chat</span>
							</Link>
						</Button>
					</TooltipTrigger>
					<TooltipContent>New Chat</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							className="h-8 px-2 md:h-fit md:px-2"
							onClick={() => setSettingsOpen(true)}
							variant="outline"
						>
							<Settings2Icon className="size-4" />
							<span className="sr-only">Settings</span>
						</Button>
					</TooltipTrigger>
					<TooltipContent>Settings</TooltipContent>
				</Tooltip>
			</div>
			<SettingsPanel onOpenChange={setSettingsOpen} open={settingsOpen} />
		</header>
	)
}
