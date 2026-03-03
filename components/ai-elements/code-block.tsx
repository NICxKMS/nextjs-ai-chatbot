"use client"

import { CheckIcon, CopyIcon } from "lucide-react"
import type { ComponentProps, HTMLAttributes } from "react"
import { createContext, useContext, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/cn"

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default timeout in ms for copy feedback indicator */
const COPY_FEEDBACK_TIMEOUT_MS = 2000

type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
	code: string
	language: string
	showLineNumbers?: boolean
}

type CodeBlockContextType = {
	code: string
}

const CodeBlockContext = createContext<CodeBlockContextType>({
	code: "",
})

/**
 * Simplified code block component.
 * Renders code in a styled <pre><code> block without syntax highlighting.
 * Full shiki-based highlighting deferred to P6.
 */
export const CodeBlock = ({
	code,
	language,
	showLineNumbers: _showLineNumbers = false,
	className,
	children,
	...props
}: CodeBlockProps) => {
	return (
		<CodeBlockContext.Provider value={{ code }}>
			<div
				className={cn(
					"group relative w-full overflow-hidden rounded-md border bg-background text-foreground",
					className,
				)}
				{...props}
			>
				<div className="relative">
					<pre className="m-0 overflow-auto bg-background p-4 text-sm">
						<code className="font-mono text-sm">{code}</code>
					</pre>
					{children && (
						<div className="absolute top-2 right-2 flex items-center gap-2">
							{children}
						</div>
					)}
				</div>
			</div>
		</CodeBlockContext.Provider>
	)
}

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
	onCopy?: () => void
	onError?: (error: Error) => void
	/** Timeout in ms for copy feedback indicator */
	timeout?: number
}

export const CodeBlockCopyButton = ({
	onCopy,
	onError,
	timeout = COPY_FEEDBACK_TIMEOUT_MS,
	children,
	className,
	...props
}: CodeBlockCopyButtonProps) => {
	const [isCopied, setIsCopied] = useState(false)
	const { code } = useContext(CodeBlockContext)

	const copyToClipboard = async () => {
		if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
			onError?.(new Error("Clipboard API not available"))
			return
		}

		try {
			await navigator.clipboard.writeText(code)
			setIsCopied(true)
			onCopy?.()
			setTimeout(() => setIsCopied(false), timeout)
		} catch (error) {
			onError?.(error as Error)
		}
	}

	const Icon = isCopied ? CheckIcon : CopyIcon

	return (
		<Button
			aria-label={isCopied ? "Copied" : "Copy code"}
			className={cn("shrink-0", className)}
			onClick={copyToClipboard}
			size="icon"
			variant="ghost"
			{...props}
		>
			{children ?? <Icon size={14} />}
		</Button>
	)
}
