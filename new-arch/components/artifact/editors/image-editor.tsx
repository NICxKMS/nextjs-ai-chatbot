"use client";

import Image from "next/image";
import { toast } from "sonner";
import type { ArtifactContentProps } from "../types";
import { ArtifactDefinition } from "../types";

// ============================================================================
// Types
// ============================================================================

type ImageMetadata = {
    isLoading: boolean;
};

// ============================================================================
// Image Editor Content Component
// ============================================================================

function ImageEditorContent({
    content,
    status,
    metadata,
}: ArtifactContentProps<ImageMetadata>) {
    const isLoading = status === "streaming" || metadata?.isLoading;

    if (isLoading && !content) {
        return (
            <div className="flex flex-1 items-center justify-center p-8">
                <div className="space-y-4 text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="text-muted-foreground text-sm">
                        Generating image…
                    </p>
                </div>
            </div>
        );
    }

    if (!content) {
        return (
            <div className="flex flex-1 items-center justify-center p-8">
                <p className="text-muted-foreground text-sm">
                    No image to display
                </p>
            </div>
        );
    }

    // Content is expected to be base64 data URL
    const imageSrc = content.startsWith("data:")
        ? content
        : `data:image/png;base64,${content}`;

    return (
        <div className="flex flex-1 items-center justify-center overflow-auto bg-muted/20 p-4">
            <Image
                alt="Generated artifact"
                className="max-h-full max-w-full rounded-lg object-contain shadow-md"
                height={0}
                sizes="100vw"
                src={imageSrc}
                style={{ width: "auto", height: "auto" }}
                unoptimized
                width={0}
            />
        </div>
    );
}

// ============================================================================
// Icon Components
// ============================================================================

function DownloadIcon() {
    return (
        <svg
            fill="none"
            height="16"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 16 16"
            width="16"
        >
            <path d="M8 2v9M4 8l4 4 4-4M2 14h12" />
        </svg>
    );
}

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

// ============================================================================
// Helper Functions
// ============================================================================

function downloadImage(content: string, filename: string) {
    const imageSrc = content.startsWith("data:")
        ? content
        : `data:image/png;base64,${content}`;

    const link = document.createElement("a");
    link.href = imageSrc;
    link.download = filename || "artifact-image.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function copyImageToClipboard(content: string) {
    try {
        const imageSrc = content.startsWith("data:")
            ? content
            : `data:image/png;base64,${content}`;
        const response = await fetch(imageSrc);
        const blob = await response.blob();
        await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob }),
        ]);
        toast.success("Image copied to clipboard");
    } catch {
        toast.error("Failed to copy image");
    }
}

// ============================================================================
// Artifact Definition
// ============================================================================

export const imageArtifact = new ArtifactDefinition<"image", ImageMetadata>({
    kind: "image",
    description: "Display and manage generated images",
    content: ImageEditorContent,

    actions: [
        {
            icon: <DownloadIcon />,
            description: "Download image",
            onClick: async ({ content }) => {
                await downloadImage(content, `image-${Date.now()}.png`);
                toast.success("Image downloaded");
            },
            isDisabled: ({ content }) => !content,
        },
        {
            icon: <CopyIcon />,
            description: "Copy image to clipboard",
            onClick: async ({ content }) => {
                await copyImageToClipboard(content);
            },
            isDisabled: ({ content }) => !content,
        },
    ],

    toolbar: [
        {
            icon: <span>💬</span>,
            description: "Request modifications",
            onClick: ({ sendMessage: _sendMessage }) => {
                // Request image modifications via chat
            },
        },
    ],

    initialize: ({ setMetadata }) => {
        setMetadata({ isLoading: false });
    },

    onStreamPart: ({ streamPart, setArtifact, setMetadata }) => {
        if (streamPart.type === "data-imageDelta") {
            setArtifact((draft) => ({
                ...draft,
                content: streamPart.data as string,
                status: "streaming",
                isVisible: true,
            }));
            setMetadata({ isLoading: false });
        }
    },
});
