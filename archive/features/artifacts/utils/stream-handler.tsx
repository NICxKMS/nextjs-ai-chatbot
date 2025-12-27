"use client";

import { useEffect, useRef } from "react";
import { initialArtifactData, useArtifact } from "../hooks/use-artifact";
import type {
    ArtifactDefinition,
    ArtifactKind,
    ArtifactStreamPart,
    UIArtifact,
} from "../types";

// ============================================================================
// Types
// ============================================================================

export type DataStreamHandlerProps = {
    /**
     * Array of stream parts from the AI data stream.
     * Each part contains a type and associated data.
     */
    dataStream: ArtifactStreamPart[] | undefined;
    /**
     * Array of registered artifact definitions.
     * Used to find the appropriate handler for each artifact kind.
     */
    artifactDefinitions: ArtifactDefinition[];
};

// ============================================================================
// Stream Part Processors
// ============================================================================

/**
 * Process base artifact stream parts (id, title, kind, clear, finish).
 * Returns the updated artifact state or null if no update needed.
 */
function processBaseStreamPart(
    currentArtifact: UIArtifact,
    delta: ArtifactStreamPart
): UIArtifact | null {
    switch (delta.type) {
        case "data-id":
            return {
                ...currentArtifact,
                documentId: delta.data as string,
                status: "streaming",
            };

        case "data-title":
            return {
                ...currentArtifact,
                title: delta.data as string,
                status: "streaming",
            };

        case "data-kind":
            return {
                ...currentArtifact,
                kind: delta.data as ArtifactKind,
                status: "streaming",
            };

        case "data-clear":
            return {
                ...currentArtifact,
                content: "",
                status: "streaming",
            };

        case "data-finish":
            return {
                ...currentArtifact,
                status: "idle",
            };

        default:
            return null;
    }
}

// ============================================================================
// Data Stream Handler Component
// ============================================================================

/**
 * DataStreamHandler processes incoming AI data stream parts and updates
 * artifact state accordingly.
 *
 * This component:
 * 1. Watches for new stream parts in the dataStream array
 * 2. Processes base artifact updates (id, title, kind, clear, finish)
 * 3. Delegates artifact-specific updates to the appropriate definition's onStreamPart
 *
 * @example
 * ```tsx
 * <DataStreamHandler
 *   dataStream={dataStream}
 *   artifactDefinitions={artifactDefinitions}
 * />
 * ```
 */
export function DataStreamHandler({
    dataStream,
    artifactDefinitions,
}: DataStreamHandlerProps): null {
    const { artifact, setArtifact, setMetadata } = useArtifact();

    // Track last processed index to avoid reprocessing
    const lastProcessedIndex = useRef(-1);
    // Track artifact kind to reset processing on kind change
    const lastArtifactKind = useRef(artifact.kind);

    // Extract artifact.kind to use as a stable dependency
    const artifactKind = artifact.kind;

    useEffect(() => {
        // Reset if artifact kind changed
        if (lastArtifactKind.current !== artifactKind) {
            lastProcessedIndex.current = -1;
            lastArtifactKind.current = artifactKind;
        }

        // Reset if stream is cleared
        if (!dataStream?.length) {
            lastProcessedIndex.current = -1;
            return;
        }

        // Process only new deltas
        const newDeltas = dataStream.slice(lastProcessedIndex.current + 1);
        lastProcessedIndex.current = dataStream.length - 1;

        // Find the artifact definition for current kind
        const artifactDefinition = artifactDefinitions.find(
            (def) => def.kind === artifactKind
        );

        for (const delta of newDeltas) {
            // Process base artifact updates in a single setArtifact call
            // to prevent race conditions and double state updates
            setArtifact((draftArtifact) => {
                const currentArtifact = draftArtifact ?? {
                    ...initialArtifactData,
                    status: "streaming" as const,
                };

                // Try to process as base stream part
                const baseUpdate = processBaseStreamPart(
                    currentArtifact,
                    delta
                );

                return baseUpdate ?? currentArtifact;
            });

            // Handle artifact-specific stream part processing (for metadata updates)
            // This is called after base artifact update to ensure consistent state
            if (artifactDefinition?.onStreamPart) {
                artifactDefinition.onStreamPart({
                    streamPart: delta,
                    setArtifact,
                    setMetadata,
                });
            }
        }
    }, [
        dataStream,
        setArtifact,
        setMetadata,
        artifactKind,
        artifactDefinitions,
    ]);

    // This component only processes data, renders nothing
    return null;
}
