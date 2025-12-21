/**
 * Markdown Renderer Component
 *
 * Wrapper for streamdown markdown rendering with LaTeX and code highlighting.
 * Matches OldApp response.tsx pattern for visual parity.
 *
 * @module features/chat/components/markdown-renderer
 */

"use client";

import { type ComponentProps, memo } from "react";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

type StreamdownProps = ComponentProps<typeof Streamdown>;

export interface MarkdownRendererProps
    extends Omit<StreamdownProps, "children"> {
    /** The markdown content to render */
    children: string;
    /** Optional additional class names */
    className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Renders markdown content with streaming support, LaTeX math, and code highlighting.
 *
 * Features:
 * - Streaming markdown rendering via streamdown
 * - LaTeX math support (inline $ and block $$)
 * - GFM (GitHub Flavored Markdown) support
 * - Code block syntax highlighting
 * - Responsive typography with prose styling
 *
 * @example
 * ```tsx
 * // Basic usage
 * <MarkdownRenderer>{"# Hello World"}</MarkdownRenderer>
 *
 * // With LaTeX
 * <MarkdownRenderer>{"The equation $E = mc^2$ is famous."}</MarkdownRenderer>
 *
 * // Streaming content
 * <MarkdownRenderer>{streamingText}</MarkdownRenderer>
 * ```
 */
export const MarkdownRenderer = memo(
    ({
        className,
        remarkPlugins,
        rehypePlugins,
        children,
        ...props
    }: MarkdownRendererProps) => {
        // Configure remark plugins for math support
        const remarkPluginsList = [
            [remarkMath, { singleDollarTextMath: true }] as const,
            ...(remarkPlugins && Array.isArray(remarkPlugins)
                ? remarkPlugins
                : []),
        ] as Parameters<typeof Streamdown>[0]["remarkPlugins"];

        // Configure rehype plugins for KaTeX rendering
        const rehypePluginsList = [
            [rehypeKatex, { singleDollarTextMath: true }] as const,
            ...(rehypePlugins && Array.isArray(rehypePlugins)
                ? rehypePlugins
                : []),
        ] as Parameters<typeof Streamdown>[0]["rehypePlugins"];

        return (
            <Streamdown
                className={cn(
                    // Base prose styling
                    "prose prose-sm dark:prose-invert max-w-none",
                    // Reset margins for first/last children
                    "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
                    // Code block styling
                    "[&_code]:whitespace-pre-wrap [&_code]:break-words",
                    "[&_pre]:max-w-full [&_pre]:overflow-x-auto",
                    // Custom styling
                    className
                )}
                rehypePlugins={rehypePluginsList}
                remarkPlugins={remarkPluginsList}
                {...props}
            >
                {children}
            </Streamdown>
        );
    },
    (prevProps, nextProps) => prevProps.children === nextProps.children
);

MarkdownRenderer.displayName = "MarkdownRenderer";
