"use client";

import { memo } from "react";

export type TextPreviewProps = {
    /** Text content to preview */
    content: string;
    /** Maximum lines to display (default: 5) */
    maxLines?: number;
};

/**
 * Text document preview renderer.
 * Shows truncated markdown/text content.
 */
function TextPreviewComponent({ content, maxLines = 5 }: TextPreviewProps) {
    const lines = content.split("\n").slice(0, maxLines);
    const truncated = lines.join("\n");
    const hasMore = content.split("\n").length > maxLines;

    return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="line-clamp-5 whitespace-pre-wrap text-foreground/90 text-sm">
                {truncated}
                {hasMore && <span className="text-muted-foreground">...</span>}
            </div>
        </div>
    );
}

export const TextPreview = memo(TextPreviewComponent);
