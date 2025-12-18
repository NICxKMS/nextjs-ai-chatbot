"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import type { UIArtifact } from "@/components/artifact";

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

type Selector<T> = (state: UIArtifact) => T;

/**
 * Selector hook for reading specific artifact state.
 * IMPORTANT: Pass a stable/memoized selector function to avoid unnecessary recalculations.
 * @example
 * // Good - stable selector
 * const isVisible = useArtifactSelector(useCallback((state) => state.isVisible, []));
 * // Or define selector outside component
 * const selectIsVisible = (state: UIArtifact) => state.isVisible;
 * const isVisible = useArtifactSelector(selectIsVisible);
 */
export function useArtifactSelector<Selected>(selector: Selector<Selected>) {
    const [mounted, setMounted] = useState(false);
    const { data: localArtifact } = useSWR<UIArtifact>("artifact", null, {
        fallbackData: initialArtifactData,
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    const selectedValue = useMemo(() => {
        // Return initial data during SSR/before mount to prevent hydration mismatch
        if (!mounted) {
            return selector(initialArtifactData);
        }
        if (!localArtifact) {
            return selector(initialArtifactData);
        }
        return selector(localArtifact);
    }, [localArtifact, selector, mounted]);

    return selectedValue;
}

/**
 * Metadata type used by artifact definitions.
 * Each artifact type can define its own metadata shape.
 * Using 'any' to allow compatibility with all artifact definition metadata types.
 */
type ArtifactMetadata = any;

export function useArtifact() {
    const { data: localArtifact, mutate: setLocalArtifact } =
        useSWR<UIArtifact>("artifact", null, {
            fallbackData: initialArtifactData,
        });

    const artifact = useMemo(() => {
        if (!localArtifact) {
            return initialArtifactData;
        }
        return localArtifact;
    }, [localArtifact]);

    const setArtifact = useCallback(
        (
            updaterFn:
                | UIArtifact
                | ((currentArtifact: UIArtifact) => UIArtifact)
        ) => {
            setLocalArtifact((currentArtifact) => {
                const artifactToUpdate = currentArtifact || initialArtifactData;

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
    // The key changes when documentId changes, automatically fetching/clearing metadata
    const { data: localArtifactMetadata, mutate: setLocalArtifactMetadata } =
        useSWR<ArtifactMetadata>(
            () =>
                artifact.documentId && artifact.documentId !== "init"
                    ? `artifact-metadata-${artifact.documentId}`
                    : null,
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

    // Wrap SWR's mutate to match React's SetStateAction pattern expected by artifact definitions
    // Using type assertion to bridge SWR mutate with React SetStateAction type
    const setMetadata = useCallback(
        (updaterFn: SetStateAction<ArtifactMetadata>) => {
            if (typeof updaterFn === "function") {
                setLocalArtifactMetadata(
                    (currentMetadata: ArtifactMetadata) => {
                        return updaterFn(currentMetadata ?? null);
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
            metadata: localArtifactMetadata as ArtifactMetadata,
            setMetadata,
        }),
        [artifact, setArtifact, localArtifactMetadata, setMetadata]
    );
}
