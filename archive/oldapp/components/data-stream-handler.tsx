"use client";

import { useEffect, useRef } from "react";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import { artifactDefinitions } from "./artifact";
import { useDataStream } from "./data-stream-provider";

export function DataStreamHandler() {
    const { dataStream } = useDataStream();

    const { artifact, setArtifact, setMetadata } = useArtifact();
    const lastProcessedIndex = useRef(-1);
    const lastArtifactKind = useRef(artifact.kind);

    // Extract artifact.kind to use as a stable dependency
    const artifactKind = artifact.kind;

    // Reset processed index when stream is cleared or artifact kind changes
    useEffect(() => {
        // Reset if artifact kind changed
        if (lastArtifactKind.current !== artifactKind) {
            lastProcessedIndex.current = -1;
            lastArtifactKind.current = artifactKind;
        }

        if (!dataStream?.length) {
            lastProcessedIndex.current = -1;
            return;
        }

        const newDeltas = dataStream.slice(lastProcessedIndex.current + 1);
        lastProcessedIndex.current = dataStream.length - 1;

        for (const delta of newDeltas) {
            const artifactDefinition = artifactDefinitions.find(
                (currentArtifactDefinition) =>
                    currentArtifactDefinition.kind === artifactKind
            );

            // Consolidate updates into a single setArtifact call per delta
            // to prevent double state updates and potential race conditions
            setArtifact((draftArtifact) => {
                const currentArtifact = draftArtifact || {
                    ...initialArtifactData,
                    status: "streaming",
                };

                // First apply base delta updates
                let updatedArtifact: typeof currentArtifact;
                switch (delta.type) {
                    case "data-id":
                        updatedArtifact = {
                            ...currentArtifact,
                            documentId: delta.data,
                            status: "streaming",
                        };
                        break;

                    case "data-title":
                        updatedArtifact = {
                            ...currentArtifact,
                            title: delta.data,
                            status: "streaming",
                        };
                        break;

                    case "data-kind":
                        updatedArtifact = {
                            ...currentArtifact,
                            kind: delta.data,
                            status: "streaming",
                        };
                        break;

                    case "data-clear":
                        updatedArtifact = {
                            ...currentArtifact,
                            content: "",
                            status: "streaming",
                        };
                        break;

                    case "data-finish":
                        updatedArtifact = {
                            ...currentArtifact,
                            status: "idle",
                        };
                        break;

                    default:
                        updatedArtifact = currentArtifact;
                }

                return updatedArtifact;
            });

            // Handle artifact-specific stream part processing (for metadata updates only)
            // This is called after the base artifact update to ensure consistent state
            if (artifactDefinition?.onStreamPart) {
                artifactDefinition.onStreamPart({
                    streamPart: delta,
                    setArtifact,
                    setMetadata,
                });
            }
        }
    }, [dataStream, setArtifact, setMetadata, artifactKind]);

    return null;
}
