"use client"

import type { LanguageModelUsage } from "ai"

import {
	Context,
	ContextCacheUsage,
	ContextContent,
	ContextContentBody,
	ContextContentFooter,
	ContextContentHeader,
	ContextInputUsage,
	ContextOutputUsage,
	ContextReasoningUsage,
	ContextTrigger,
} from "@/components/ai-elements/context"
import { useSettingsSelector } from "@/features/settings/hooks/use-settings"

interface ContextDisplayProps {
	usedTokens: number
	maxTokens: number
	usage?: LanguageModelUsage
	modelId?: string
}

export function ContextDisplay({ usedTokens, maxTokens, usage, modelId }: ContextDisplayProps) {
	const isDetailed = useSettingsSelector((settings) => settings.contextDisplayMode === "detailed")
	const temperature = useSettingsSelector((settings) => settings.temperature)
	const topP = useSettingsSelector((settings) => settings.topP)
	const maxOutputTokens = useSettingsSelector((settings) => settings.maxOutputTokens)
	const enableReasoning = useSettingsSelector((settings) => settings.enableReasoning)

	return (
		<Context usedTokens={usedTokens} maxTokens={maxTokens} usage={usage} modelId={modelId}>
			<ContextTrigger className="h-7 px-1.5 text-xs opacity-70 hover:opacity-100" />
			<ContextContent>
				<ContextContentHeader />
				{isDetailed && (
					<div className="rounded-md border px-3 py-2 space-y-1">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
							Runtime Settings
						</p>
						<div className="flex justify-between text-xs">
							<span className="text-muted-foreground">Temperature</span>
							<span className="font-medium">{temperature.toFixed(2)}</span>
						</div>
						<div className="flex justify-between text-xs">
							<span className="text-muted-foreground">Top P</span>
							<span className="font-medium">{topP.toFixed(2)}</span>
						</div>
						<div className="flex justify-between text-xs">
							<span className="text-muted-foreground">Max tokens</span>
							<span className="font-medium">{maxOutputTokens.toLocaleString()}</span>
						</div>
						<div className="flex justify-between text-xs">
							<span className="text-muted-foreground">Reasoning</span>
							<span className="font-medium">
								{enableReasoning ? "Enabled" : "Disabled"}
							</span>
						</div>
					</div>
				)}
				<ContextContentBody>
					<ContextInputUsage />
					<ContextOutputUsage />
					<ContextReasoningUsage />
					<ContextCacheUsage />
				</ContextContentBody>
				<ContextContentFooter />
			</ContextContent>
		</Context>
	)
}
