"use client";

import { ClipboardCopy, Download, Redo, Undo } from "lucide-react";
import { toast } from "sonner";
import { ImageEditor } from "../components/editors";
import { Artifact } from "./base";

// ============================================================================
// Image Artifact Definition
// ============================================================================

export const imageArtifact = new Artifact<"image", undefined>({
    kind: "image",
    description: "Useful for image generation",
    content: ImageEditor,
    onStreamPart: ({ streamPart, setArtifact }) => {
        if (streamPart.type === "data-imageDelta") {
            setArtifact((draftArtifact) => ({
                ...draftArtifact,
                content: streamPart.data as string,
                isVisible: true,
                status: "streaming",
            }));
        }
    },
    actions: [
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
        {
            icon: <Download size={18} />,
            description: "Download image",
            onClick: ({ content }) => {
                const link = document.createElement("a");
                link.href = `data:image/png;base64,${content}`;
                link.download = "generated-image.png";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success("Image downloaded!");
            },
        },
    ],
    toolbar: [],
});
