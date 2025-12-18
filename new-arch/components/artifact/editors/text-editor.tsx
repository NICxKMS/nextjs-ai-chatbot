"use client";

import dynamic from "next/dynamic";
import { toast } from "sonner";
import type { Suggestion } from "@/lib/data/schema";
import type { ArtifactContentProps } from "../types";
import { ArtifactDefinition } from "../types";

// ============================================================================
// Lazy-loaded Text Editor (TipTap)
// ============================================================================

const TipTapEditor = dynamic(
    () => import("@/components/text-editor").then((m) => m.Editor),
    {
        ssr: false,
        loading: () => (
            <div className="flex-1 animate-pulse p-6">
                <div className="space-y-4">
                    <div className="h-8 w-1/3 rounded bg-muted" />
                    <div className="h-4 w-full rounded bg-muted" />
                    <div className="h-4 w-full rounded bg-muted" />
                    <div className="h-4 w-2/3 rounded bg-muted" />
                </div>
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

// ============================================================================
// Types
// ============================================================================

type TextMetadata = {
    suggestions: Suggestion[];
};

// ============================================================================
// Text Editor Content Component
// ============================================================================

function TextEditorContent({
    content,
    mode,
    status,
    onSaveContent,
    isCurrentVersion,
    currentVersionIndex,
    getDocumentContentById,
    suggestions,
    metadata,
}: ArtifactContentProps<TextMetadata>) {
    if (mode === "diff") {
        const oldContent = getDocumentContentById(currentVersionIndex - 1);
        const newContent = getDocumentContentById(currentVersionIndex);
        return <DiffView newContent={newContent} oldContent={oldContent} />;
    }

    const handleChange = (value: string) => {
        if (isCurrentVersion) {
            onSaveContent(value, true);
        }
    };

    // Use metadata suggestions if available, otherwise fall back to prop
    const activeSuggestions = metadata?.suggestions ?? suggestions ?? [];

    return (
        <TipTapEditor
            content={content}
            currentVersionIndex={currentVersionIndex}
            isCurrentVersion={isCurrentVersion}
            onSaveContent={handleChange}
            status={status}
            suggestions={activeSuggestions}
        />
    );
}

// ============================================================================
// Icon Components
// ============================================================================

function CopyIcon() {
    return (
        <svg
            fill="none"
            height="16"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 16 16"
            width="16"
        >
            <rect height="8" rx="1" width="8" x="5" y="5" />
            <path d="M3 11V3h8" />
        </svg>
    );
}

function DiffIcon() {
    return (
        <svg
            fill="none"
            height="16"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 16 16"
            width="16"
        >
            <path d="M8 2v12M2 8h12" />
        </svg>
    );
}

// ============================================================================
// Artifact Definition
// ============================================================================

export const textArtifact = new ArtifactDefinition<"text", TextMetadata>({
    kind: "text",
    description: "Rich text editing with Markdown support",
    content: TextEditorContent,

    actions: [
        {
            icon: <CopyIcon />,
            description: "Copy text to clipboard",
            onClick: async ({ content }) => {
                await navigator.clipboard.writeText(content);
                toast.success("Copied to clipboard");
            },
        },
        {
            icon: <DiffIcon />,
            description: "Toggle diff view",
            onClick: ({ handleVersionChange }) => {
                handleVersionChange("toggle");
            },
            isDisabled: ({ isCurrentVersion }) => isCurrentVersion,
        },
    ],

    toolbar: [
        {
            icon: <span>💬</span>,
            description: "Request AI edits",
            onClick: ({ sendMessage: _sendMessage }) => {
                // Trigger AI modification via chat
            },
        },
    ],

    initialize: async ({ documentId, setMetadata }) => {
        // Fetch suggestions for the document
        try {
            const { getSuggestions } = await import("@/artifacts/actions");
            const suggestions = await getSuggestions({ documentId });
            setMetadata({ suggestions: suggestions ?? [] });
        } catch {
            setMetadata({ suggestions: [] });
        }
    },

    onStreamPart: ({ streamPart, setArtifact, setMetadata }) => {
        if (streamPart.type === "data-textDelta") {
            setArtifact((draft) => ({
                ...draft,
                content: draft.content + (streamPart.data as string),
                isVisible:
                    draft.status === "streaming" &&
                    draft.content.length > 400 &&
                    draft.content.length < 450
                        ? true
                        : draft.isVisible,
                status: "streaming",
            }));
        }

        if (streamPart.type === "data-suggestion") {
            setMetadata((m: TextMetadata | null) => ({
                suggestions: [
                    ...(m?.suggestions ?? []),
                    streamPart.data as Suggestion,
                ],
            }));
        }
    },
});
