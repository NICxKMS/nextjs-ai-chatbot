"use client";

/**
 * Text Artifact Client Component
 * @module new-arch/artifacts/text/client
 *
 * Client-side component for text editing with suggestions.
 */

import dynamic from "next/dynamic";
import { toast } from "sonner";

import type {
    ArtifactAction,
    ArtifactToolbarItem,
    SuggestionData,
} from "../types";

// =============================================================================
// DYNAMIC IMPORTS
// =============================================================================

const Editor = dynamic(
    () => import("@/components/text-editor").then((m) => m.Editor),
    {
        ssr: false,
        loading: () => (
            <div className="p-4 text-muted-foreground text-sm">
                Loading editor…
            </div>
        ),
    }
);

const DiffView = dynamic(
    () => import("@/components/diffview").then((m) => m.DiffView),
    {
        ssr: false,
        loading: () => (
            <div className="p-4 text-muted-foreground text-sm">
                Loading diff…
            </div>
        ),
    }
);

// =============================================================================
// METADATA TYPE
// =============================================================================

export type TextArtifactMetadata = {
    suggestions: SuggestionData[];
};

// =============================================================================
// ARTIFACT CONFIGURATION
// =============================================================================

export const textArtifactConfig = {
    kind: "text" as const,
    description: "Rich text documents with markdown support",

    initialize: (
        _documentId: string,
        setMetadata: (metadata: TextArtifactMetadata) => void
    ) => {
        // Load suggestions from server
        // const suggestions = await getSuggestions({ documentId });
        setMetadata({ suggestions: [] });
    },

    onStreamPart: (
        streamPart: { type: string; data: any },
        setMetadata: (
            updater:
                | TextArtifactMetadata
                | ((prev: TextArtifactMetadata) => TextArtifactMetadata)
        ) => void,
        setArtifact: (updater: (draft: any) => any) => void
    ) => {
        if (streamPart.type === "data-suggestion") {
            setMetadata((metadata) => ({
                suggestions: [
                    ...(metadata?.suggestions ?? []),
                    streamPart.data,
                ],
            }));
        }

        if (streamPart.type === "data-textDelta") {
            setArtifact((draft) => ({
                ...draft,
                content: draft.content + streamPart.data,
                isVisible:
                    draft.status === "streaming" &&
                    draft.content.length > 400 &&
                    draft.content.length < 450
                        ? true
                        : draft.isVisible,
                status: "streaming",
            }));
        }
    },
};

// =============================================================================
// ACTIONS
// =============================================================================

export const textActions: ArtifactAction<TextArtifactMetadata>[] = [
    {
        icon: null, // ClockRewind
        description: "View changes",
        onClick: ({ handleVersionChange }) => {
            handleVersionChange("toggle");
        },
        isDisabled: ({ currentVersionIndex }) => currentVersionIndex === 0,
    },
    {
        icon: null, // UndoIcon
        description: "View Previous version",
        onClick: ({ handleVersionChange }) => {
            handleVersionChange("prev");
        },
        isDisabled: ({ currentVersionIndex }) => currentVersionIndex === 0,
    },
    {
        icon: null, // RedoIcon
        description: "View Next version",
        onClick: ({ handleVersionChange }) => {
            handleVersionChange("next");
        },
        isDisabled: ({ isCurrentVersion }) => isCurrentVersion,
    },
    {
        icon: null, // CopyIcon
        description: "Copy to clipboard",
        onClick: ({ content }) => {
            navigator.clipboard.writeText(content);
            toast.success("Copied to clipboard!");
        },
    },
];

// =============================================================================
// TOOLBAR
// =============================================================================

export const textToolbar: ArtifactToolbarItem<TextArtifactMetadata>[] = [
    {
        icon: null, // PenIcon
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
        icon: null, // MessageIcon
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
];

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export type TextEditorProps = {
    content: string;
    status: string;
    mode?: "edit" | "diff";
    isCurrentVersion: boolean;
    currentVersionIndex: number;
    onSaveContent: (content: string) => void;
    getDocumentContentById?: (index: number) => string;
    isLoading?: boolean;
    metadata?: TextArtifactMetadata;
};

/**
 * Text artifact content renderer
 */
export function TextArtifactContent({
    content,
    status,
    mode = "edit",
    isCurrentVersion,
    currentVersionIndex,
    onSaveContent,
    getDocumentContentById,
    isLoading,
    metadata,
}: TextEditorProps) {
    if (isLoading) {
        return (
            <div className="p-4 text-muted-foreground text-sm">
                Loading document…
            </div>
        );
    }

    if (mode === "diff" && getDocumentContentById) {
        const oldContent = getDocumentContentById(currentVersionIndex - 1);
        const newContent = getDocumentContentById(currentVersionIndex);

        return <DiffView newContent={newContent} oldContent={oldContent} />;
    }

    return (
        <div className="flex flex-row px-4 py-8 md:p-20">
            <Editor
                content={content}
                currentVersionIndex={currentVersionIndex}
                isCurrentVersion={isCurrentVersion}
                onSaveContent={onSaveContent}
                status={status}
                suggestions={metadata?.suggestions ?? []}
            />

            {metadata?.suggestions && metadata.suggestions.length > 0 && (
                <div className="h-dvh w-12 shrink-0 md:hidden" />
            )}
        </div>
    );
}
