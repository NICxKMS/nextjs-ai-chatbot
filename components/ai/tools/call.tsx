/**
 * AI Tool Call Wrapper Component
 *
 * Project wrapper for ai-elements Tool primitive that adds:
 * - Tool status display
 * - Input/output visualization
 * - Error handling
 * - Custom tool renderers
 *
 * @module components/ai/tools/call
 */

"use client"

import type { ToolUIPart } from "ai"
import type { ReactNode } from "react"
import { CodeBlock } from "@/components/ai-elements/code-block"
import {
	Tool as AIToolBase,
	type ToolProps as AIToolProps,
	ToolContent,
	ToolHeader,
	ToolInput,
} from "@/components/ai-elements/tool"
import { cn } from "@/lib/utils"

/**
 * Extended tool state type
 */
export type ToolState =
	| "input-streaming"
	| "input-available"
	| "approval-requested"
	| "approval-responded"
	| "output-available"
	| "output-error"
	| "output-denied"

/**
 * Props for the AIToolCall wrapper component
 */
export interface AIToolCallProps extends Omit<AIToolProps, "children"> {
	/** The tool call ID */
	toolCallId: string
	/** The tool type/name */
	toolType: string
	/** Current state of the tool call */
	state: ToolState
	/** Tool input parameters */
	input?: unknown
	/** Tool output result */
	output?: unknown
	/** Error text if tool failed */
	errorText?: string
	/** Custom title for the tool */
	title?: string
	/** Whether to start expanded */
	defaultOpen?: boolean
	/** Custom renderer for output */
	renderOutput?: (output: unknown) => ReactNode
	/** Additional class names */
	className?: string
}

/**
 * AI Tool Call wrapper component
 *
 * Displays tool invocations with:
 * - Status badges
 * - Input parameters
 * - Output results
 * - Error handling
 */
export const AIToolCall = ({
	toolCallId,
	toolType,
	state,
	input,
	output,
	errorText,
	title,
	defaultOpen = true,
	renderOutput,
	className,
	...props
}: AIToolCallProps) => {
	return (
		<AIToolBase
			className={cn("not-prose mb-4 w-full rounded-md border", className)}
			defaultOpen={defaultOpen}
			{...props}
		>
			<ToolHeader
				title={title ?? toolType.split("-").slice(1).join("-")}
				type={toolType as ToolUIPart["type"]}
				state={state}
			/>

			<ToolContent>
				{state === "input-available" && input !== undefined && (
					<ToolInput input={input as ToolUIPart["input"]} />
				)}

				{(state === "output-available" || state === "output-error") && (
					<div className="space-y-2 p-4">
						<h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							{errorText ? "Error" : "Result"}
						</h4>
						<div
							className={cn(
								"overflow-x-auto rounded-md text-xs [&_table]:w-full",
								errorText
									? "bg-destructive/10 text-destructive"
									: "bg-muted/50 text-foreground",
							)}
						>
							{errorText && (
								<div className="p-2">{errorText}</div>
							)}
							{output !== undefined &&
								(renderOutput ? (
									renderOutput(output)
								) : (
									<CodeBlock
										code={
											typeof output === "string"
												? output
												: JSON.stringify(
														output,
														null,
														2,
													)
										}
										language="json"
										className="text-xs"
									/>
								))}
						</div>
					</div>
				)}

				{state === "output-denied" && (
					<div className="p-4 text-orange-600 text-sm">
						Tool execution was denied
					</div>
				)}
			</ToolContent>
		</AIToolBase>
	)
}

/**
 * Props for the AIToolCallList component
 */
export interface AIToolCallListProps {
	/** Array of tool calls to display */
	toolCalls: Array<{
		toolCallId: string
		toolType: string
		state: ToolState
		input?: unknown
		output?: unknown
		errorText?: string
	}>
	/** Custom renderer for specific tool types */
	renderers?: Map<string, (output: unknown) => ReactNode>
	/** Additional class names */
	className?: string
}

/**
 * List of tool calls with custom renderers
 */
export const AIToolCallList = ({
	toolCalls,
	renderers = new Map(),
	className,
}: AIToolCallListProps) => {
	return (
		<div className={cn("space-y-4", className)}>
			{toolCalls.map((toolCall) => {
				const renderer = renderers.get(toolCall.toolType)
				return (
					<AIToolCall
						key={toolCall.toolCallId}
						toolCallId={toolCall.toolCallId}
						toolType={toolCall.toolType}
						state={toolCall.state}
						input={toolCall.input}
						output={toolCall.output}
						{...(toolCall.errorText
							? { errorText: toolCall.errorText }
							: {})}
						{...(renderer ? { renderOutput: renderer } : {})}
					/>
				)
			})}
		</div>
	)
}

export type { AIToolProps }
