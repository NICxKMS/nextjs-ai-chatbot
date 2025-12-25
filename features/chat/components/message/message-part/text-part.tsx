/**
 * Text Part Component
 *
 * Renders text content with markdown/LaTeX support.
 *
 * @module features/chat/components/message/message-part/text-part
 */

"use client";

import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "../../markdown-renderer";

export type TextPartViewProps = {
    text: string;
    isStreaming?: boolean;
    className?: string;
};

/**
 * Renders text content with markdown/LaTeX support.
 */
export function TextPartView({ text, className }: TextPartViewProps) {
    return (
        <MarkdownRenderer className={cn("break-words", className)}>
            {text}
        </MarkdownRenderer>
    );
}
