"use client";

import { memo, useEffect, useState } from "react";
import { getArtifactDefinition } from "./registry";
import type {
    ArtifactContentProps,
    ArtifactDefinition,
    ArtifactKind,
} from "./types";

// ============================================================================
// Loading Skeleton
// ============================================================================

type SkeletonProps = {
    kind: ArtifactKind;
};

function ArtifactSkeleton({ kind }: SkeletonProps) {
    return (
        <div className="flex-1 animate-pulse p-4">
            <div className="space-y-3">
                {kind === "code" ? (
                    <>
                        <div className="h-4 w-3/4 rounded bg-muted" />
                        <div className="h-4 w-1/2 rounded bg-muted" />
                        <div className="h-4 w-5/6 rounded bg-muted" />
                        <div className="h-4 w-2/3 rounded bg-muted" />
                        <div className="h-4 w-4/5 rounded bg-muted" />
                    </>
                ) : kind === "image" ? (
                    <div className="aspect-video rounded-lg bg-muted" />
                ) : kind === "sheet" ? (
                    <div className="space-y-2">
                        <div className="h-8 rounded bg-muted" />
                        <div className="h-6 rounded bg-muted" />
                        <div className="h-6 rounded bg-muted" />
                        <div className="h-6 rounded bg-muted" />
                    </div>
                ) : (
                    <>
                        <div className="h-6 w-1/3 rounded bg-muted" />
                        <div className="h-4 w-full rounded bg-muted" />
                        <div className="h-4 w-full rounded bg-muted" />
                        <div className="h-4 w-2/3 rounded bg-muted" />
                    </>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// Error Fallback
// ============================================================================

type ErrorFallbackProps = {
    kind: ArtifactKind;
    error?: Error;
    onRetry?: () => void;
};

function ArtifactErrorFallback({ kind, error, onRetry }: ErrorFallbackProps) {
    return (
        <div className="flex flex-1 items-center justify-center p-8">
            <div className="space-y-4 text-center">
                <div className="text-4xl">⚠️</div>
                <h3 className="font-medium text-lg">
                    Failed to load {kind} editor
                </h3>
                <p className="max-w-sm text-muted-foreground text-sm">
                    {error?.message ||
                        "An unexpected error occurred while loading the editor."}
                </p>
                {onRetry && (
                    <button
                        className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90"
                        onClick={onRetry}
                        type="button"
                    >
                        Try Again
                    </button>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// Main Content Component
// ============================================================================

interface ArtifactContentRendererProps extends ArtifactContentProps {
    kind: ArtifactKind;
}

export const ArtifactContent = memo(function ArtifactContentInner(
    props: ArtifactContentRendererProps
) {
    const { kind } = props;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [definition, setDefinition] = useState<ArtifactDefinition<
        ArtifactKind,
        any
    > | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function loadDefinition() {
            setLoading(true);
            setError(null);

            try {
                const def = await getArtifactDefinition(kind);
                if (!cancelled) {
                    setDefinition(def);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err
                            : new Error("Failed to load editor")
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadDefinition();

        return () => {
            cancelled = true;
        };
    }, [kind]);

    const handleRetry = () => {
        setError(null);
        setLoading(true);
        getArtifactDefinition(kind)
            .then(setDefinition)
            .catch((err) =>
                setError(
                    err instanceof Error ? err : new Error("Failed to load")
                )
            )
            .finally(() => setLoading(false));
    };

    if (loading) {
        return <ArtifactSkeleton kind={kind} />;
    }

    if (error || !definition) {
        return (
            <ArtifactErrorFallback
                error={error ?? undefined}
                kind={kind}
                onRetry={handleRetry}
            />
        );
    }

    const ContentComponent = definition.content;

    return (
        <div className="flex-1 overflow-auto">
            <ContentComponent {...props} />
        </div>
    );
});
