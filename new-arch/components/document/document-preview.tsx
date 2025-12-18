"use client";

import type { DocumentKind } from "@/lib/types";
import { cn } from "@/lib/utils";

import { DocumentSkeleton } from "./document-skeleton";

type DocumentPreviewProps = {
    kind: DocumentKind;
    title: string;
    content?: string;
    isLoading?: boolean;
    className?: string;
};

const kindLabels: Record<DocumentKind, string> = {
    text: "Text Document",
    code: "Code",
    sheet: "Spreadsheet",
    image: "Image",
};

const kindIcons: Record<DocumentKind, string> = {
    text: "📄",
    code: "💻",
    sheet: "📊",
    image: "🖼️",
};

export function DocumentPreview({
    kind,
    title,
    content,
    isLoading,
    className,
}: DocumentPreviewProps) {
    if (isLoading) {
        return <DocumentSkeleton />;
    }

    return (
        <div
            className={cn(
                "rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50",
                className
            )}
        >
            <div className="mb-3 flex items-center gap-2">
                <span
                    aria-label={kindLabels[kind]}
                    className="text-lg"
                    role="img"
                >
                    {kindIcons[kind]}
                </span>
                <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground text-xs">
                    {kindLabels[kind]}
                </span>
                <h3 className="truncate font-medium">{title}</h3>
            </div>
            {content && (
                <div className="line-clamp-3 text-muted-foreground text-sm">
                    {content}
                </div>
            )}
        </div>
    );
}
