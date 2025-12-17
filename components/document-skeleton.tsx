import type { ArtifactKind } from "@/lib/artifacts/types";

export const DocumentSkeleton = ({
    artifactKind,
}: {
    artifactKind: ArtifactKind;
}) => {
    return artifactKind === "image" ? (
        // Matches ImageEditor container: h-[calc(100dvh-60px)] with centered content
        <div className="flex h-[calc(100dvh-60px)] w-full flex-col items-center justify-center gap-4">
            {/* Matches actual image dimensions with aspect-ratio 4/3 and max-w-[800px] */}
            <div
                className="max-h-[600px] w-full max-w-[800px] animate-pulse rounded-lg bg-muted-foreground/20 p-0 md:p-20"
                style={{ aspectRatio: "4/3" }}
            />
        </div>
    ) : (
        // Matches TipTap editor prose layout - consistent with actual text editor
        <div className="prose dark:prose-invert flex w-full flex-col gap-4 px-4">
            {/* H1 heading skeleton */}
            <div className="h-9 w-3/4 animate-pulse rounded-lg bg-muted-foreground/20" />
            {/* Paragraph lines */}
            <div className="h-6 w-full animate-pulse rounded-lg bg-muted-foreground/20" />
            <div className="h-6 w-full animate-pulse rounded-lg bg-muted-foreground/20" />
            <div className="h-6 w-2/3 animate-pulse rounded-lg bg-muted-foreground/20" />
            {/* Gap for new paragraph */}
            <div className="h-6 w-0" />
            {/* H2 heading skeleton */}
            <div className="h-7 w-1/2 animate-pulse rounded-lg bg-muted-foreground/20" />
            {/* More paragraph lines */}
            <div className="h-6 w-full animate-pulse rounded-lg bg-muted-foreground/20" />
            <div className="h-6 w-4/5 animate-pulse rounded-lg bg-muted-foreground/20" />
        </div>
    );
};

export const InlineDocumentSkeleton = () => {
    // Matches inline document preview with smaller, consistent sizing
    return (
        <div className="flex w-full flex-col gap-3">
            <div className="h-4 w-3/4 animate-pulse rounded-md bg-muted-foreground/20" />
            <div className="h-4 w-full animate-pulse rounded-md bg-muted-foreground/20" />
            <div className="h-4 w-5/6 animate-pulse rounded-md bg-muted-foreground/20" />
            <div className="h-4 w-2/3 animate-pulse rounded-md bg-muted-foreground/20" />
            <div className="h-4 w-4/5 animate-pulse rounded-md bg-muted-foreground/20" />
        </div>
    );
};
