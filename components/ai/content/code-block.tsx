/**
 * AI Code Block Wrapper Component
 *
 * Project wrapper for ai-elements CodeBlock primitive that adds:
 * - Copy functionality with toast notification
 * - Run action support for executable code
 * - Language badge display
 * - Streaming state handling
 *
 * @module components/ai/content/code-block
 */

"use client"

import type { HTMLAttributes } from "react"
import {
	CodeBlock as AICodeBlockBase,
	CodeBlockCopyButton as AICodeBlockCopyButtonBase,
} from "@/components/ai-elements/code-block"
import { cn } from "@/lib/utils"

/**
 * BundledLanguage type from shiki
 */
export type BundledLanguage = string

/**
 * Props for the AICodeBlock wrapper component
 */
export interface AICodeBlockWrapperProps
	extends Omit<HTMLAttributes<HTMLDivElement>, "language"> {
	/** The code content to display */
	code: string
	/** Programming language for syntax highlighting */
	language: BundledLanguage
	/** Whether to show line numbers */
	showLineNumbers?: boolean
	/** Whether the code is currently streaming */
	isStreaming?: boolean
	/** Whether to show the copy button */
	showCopyButton?: boolean
	/** Whether to show the language badge */
	showLanguageBadge?: boolean
	/** Callback when copy is triggered */
	onCopy?: () => void
	/** Callback when run is triggered (if applicable) */
	onRun?: () => void
	/** Whether to show the run button */
	showRunButton?: boolean
	/** Additional class names */
	className?: string
}

/**
 * Language display names mapping
 */
const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
	ts: "TypeScript",
	tsx: "TypeScript React",
	js: "JavaScript",
	jsx: "JavaScript React",
	py: "Python",
	rs: "Rust",
	go: "Go",
	java: "Java",
	cpp: "C++",
	c: "C",
	css: "CSS",
	scss: "SCSS",
	html: "HTML",
	json: "JSON",
	md: "Markdown",
	sql: "SQL",
	bash: "Bash",
	sh: "Shell",
	yaml: "YAML",
	yml: "YAML",
	toml: "TOML",
	dockerfile: "Dockerfile",
}

/**
 * Get display name for a language
 */
function getLanguageDisplayName(language: string): string {
	return LANGUAGE_DISPLAY_NAMES[language] ?? language.toUpperCase()
}

/**
 * AI Code Block wrapper component with copy and run actions
 */
export const AICodeBlock = ({
	code,
	language,
	showLineNumbers = false,
	isStreaming = false,
	showCopyButton = true,
	showLanguageBadge = true,
	onCopy,
	onRun,
	showRunButton = false,
	className,
	children,
	...props
}: AICodeBlockWrapperProps) => {
	return (
		<div className={cn("relative", className)}>
			{/* Language badge */}
			{showLanguageBadge && (
				<div className="absolute top-0 left-0 z-10 rounded-br-md rounded-tl-md bg-muted px-2 py-0.5 font-mono text-muted-foreground text-xs">
					{getLanguageDisplayName(language)}
				</div>
			)}

			{/* Code block with copy button */}
			<AICodeBlockBase
				code={code}
				language={language as never}
				showLineNumbers={showLineNumbers}
				className={cn(showLanguageBadge && "pt-6")}
				{...props}
			>
				{showCopyButton && onCopy && (
					<AICodeBlockCopyButtonBase
						onCopy={onCopy}
						className="opacity-0 transition-opacity group-hover:opacity-100"
					/>
				)}
				{showCopyButton && !onCopy && (
					<AICodeBlockCopyButtonBase className="opacity-0 transition-opacity group-hover:opacity-100" />
				)}
				{children}
			</AICodeBlockBase>

			{/* Streaming indicator */}
			{isStreaming && (
				<div className="absolute bottom-2 right-2 flex items-center gap-1 text-muted-foreground text-xs">
					<span className="animate-pulse">●</span>
					<span>Streaming...</span>
				</div>
			)}

			{/* Run button (if applicable) */}
			{showRunButton && onRun && (
				<button
					type="button"
					onClick={onRun}
					className="absolute bottom-2 right-2 rounded-md bg-primary px-2 py-1 text-primary-foreground text-xs opacity-0 transition-opacity hover:bg-primary/90 group-hover:opacity-100"
				>
					Run
				</button>
			)}
		</div>
	)
}

/**
 * Props for the AI Code Block Copy Button
 */
export interface AICodeBlockCopyButtonProps {
	/** Callback when copy is successful */
	onCopy?: () => void
	/** Timeout for the copied state */
	timeout?: number
	/** Custom class name */
	className?: string
}

/**
 * Standalone copy button that can be used with code blocks
 */
export const AICodeBlockCopyButton = ({
	onCopy,
	timeout,
	className,
}: AICodeBlockCopyButtonProps) => {
	if (onCopy) {
		return (
			<AICodeBlockCopyButtonBase
				onCopy={onCopy}
				{...(timeout ? { timeout } : {})}
				className={className}
			/>
		)
	}
	return <AICodeBlockCopyButtonBase className={className} />
}
