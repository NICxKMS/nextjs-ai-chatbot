"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { type HTMLAttributes, memo, useCallback, useState } from "react";
import { cn } from "@/lib/utils";

export type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
    /** Code content to display */
    code: string;
    /** Programming language for syntax highlighting class */
    language?: string;
    /** Whether to show line numbers */
    showLineNumbers?: boolean;
    /** Whether to show copy button */
    showCopyButton?: boolean;
    /** Custom filename to display */
    filename?: string;
};

/**
 * Code block component with copy functionality.
 * Renders code with optional language label, line numbers, and copy button.
 */
export const CodeBlock = memo(function CodeBlockInner({
    code,
    language,
    showLineNumbers = false,
    showCopyButton = true,
    filename,
    className,
    ...props
}: CodeBlockProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard API not available
            console.error("Failed to copy to clipboard");
        }
    }, [code]);

    const lines = code.split("\n");
    const displayLanguage = language?.toLowerCase() ?? "text";

    return (
        <div
            className={cn(
                "group relative overflow-hidden rounded-lg border border-border bg-zinc-950 text-sm",
                className
            )}
            data-testid="code-block"
            {...props}
        >
            {/* Header with language/filename */}
            {(language || filename) && (
                <div className="flex items-center justify-between border-border border-b bg-zinc-900 px-4 py-2">
                    <span className="text-xs text-zinc-400">
                        {filename ?? displayLanguage}
                    </span>
                    {showCopyButton && (
                        <button
                            aria-label={copied ? "Copied" : "Copy code"}
                            className={cn(
                                "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
                                "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                            )}
                            onClick={handleCopy}
                            type="button"
                        >
                            {copied ? (
                                <>
                                    <CheckIcon className="size-3.5" />
                                    <span>Copied</span>
                                </>
                            ) : (
                                <>
                                    <CopyIcon className="size-3.5" />
                                    <span>Copy</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            )}

            {/* Code content */}
            <div className="overflow-x-auto">
                <pre className="p-4">
                    <code
                        className={cn(
                            "font-mono text-zinc-100",
                            language && `language-${displayLanguage}`
                        )}
                    >
                        {showLineNumbers ? (
                            <table className="w-full border-collapse">
                                <tbody>
                                    {lines.map((line, lineNum) => (
                                        <tr
                                            key={`ln-${lineNum}-${line.slice(0, 20)}`}
                                        >
                                            <td className="w-12 select-none pr-4 text-right text-zinc-500">
                                                {lineNum + 1}
                                            </td>
                                            <td className="whitespace-pre-wrap break-all">
                                                {line || " "}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <span className="whitespace-pre-wrap break-all">
                                {code}
                            </span>
                        )}
                    </code>
                </pre>
            </div>

            {/* Floating copy button when no header */}
            {showCopyButton && !language && !filename && (
                <button
                    aria-label={copied ? "Copied" : "Copy code"}
                    className={cn(
                        "absolute top-2 right-2 rounded-md p-2 transition-all",
                        "bg-zinc-800/80 text-zinc-400 opacity-0 backdrop-blur-sm",
                        "hover:bg-zinc-700 hover:text-zinc-200",
                        "group-hover:opacity-100",
                        copied && "opacity-100"
                    )}
                    onClick={handleCopy}
                    type="button"
                >
                    {copied ? (
                        <CheckIcon className="size-4" />
                    ) : (
                        <CopyIcon className="size-4" />
                    )}
                </button>
            )}
        </div>
    );
});
