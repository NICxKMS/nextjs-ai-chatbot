"use client";

import {
    ClipboardCopy,
    History,
    MessageSquare,
    Pen,
    Redo,
    Undo,
} from "lucide-react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import type { SuggestionLike } from "@/lib/editor";
import type { ArtifactContentProps } from "../types";
import { Artifact } from "./base";

// ============================================================================
// Types
// ============================================================================

/**
 * Metadata for text artifacts containing AI suggestions.
 */
type TextArtifactMetadata = {
    suggestions: SuggestionLike[];
};

// ============================================================================
// Dynamic Imports
// ============================================================================

const TextEditor = dynamic(
    () => import("../components/editors").then((m) => m.TextEditor),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-full items-center justify-center p-4">
                <div className="text-muted-foreground text-sm">
                    Loading editor…
                </div>
            </div>
        ),
    }
);

const DiffView = dynamic(
    () => import("../components/editors").then((m) => m.DiffView),
    {
        ssr: false,
        loading: () => (
            <div className="p-4 text-muted-foreground text-sm">
                Loading diff…
            </div>
        ),
    }
);

// ============================================================================
// Text Artifact Definition
// ============================================================================

export const textArtifact = new Artifact<"text", TextArtifactMetadata>({
    kind: "text",
    description: "Useful for text content, like drafting essays and emails.",
    initialize: async ({ documentId, setMetadata }) => {
        try {
            const response = await fetch(
                `/api/suggestions?documentId=${documentId}`
            );
            if (response.ok) {
                const suggestions = await response.json();
                setMetadata({ suggestions });
            } else {
                setMetadata({ suggestions: [] });
            }
        } catch {
            setMetadata({ suggestions: [] });
        }
    },
    content: ({
        mode,
        status,
        content,
        isCurrentVersion,
        currentVersionIndex,
        onSaveContent,
        getDocumentContentById,
        isLoading,
        metadata,
    }: ArtifactContentProps<TextArtifactMetadata>) => {
        if (isLoading) {
            return (
                <div className="flex h-full items-center justify-center p-4">
                    <div className="text-muted-foreground text-sm">
                        Loading document…
                    </div>
                </div>
            );
        }

        if (mode === "diff") {
            const oldContent = getDocumentContentById(currentVersionIndex - 1);
            const newContent = getDocumentContentById(currentVersionIndex);
            return <DiffView newContent={newContent} oldContent={oldContent} />;
        }

        const suggestions = metadata?.suggestions ?? [];

        return (
            <div className="flex flex-row px-4 py-8 md:p-20">
                <TextEditor
                    content={content}
                    isCurrentVersion={isCurrentVersion}
                    onContentChange={onSaveContent}
                    status={status}
                    suggestions={suggestions}
                />

                {suggestions.length > 0 && (
                    <div className="h-dvh w-12 shrink-0 md:hidden" />
                )}
            </div>
        );
    },
    onStreamPart: ({ streamPart, setArtifact, setMetadata }) => {
        if (streamPart.type === "data-textDelta") {
            setArtifact((draftArtifact) => ({
                ...draftArtifact,
                content: draftArtifact.content + (streamPart.data as string),
                isVisible:
                    draftArtifact.status === "streaming" &&
                    draftArtifact.content.length > 400 &&
                    draftArtifact.content.length < 450
                        ? true
                        : draftArtifact.isVisible,
                status: "streaming",
            }));
        }

        // Handle incoming suggestions during streaming
        if (streamPart.type === "data-suggestion") {
            setMetadata((currentMetadata) => ({
                suggestions: [
                    ...(currentMetadata?.suggestions ?? []),
                    streamPart.data as SuggestionLike,
                ],
            }));
        }
    },
    actions: [
        {
            icon: <History size={18} />,
            description: "View changes",
            onClick: ({ handleVersionChange }) => {
                handleVersionChange("toggle");
            },
            isDisabled: ({ currentVersionIndex }) => currentVersionIndex === 0,
        },
        {
            icon: <Undo size={18} />,
            description: "View Previous version",
            onClick: ({ handleVersionChange }) => {
                handleVersionChange("prev");
            },
            isDisabled: ({ currentVersionIndex }) => currentVersionIndex === 0,
        },
        {
            icon: <Redo size={18} />,
            description: "View Next version",
            onClick: ({ handleVersionChange }) => {
                handleVersionChange("next");
            },
            isDisabled: ({ isCurrentVersion }) => isCurrentVersion,
        },
        {
            icon: <ClipboardCopy size={18} />,
            description: "Copy to clipboard",
            onClick: ({ content }) => {
                navigator.clipboard.writeText(content);
                toast.success("Copied to clipboard!");
            },
        },
    ],
    toolbar: [
        {
            icon: <Pen size={18} />,
            description: "Add final polish",
            onClick: ({ sendMessage }) => {
                sendMessage({
                    role: "user",
                    parts: [
                        {
                            type: "text",
                            text: "Please add final polish and check for grammar, add section titles for better structure, and ensure everything reads smoothly.",
                        },
                    ],
                });
            },
        },
        {
            icon: <MessageSquare size={18} />,
            description: "Request suggestions",
            onClick: ({ sendMessage }) => {
                sendMessage({
                    role: "user",
                    parts: [
                        {
                            type: "text",
                            text: "Please add suggestions you have that could improve the writing.",
                        },
                    ],
                });
            },
        },
    ],
});
