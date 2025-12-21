"use client";

import type { ArtifactKind } from "@/features/artifacts";

// =============================================================================
// DOCUMENT SKELETON
// =============================================================================

export type DocumentSkeletonProps = {
    artifactKind: ArtifactKind;
};

/**
 * Full-page loading skeleton for document content.
 * Matches the actual editor layouts.
 */
export function DocumentSkeleton({ artifactKind }: DocumentSkeletonProps) {
    if (artifactKind === "image") {
        // Matches ImageEditor container
        return (
            <div className="flex h-[calc(100dvh-60px)] w-full flex-col items-center justify-center gap-4">
                <div
                    className="max-h-[600px] w-full max-w-[800px] animate-pulse rounded-lg bg-muted-foreground/20 p-0 md:p-20"
                    style={{ aspectRatio: "4/3" }}
                />
            </div>
        );
    }

    // Matches TipTap editor prose layout
    return (
        <div className="prose dark:prose-invert flex w-full flex-col gap-4 px-4">
            <div className="h-9 w-3/4 animate-pulse rounded-lg bg-muted-foreground/20" />
            <div className="h-6 w-full animate-pulse rounded-lg bg-muted-foreground/20" />
            <div className="h-6 w-full animate-pulse rounded-lg bg-muted-foreground/20" />
            <div className="h-6 w-2/3 animate-pulse rounded-lg bg-muted-foreground/20" />
            <div className="h-6 w-0" />
            <div className="h-7 w-1/2 animate-pulse rounded-lg bg-muted-foreground/20" />
            <div className="h-6 w-full animate-pulse rounded-lg bg-muted-foreground/20" />
            <div className="h-6 w-4/5 animate-pulse rounded-lg bg-muted-foreground/20" />
        </div>
    );
}

/**
 * Inline loading skeleton for document preview in chat.
 * Smaller, consistent sizing for inline display.
 */
export function InlineDocumentSkeleton() {
    return (
        <div className="flex w-full flex-col gap-3">
            <div className="h-4 w-3/4 animate-pulse rounded-md bg-muted-foreground/20" />
            <div className="h-4 w-full animate-pulse rounded-md bg-muted-foreground/20" />
            <div className="h-4 w-5/6 animate-pulse rounded-md bg-muted-foreground/20" />
            <div className="h-4 w-2/3 animate-pulse rounded-md bg-muted-foreground/20" />
            <div className="h-4 w-4/5 animate-pulse rounded-md bg-muted-foreground/20" />
        </div>
    );
}
