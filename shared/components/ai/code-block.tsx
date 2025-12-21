"use client";

/**
 * CodeBlock Wrapper
 *
 * Enhanced wrapper around AI Element CodeBlock component.
 * Adds copy button, line numbers toggle, and language badge.
 */

import { Code2Icon } from "lucide-react";
import { useCallback, useState } from "react";
import type { BundledLanguage } from "shiki";
import {
    CodeBlock as BaseCodeBlock,
    CodeBlockCopyButton,
} from "@/components/ai-elements/code-block";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/index";

// Re-export base components and utilities
export {
    CodeBlockCopyButton,
    type CodeBlockCopyButtonProps,
    highlightCode,
} from "@/components/ai-elements/code-block";

/**
 * Language display names for common languages
 */
const LANGUAGE_LABELS: Record<string, string> = {
    typescript: "TypeScript",
    tsx: "TSX",
    javascript: "JavaScript",
    jsx: "JSX",
    python: "Python",
    rust: "Rust",
    go: "Go",
    java: "Java",
    cpp: "C++",
    c: "C",
    csharp: "C#",
    ruby: "Ruby",
    php: "PHP",
    swift: "Swift",
    kotlin: "Kotlin",
    scala: "Scala",
    sql: "SQL",
    html: "HTML",
    css: "CSS",
    scss: "SCSS",
    json: "JSON",
    yaml: "YAML",
    markdown: "Markdown",
    bash: "Bash",
    shell: "Shell",
    powershell: "PowerShell",
    dockerfile: "Dockerfile",
    graphql: "GraphQL",
};

/**
 * Get display label for a language
 */
export function getLanguageLabel(language: string): string {
    return LANGUAGE_LABELS[language.toLowerCase()] ?? language.toUpperCase();
}

/**
 * Language badge props
 */
export type LanguageBadgeProps = {
    language: string;
    className?: string;
};

/**
 * Language badge component
 */
export function LanguageBadge({ language, className }: LanguageBadgeProps) {
    return (
        <Badge
            className={cn("gap-1 font-mono text-xs", className)}
            variant="secondary"
        >
            <Code2Icon className="size-3" />
            {getLanguageLabel(language)}
        </Badge>
    );
}

/**
 * Enhanced CodeBlock props with additional features
 */
export type EnhancedCodeBlockProps = {
    /** The code to display */
    code: string;
    /** Programming language for syntax highlighting */
    language: BundledLanguage;
    /** Show line numbers (default: false) */
    showLineNumbers?: boolean;
    /** Show copy button (default: true) */
    showCopyButton?: boolean;
    /** Show language badge (default: true) */
    showLanguageBadge?: boolean;
    /** Allow toggling line numbers (default: false) */
    allowLineNumberToggle?: boolean;
    /** Callback when code is copied */
    onCopy?: () => void;
    /** Custom class name */
    className?: string;
    /** Custom header content */
    header?: React.ReactNode;
    /** Custom footer content */
    footer?: React.ReactNode;
};

/**
 * Enhanced CodeBlock with copy button, line numbers toggle, and language badge
 */
export function CodeBlock({
    code,
    language,
    showLineNumbers: initialShowLineNumbers = false,
    showCopyButton = true,
    showLanguageBadge = true,
    allowLineNumberToggle = false,
    onCopy,
    className,
    header,
    footer,
}: EnhancedCodeBlockProps) {
    const [showLineNumbers, setShowLineNumbers] = useState(
        initialShowLineNumbers
    );

    const handleToggleLineNumbers = useCallback(() => {
        setShowLineNumbers((prev) => !prev);
    }, []);

    return (
        <div className={cn("flex flex-col", className)}>
            {/* Header with language badge and actions */}
            {(showLanguageBadge || header) && (
                <div className="flex items-center justify-between gap-2 rounded-t-md border border-b-0 bg-muted/50 px-3 py-2">
                    <div className="flex items-center gap-2">
                        {showLanguageBadge && (
                            <LanguageBadge language={language} />
                        )}
                        {header}
                    </div>
                </div>
            )}

            {/* Code block */}
            <BaseCodeBlock
                className={cn(
                    showLanguageBadge || header
                        ? "rounded-t-none border-t-0"
                        : "",
                    footer ? "rounded-b-none border-b-0" : ""
                )}
                code={code}
                language={language}
                showLineNumbers={showLineNumbers}
            >
                {/* Toolbar buttons */}
                {allowLineNumberToggle && (
                    <Button
                        className="shrink-0"
                        onClick={handleToggleLineNumbers}
                        size="icon"
                        title={
                            showLineNumbers
                                ? "Hide line numbers"
                                : "Show line numbers"
                        }
                        variant="ghost"
                    >
                        <span className="font-mono text-xs">
                            {showLineNumbers ? "#" : "№"}
                        </span>
                    </Button>
                )}
                {showCopyButton && <CodeBlockCopyButton onCopy={onCopy} />}
            </BaseCodeBlock>

            {/* Footer */}
            {footer && (
                <div className="rounded-b-md border border-t-0 bg-muted/50 px-3 py-2">
                    {footer}
                </div>
            )}
        </div>
    );
}

/**
 * Compact code block for inline code snippets
 */
export type CompactCodeBlockProps = {
    code: string;
    language: BundledLanguage;
    className?: string;
};

/**
 * Compact code block without header/footer
 */
export function CompactCodeBlock({
    code,
    language,
    className,
}: CompactCodeBlockProps) {
    return (
        <BaseCodeBlock
            className={className}
            code={code}
            language={language}
            showLineNumbers={false}
        >
            <CodeBlockCopyButton />
        </BaseCodeBlock>
    );
}

/**
 * Hook for code block state management
 */
export function useCodeBlock(initialLineNumbers = false) {
    const [showLineNumbers, setShowLineNumbers] = useState(initialLineNumbers);
    const [copied, setCopied] = useState(false);

    const toggleLineNumbers = useCallback(() => {
        setShowLineNumbers((prev) => !prev);
    }, []);

    const handleCopy = useCallback(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, []);

    return {
        showLineNumbers,
        toggleLineNumbers,
        copied,
        handleCopy,
    };
}
