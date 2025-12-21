"use client";

import type { ArtifactKind } from "@/features/artifacts";
import { SkeletonShimmer } from "@/shared/components/ai";

// =============================================================================
// DOCUMENT SKELETON
// =============================================================================

export type DocumentSkeletonProps = {
    artifactKind: ArtifactKind;
};

/**
 * Full-page loading skeleton for document content.
 * Matches the actual editor layouts.
 * Uses SkeletonShimmer wrapper for consistent loading states.
 */
export function DocumentSkeleton({ artifactKind }: DocumentSkeletonProps) {
    if (artifactKind === "image") {
        // Matches ImageEditor container
        return (
            <div className="flex h-[calc(100dvh-60px)] w-full flex-col items-center justify-center gap-4">
                <SkeletonShimmer
                    className="max-h-[600px] max-w-[800px] p-0 md:p-20"
                    height="auto"
                    shape="card"
                    width="100%"
                />
            </div>
        );
    }

    // Matches TipTap editor prose layout
    return (
        <div className="prose dark:prose-invert flex w-full flex-col gap-4 px-4">
            <SkeletonShimmer height={36} shape="rectangle" width="75%" />
            <SkeletonShimmer height={24} shape="rectangle" width="100%" />
            <SkeletonShimmer height={24} shape="rectangle" width="100%" />
            <SkeletonShimmer height={24} shape="rectangle" width="66%" />
            <div className="h-6 w-0" />
            <SkeletonShimmer height={28} shape="rectangle" width="50%" />
            <SkeletonShimmer height={24} shape="rectangle" width="100%" />
            <SkeletonShimmer height={24} shape="rectangle" width="80%" />
        </div>
    );
}

/**
 * Inline loading skeleton for document preview in chat.
 * Smaller, consistent sizing for inline display.
 * Uses SkeletonShimmer wrapper for consistent loading states.
 */
export function InlineDocumentSkeleton() {
    return (
        <div className="flex w-full flex-col gap-3">
            <SkeletonShimmer height={16} shape="text" width="75%" />
            <SkeletonShimmer height={16} shape="text" width="100%" />
            <SkeletonShimmer height={16} shape="text" width="83%" />
            <SkeletonShimmer height={16} shape="text" width="66%" />
            <SkeletonShimmer height={16} shape="text" width="80%" />
        </div>
    );
}
