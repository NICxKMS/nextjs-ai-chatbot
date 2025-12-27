/**
 * Source Part Component
 *
 * Renders source citation references with type-based styling.
 *
 * @module features/chat/components/message/message-part/source-part
 */

"use client";

import { cn } from "@/lib/utils";
import {
    detectSourceType,
    Source,
    type SourceType,
} from "@/shared/components/ai";
import type { SourcePart } from "../../../types";

export type SourcePartViewProps = {
    source: SourcePart["source"];
    className?: string;
};

/**
 * Renders a source citation reference using the enhanced Source wrapper.
 * Provides type-based styling with automatic icon selection.
 */
export function SourcePartView({ source, className }: SourcePartViewProps) {
    // Determine source type from URL or sourceType field
    const sourceType: SourceType =
        source.sourceType === "url"
            ? detectSourceType(source.url ?? "")
            : "file";

    return (
        <Source
            className={cn("inline-flex", className)}
            href={source.url}
            sourceType={sourceType}
            title={source.title ?? source.url ?? source.id}
        />
    );
}
