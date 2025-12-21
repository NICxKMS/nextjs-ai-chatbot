"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

import type { UIArtifact } from "../types";

// ============================================================================
// Initial State
// ============================================================================

/**
 * Initial/default artifact state.
 * Used as fallback when no artifact is active.
 */
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

// ============================================================================
// SWR Cache Key
// ============================================================================

const ARTIFACT_CACHE_KEY = "artifact";
const getMetadataCacheKey = (documentId: string) =>
    documentId && documentId !== "init"
        ? `artifact-metadata-${documentId}`
        : null;

// ============================================================================
// Selector Hook
// ============================================================================

type Selector<TSelected> = (state: UIArtifact) => TSelected;

/**
 * Selector hook for reading specific artifact state.
 * Use this for optimized re-renders when you only need part of the state.
 *
 * IMPORTANT: Pass a stable/memoized selector function to avoid unnecessary recalculations.
 *
 * @example
 * ```ts
 * // Define selector outside component or memoize
 * const selectIsVisible = (state: UIArtifact) => state.isVisible;
 * const isVisible = useArtifactSelector(selectIsVisible);
 *
 * // Or with useCallback
 * const isVisible = useArtifactSelector(useCallback((state) => state.isVisible, []));
 * ```
 */
export function useArtifactSelector<TSelected>(
    selector: Selector<TSelected>
): TSelected {
    const [mounted, setMounted] = useState(false);

    const { data: localArtifact } = useSWR<UIArtifact>(
        ARTIFACT_CACHE_KEY,
        null,
        {
            fallbackData: initialArtifactData,
        }
    );

    useEffect(() => {
        setMounted(true);
    }, []);

    const selectedValue = useMemo(() => {
        // Return initial data during SSR/before mount to prevent hydration mismatch
        if (!mounted) {
            return selector(initialArtifactData);
        }
        return selector(localArtifact ?? initialArtifactData);
    }, [localArtifact, selector, mounted]);

    return selectedValue;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Metadata type for artifact definitions.
 * Each artifact type can define its own metadata shape.
 */
type ArtifactMetadata = unknown;

/**
 * Return type for useArtifact hook.
 */
export type UseArtifactReturn = {
    /** Current artifact state */
    artifact: UIArtifact;
    /** Update artifact state */
    setArtifact: (
        updater: UIArtifact | ((current: UIArtifact) => UIArtifact)
    ) => void;
    /** Artifact-specific metadata */
    metadata: ArtifactMetadata;
    /** Update artifact metadata */
    setMetadata: Dispatch<SetStateAction<ArtifactMetadata>>;
};

/**
 * Main hook for artifact state management.
 * Provides access to artifact state and methods to update it.
 *
 * Uses SWR for client-side state management, enabling:
 * - Shared state across components without prop drilling
 * - Automatic re-renders on state changes
 * - Optimistic updates
 *
 * @example
 * ```ts
 * const { artifact, setArtifact, metadata, setMetadata } = useArtifact();
 *
 * // Update artifact
 * setArtifact((current) => ({ ...current, isVisible: true }));
 *
 * // Update metadata
 * setMetadata({ outputs: [] });
 * ```
 */
export function useArtifact(): UseArtifactReturn {
    const { data: localArtifact, mutate: setLocalArtifact } =
        useSWR<UIArtifact>(ARTIFACT_CACHE_KEY, null, {
            fallbackData: initialArtifactData,
        });

    const artifact = useMemo(() => {
        return localArtifact ?? initialArtifactData;
    }, [localArtifact]);

    const setArtifact = useCallback(
        (
            updaterFn:
                | UIArtifact
                | ((currentArtifact: UIArtifact) => UIArtifact)
        ) => {
            setLocalArtifact((currentArtifact) => {
                const artifactToUpdate = currentArtifact ?? initialArtifactData;

                if (typeof updaterFn === "function") {
                    return updaterFn({ ...artifactToUpdate });
                }

                return updaterFn;
            });
        },
        [setLocalArtifact]
    );

    // Track previous documentId to detect changes and clear stale metadata
    const previousDocumentIdRef = useRef(artifact.documentId);

    // Artifact metadata is dynamic per artifact type (code, text, image, etc.)
    // The key changes when documentId changes, automatically managing metadata
    const { data: localArtifactMetadata, mutate: setLocalArtifactMetadata } =
        useSWR<ArtifactMetadata>(
            getMetadataCacheKey(artifact.documentId),
            null,
            {
                fallbackData: null,
                // Revalidate when key changes to clear stale data
                revalidateOnMount: true,
            }
        );

    // Clear metadata immediately when documentId changes to prevent showing stale data
    useEffect(() => {
        if (previousDocumentIdRef.current !== artifact.documentId) {
            previousDocumentIdRef.current = artifact.documentId;
            // Clear metadata for the new document until it's properly initialized
            setLocalArtifactMetadata(null, { revalidate: false });
        }
    }, [artifact.documentId, setLocalArtifactMetadata]);

    // Wrap SWR's mutate to match React's SetStateAction pattern
    const setMetadata = useCallback(
        (updaterFn: SetStateAction<ArtifactMetadata>) => {
            if (typeof updaterFn === "function") {
                setLocalArtifactMetadata(
                    (currentMetadata: ArtifactMetadata) => {
                        return (
                            updaterFn as (
                                prev: ArtifactMetadata
                            ) => ArtifactMetadata
                        )(currentMetadata ?? null);
                    }
                );
            } else {
                setLocalArtifactMetadata(updaterFn);
            }
        },
        [setLocalArtifactMetadata]
    ) as Dispatch<SetStateAction<ArtifactMetadata>>;

    return useMemo(
        () => ({
            artifact,
            setArtifact,
            metadata: localArtifactMetadata,
            setMetadata,
        }),
        [artifact, setArtifact, localArtifactMetadata, setMetadata]
    );
}
