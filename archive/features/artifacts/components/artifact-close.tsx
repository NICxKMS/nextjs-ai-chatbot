"use client";

import { X } from "lucide-react";
import { memo } from "react";

import { Button } from "@/components/ui/button";
import { initialArtifactData, useArtifact } from "../hooks";

function PureArtifactClose() {
    const { setArtifact } = useArtifact();

    return (
        <Button
            aria-label="Close artifact panel"
            className="h-fit p-2 dark:hover:bg-zinc-700"
            data-testid="artifact-close-button"
            onClick={() => {
                setArtifact((currentArtifact) =>
                    currentArtifact.status === "streaming"
                        ? {
                              ...currentArtifact,
                              isVisible: false,
                          }
                        : { ...initialArtifactData, status: "idle" }
                );
            }}
            variant="outline"
        >
            <X size={18} />
        </Button>
    );
}

export const ArtifactClose = memo(PureArtifactClose, () => true);
