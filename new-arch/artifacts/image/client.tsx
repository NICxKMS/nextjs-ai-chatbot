"use client";

/**
 * Image Artifact Client Component
 * @module new-arch/artifacts/image/client
 *
 * Client-side component for image viewing and actions.
 */

import { toast } from "sonner";

import type { ArtifactAction, ArtifactToolbarItem } from "../types";

// =============================================================================
// METADATA TYPE
// =============================================================================

export type ImageArtifactMetadata = Record<string, never>;

// =============================================================================
// ARTIFACT CONFIGURATION
// =============================================================================

export const imageArtifactConfig = {
    kind: "image" as const,
    description: "AI-generated images",

    initialize: () => null,

    onStreamPart: (
        streamPart: { type: string; data: string },
        setArtifact: (updater: (draft: any) => any) => void
    ) => {
        if (streamPart.type === "data-imageDelta") {
            setArtifact((draft) => ({
                ...draft,
                content: streamPart.data,
                isVisible: true,
                status: "streaming",
            }));
        }
    },
};

// =============================================================================
// ACTIONS
// =============================================================================

export const imageActions: ArtifactAction<ImageArtifactMetadata>[] = [
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
        description: "Copy image to clipboard",
        onClick: ({ content }) => {
            const img = new Image();
            img.src = `data:image/png;base64,${content}`;

            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx?.drawImage(img, 0, 0);
                canvas.toBlob((blob) => {
                    if (blob) {
                        navigator.clipboard.write([
                            new ClipboardItem({ "image/png": blob }),
                        ]);
                    }
                }, "image/png");
            };

            toast.success("Copied image to clipboard!");
        },
    },
];

// =============================================================================
// TOOLBAR
// =============================================================================

export const imageToolbar: ArtifactToolbarItem<ImageArtifactMetadata>[] = [];

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export type ImageEditorProps = {
    content: string;
    status: string;
    isCurrentVersion: boolean;
    currentVersionIndex: number;
    onSaveContent: (content: string) => void;
};

/**
 * Image artifact content renderer
 */
export function ImageArtifactContent({
    content,
    _status,
    _isCurrentVersion,
    _currentVersionIndex,
}: ImageEditorProps) {
    if (!content) {
        return (
            <div className="flex h-full items-center justify-center p-8 text-muted-foreground">
                No image generated yet
            </div>
        );
    }

    // Base64 images cannot use Next.js Image optimization
    return (
        <div className="flex items-center justify-center p-4">
            {/* biome-ignore lint/performance/noImgElement: Base64 data URLs not supported by Next Image */}
            <img
                alt="AI-generated content"
                className="max-h-[600px] max-w-full rounded-lg object-contain shadow-lg"
                height={600}
                src={`data:image/png;base64,${content}`}
                width={600}
            />
        </div>
    );
}
