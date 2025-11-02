"use client";

import { useEffect, useRef } from "react";
import type { DataUIPart } from "ai";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import {
  getArtifactDefinition,
  loadArtifactDefinition,
  type ArtifactKind,
} from "./artifact-registry";
import { useDataStream } from "./data-stream-provider";
import type { CustomUIDataTypes } from "@/lib/types";

export function DataStreamHandler() {
  const { getDataStream, version } = useDataStream();

  const { artifact, setArtifact, setMetadata } = useArtifact();
  const lastProcessedIndex = useRef(-1);
  const lastProcessedVersion = useRef(-1);
  const pendingDeltasRef = useRef<
    Map<ArtifactKind, DataUIPart<CustomUIDataTypes>[]>
  >(new Map());

  useEffect(() => {
    if (version === lastProcessedVersion.current) {
      return;
    }
    lastProcessedVersion.current = version;

    const dataStream = getDataStream();

    if (!dataStream.length) {
      lastProcessedIndex.current = -1;
      return;
    }

    const newDeltas = dataStream.slice(lastProcessedIndex.current + 1);
    lastProcessedIndex.current = dataStream.length - 1;

    for (const delta of newDeltas) {
      const artifactKind = artifact.kind as ArtifactKind;
      const artifactDefinition = getArtifactDefinition(artifactKind);

      if (artifactDefinition?.onStreamPart) {
        artifactDefinition.onStreamPart({
          streamPart: delta,
          setArtifact,
          setMetadata,
        });
      } else {
        const pending = pendingDeltasRef.current.get(artifactKind) ?? [];
        pending.push(delta as DataUIPart<CustomUIDataTypes>);
        pendingDeltasRef.current.set(artifactKind, pending);

        loadArtifactDefinition(artifactKind)
          .then((definition) => {
            const queued = pendingDeltasRef.current.get(artifactKind);
            if (!queued) {
              return;
            }
            for (const queuedDelta of queued) {
              definition.onStreamPart({
                streamPart: queuedDelta,
                setArtifact,
                setMetadata,
              });
            }
            pendingDeltasRef.current.delete(artifactKind);
          })
          .catch((error) => {
            console.error("Failed to load artifact definition during stream", {
              kind: artifactKind,
              error,
            });
          });
      }

      setArtifact((draftArtifact) => {
        if (!draftArtifact) {
          return { ...initialArtifactData, status: "streaming" };
        }

        switch (delta.type) {
          case "data-id":
            return {
              ...draftArtifact,
              documentId: delta.data,
              status: "streaming",
            };

          case "data-title":
            return {
              ...draftArtifact,
              title: delta.data,
              status: "streaming",
            };

          case "data-kind":
            return {
              ...draftArtifact,
              kind: delta.data,
              status: "streaming",
            };

          case "data-clear":
            return {
              ...draftArtifact,
              content: "",
              status: "streaming",
            };

          case "data-finish":
            return {
              ...draftArtifact,
              status: "idle",
            };

          default:
            return draftArtifact;
        }
      });
    }
  }, [getDataStream, version, setArtifact, setMetadata, artifact]);

  return null;
}
