"use client";

import {
    type Dispatch,
    type SetStateAction,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import useSWR from "swr";

import { SWR_KEYS } from "./swr-keys";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type ArtifactKind = "text" | "code" | "image" | "sheet";

export type ArtifactStatus = "idle" | "streaming" | "ready" | "error";

export type ArtifactBoundingBox = {
    top: number;
    left: number;
    width: number;
    height: number;
};

export type UIArtifact = {
    documentId: string;
    content: string;
    kind: ArtifactKind;
    title: string;
    status: ArtifactStatus;
    isVisible: boolean;
    boundingBox: ArtifactBoundingBox;
};

/**
 * Metadata type used by artifact definitions.
 * Each artifact type can define its own metadata shape.
 */
export type ArtifactMetadata = Record<string, unknown> | null;

export type Selector<T> = (state: UIArtifact) => T;

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

export const initialArtifactData: UIArtifact = {
    documentId: "init",
    content: "",
    kind: "text",
    title: "",
    status: "idle",
    isVisible: false,
    boundingBox: {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
    },
};

// ─────────────────────────────────────────────────────────────
// Selector Hook
// ─────────────────────────────────────────────────────────────

/**
 * Selector hook for reading specific artifact state.
 * Optimizes re-renders by only subscribing to selected values.
 *
 * IMPORTANT: Pass a stable/memoized selector function to avoid unnecessary recalculations.
 *
 * @example
 * ```tsx
 * // Good - stable selector defined outside component
 * const selectIsVisible = (state: UIArtifact) => state.isVisible;
 * const isVisible = useArtifactSelector(selectIsVisible);
 *
 * // Good - memoized selector
 * const isVisible = useArtifactSelector(useCallback((s) => s.isVisible, []));
 * ```
 */
export function useArtifactSelector<Selected>(
    selector: Selector<Selected>
): Selected {
    const [mounted, setMounted] = useState(false);

    const { data: artifact } = useSWR<UIArtifact>(SWR_KEYS.artifact, null, {
        fallbackData: initialArtifactData,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    return useMemo(() => {
        // Return initial data during SSR/before mount to prevent hydration mismatch
        if (!mounted) {
            return selector(initialArtifactData);
        }
        return selector(artifact ?? initialArtifactData);
    }, [artifact, selector, mounted]);
}

// ─────────────────────────────────────────────────────────────
// Main Hook
// ─────────────────────────────────────────────────────────────

export type UseArtifactReturn = {
    artifact: UIArtifact;
    setArtifact: (
        updater: UIArtifact | ((current: UIArtifact) => UIArtifact)
    ) => void;
    metadata: ArtifactMetadata;
    setMetadata: Dispatch<SetStateAction<ArtifactMetadata>>;
    /** Show the artifact panel */
    open: (documentId: string, kind: ArtifactKind, title?: string) => void;
    /** Hide the artifact panel */
    close: () => void;
    /** Update artifact content (for streaming) */
    updateContent: (content: string) => void;
    /** Set artifact status */
    setStatus: (status: ArtifactStatus) => void;
    /** Update bounding box */
    setBoundingBox: (box: Partial<ArtifactBoundingBox>) => void;
};

/**
 * Hook for managing artifact UI state.
 *
 * Uses SWR as a reactive cache store (no fetcher) for cross-component state sharing.
 *
 * @example
 * ```tsx
 * const { artifact, setArtifact, open, close, updateContent } = useArtifact();
 *
 * // Open artifact panel
 * open("doc-123", "code", "My Code");
 *
 * // Update content during streaming
 * updateContent(newContent);
 *
 * // Close panel
 * close();
 * ```
 */
export function useArtifact(): UseArtifactReturn {
    // ─────────────────────────────────────────────────────────────
    // Artifact State
    // ─────────────────────────────────────────────────────────────

    const { data: localArtifact, mutate: setLocalArtifact } =
        useSWR<UIArtifact>(SWR_KEYS.artifact, null, {
            fallbackData: initialArtifactData,
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        });

    const artifact = useMemo(
        () => localArtifact ?? initialArtifactData,
        [localArtifact]
    );

    // Track previous documentId to detect changes and clear stale metadata
    const previousDocumentIdRef = useRef(artifact.documentId);

    // ─────────────────────────────────────────────────────────────
    // Artifact Metadata
    // ─────────────────────────────────────────────────────────────

    const metadataKey = useMemo(() => {
        if (!artifact.documentId || artifact.documentId === "init") {
            return null;
        }
        return SWR_KEYS.artifactMetadata(artifact.documentId);
    }, [artifact.documentId]);

    const { data: localMetadata, mutate: setLocalMetadata } =
        useSWR<ArtifactMetadata>(metadataKey, null, {
            fallbackData: null,
            revalidateOnMount: true,
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        });

    // Clear metadata when documentId changes
    useEffect(() => {
        if (previousDocumentIdRef.current !== artifact.documentId) {
            previousDocumentIdRef.current = artifact.documentId;
            setLocalMetadata(null, { revalidate: false });
        }
    }, [artifact.documentId, setLocalMetadata]);

    // ─────────────────────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────────────────────

    const setArtifact = useCallback(
        (updater: UIArtifact | ((current: UIArtifact) => UIArtifact)) => {
            setLocalArtifact((current) => {
                const currentArtifact = current ?? initialArtifactData;
                if (typeof updater === "function") {
                    return updater({ ...currentArtifact });
                }
                return updater;
            });
        },
        [setLocalArtifact]
    );

    const setMetadata = useCallback(
        (updater: SetStateAction<ArtifactMetadata>) => {
            if (typeof updater === "function") {
                setLocalMetadata((current) => updater(current ?? null));
            } else {
                setLocalMetadata(updater);
            }
        },
        [setLocalMetadata]
    ) as Dispatch<SetStateAction<ArtifactMetadata>>;

    const open = useCallback(
        (documentId: string, kind: ArtifactKind, title = "") => {
            setArtifact((current) => ({
                ...current,
                documentId,
                kind,
                title,
                isVisible: true,
                status: "idle",
                content: "",
            }));
        },
        [setArtifact]
    );

    const close = useCallback(() => {
        setArtifact((current) => ({
            ...current,
            isVisible: false,
        }));
    }, [setArtifact]);

    const updateContent = useCallback(
        (content: string) => {
            setArtifact((current) => ({
                ...current,
                content,
            }));
        },
        [setArtifact]
    );

    const setStatus = useCallback(
        (status: ArtifactStatus) => {
            setArtifact((current) => ({
                ...current,
                status,
            }));
        },
        [setArtifact]
    );

    const setBoundingBox = useCallback(
        (box: Partial<ArtifactBoundingBox>) => {
            setArtifact((current) => ({
                ...current,
                boundingBox: {
                    ...current.boundingBox,
                    ...box,
                },
            }));
        },
        [setArtifact]
    );

    return useMemo(
        () => ({
            artifact,
            setArtifact,
            metadata: localMetadata ?? null,
            setMetadata,
            open,
            close,
            updateContent,
            setStatus,
            setBoundingBox,
        }),
        [
            artifact,
            setArtifact,
            localMetadata,
            setMetadata,
            open,
            close,
            updateContent,
            setStatus,
            setBoundingBox,
        ]
    );
}
