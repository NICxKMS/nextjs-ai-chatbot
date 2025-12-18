"use client";

import { type HTMLAttributes, memo, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { PluggableList } from "unified";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";

// Hoist regex patterns to module scope for performance
const LANGUAGE_REGEX = /language-(\w+)/;
const TRAILING_NEWLINE_REGEX = /\n$/;

export type MarkdownProps = HTMLAttributes<HTMLDivElement> & {
    /** Markdown content to render */
    children: string;
    /** Additional remark plugins */
    remarkPlugins?: PluggableList;
    /** Additional rehype plugins */
    rehypePlugins?: PluggableList;
};

// Custom component types for react-markdown
type CodeComponentProps = {
    node?: unknown;
    className?: string;
    children?: ReactNode;
};

type PreComponentProps = {
    children?: ReactNode;
};

type AnchorComponentProps = {
    href?: string;
    children?: ReactNode;
};

/**
 * Markdown renderer component using react-markdown.
 * Supports GFM, math equations (KaTeX), and custom code blocks.
 */
export const Markdown = memo(
    function MarkdownInner({
        children,
        className,
        remarkPlugins = [],
        rehypePlugins = [],
        ...props
    }: MarkdownProps) {
        return (
            <div
                className={cn(
                    "prose prose-zinc dark:prose-invert max-w-none",
                    // Typography adjustments
                    "prose-headings:font-semibold",
                    "prose-p:leading-relaxed",
                    "prose-a:text-blue-500 prose-a:no-underline hover:prose-a:underline",
                    // Code styling
                    "prose-code:rounded prose-code:bg-zinc-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none dark:prose-code:bg-zinc-800",
                    "prose-pre:bg-transparent prose-pre:p-0",
                    // List styling
                    "prose-ol:my-2 prose-ul:my-2",
                    "prose-li:my-0",
                    // Table styling
                    "prose-table:border-collapse prose-table:border prose-table:border-border",
                    "prose-th:border prose-th:border-border prose-th:bg-muted prose-th:px-3 prose-th:py-2",
                    "prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2",
                    // First/last child margins
                    "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
                    className
                )}
                data-testid="markdown"
                {...props}
            >
                <ReactMarkdown
                    components={{
                        // Custom code block rendering
                        code({
                            className: codeClassName,
                            children: codeChildren,
                            ...codeProps
                        }: CodeComponentProps) {
                            const match = LANGUAGE_REGEX.exec(
                                codeClassName ?? ""
                            );
                            const language = match?.[1];
                            const codeString = String(codeChildren).replace(
                                TRAILING_NEWLINE_REGEX,
                                ""
                            );

                            // Check if this is inline code (no language and single line)
                            const isInline = !(
                                language || codeString.includes("\n")
                            );

                            if (isInline) {
                                return (
                                    <code
                                        className={codeClassName}
                                        {...codeProps}
                                    >
                                        {codeChildren}
                                    </code>
                                );
                            }

                            return (
                                <CodeBlock
                                    code={codeString}
                                    language={language}
                                    showLineNumbers={false}
                                />
                            );
                        },
                        // Custom pre to avoid double wrapping
                        pre({ children: preChildren }: PreComponentProps) {
                            return <>{preChildren}</>;
                        },
                        // Custom link to open in new tab for external links
                        a({
                            href,
                            children: linkChildren,
                            ...linkProps
                        }: AnchorComponentProps) {
                            const isExternal = href?.startsWith("http");
                            return (
                                <a
                                    href={href}
                                    rel={
                                        isExternal
                                            ? "noopener noreferrer"
                                            : undefined
                                    }
                                    target={isExternal ? "_blank" : undefined}
                                    {...linkProps}
                                >
                                    {linkChildren}
                                </a>
                            );
                        },
                    }}
                    rehypePlugins={[
                        [rehypeKatex, { singleDollarTextMath: true }],
                        ...(rehypePlugins ?? []),
                    ]}
                    remarkPlugins={[
                        remarkGfm,
                        [remarkMath, { singleDollarTextMath: true }],
                        ...(remarkPlugins ?? []),
                    ]}
                >
                    {children}
                </ReactMarkdown>
            </div>
        );
    },
    (prevProps, nextProps) =>
        prevProps.children === nextProps.children &&
        prevProps.className === nextProps.className
);
