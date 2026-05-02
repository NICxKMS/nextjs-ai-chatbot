"use client"

import { Settings2Icon } from "lucide-react"
import Link from "next/link"
import { memo, useEffect, useRef, useState } from "react"
import { PlusIcon } from "@/components/icons"
import { SidebarToggle } from "@/components/sidebar-toggle"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useChatSessionContext } from "@/features/chat/hooks/use-chat-session-context"
import { ModelSelector } from "@/features/models/components/model-selector"
import { SettingsPanel } from "@/features/settings/components/settings-panel"
import { VisibilitySelector } from "@/features/visibility/components/visibility-selector"

export const ChatHeader = memo(function ChatHeader() {
	const { chatModel, setChatModel, availableModels } = useChatSessionContext()
	const [settingsOpen, setSettingsOpen] = useState(false)
	const settingsButtonRef = useRef<HTMLButtonElement>(null)
	const wasSettingsOpenRef = useRef(false)

	useEffect(() => {
		if (wasSettingsOpenRef.current && !settingsOpen) {
			settingsButtonRef.current?.focus()
		}

		wasSettingsOpenRef.current = settingsOpen
	}, [settingsOpen])

	return (
		<header
			className="sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2"
			data-testid="chat-header"
		>
			<SidebarToggle />
			<ModelSelector
				className="relative min-w-0 after:absolute after:-inset-1 after:md:hidden"
				selectedModelId={chatModel}
				onModelChange={setChatModel}
				models={availableModels}
			/>
			<VisibilitySelector />

			<div className="ml-auto flex items-center gap-1">
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							asChild
							className="relative h-8 px-2 after:absolute after:-inset-1.5 after:md:hidden md:h-fit md:px-2"
							variant="outline"
						>
							<Link href="/" data-testid="new-chat-button">
								<PlusIcon size={16} />
								<span className="sr-only">New Chat</span>
							</Link>
						</Button>
					</TooltipTrigger>
					<TooltipContent>New Chat</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							className="relative h-8 px-2 after:absolute after:-inset-1.5 after:md:hidden md:h-fit md:px-2"
							onClick={() => setSettingsOpen(true)}
							ref={settingsButtonRef}
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
})
