"use client";

import { DownloadIcon, ExpandIcon } from "lucide-react";
import type { MouseEvent } from "react";
import { useCallback, useState } from "react";
import {
    Image as BaseImage,
    type ImageProps as BaseImageProps,
} from "@/components/ai-elements/image";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils/index";

/**
 * Extended image props with download and preview functionality
 */
export interface EnhancedImageProps extends BaseImageProps {
    /** Enable download button */
    downloadable?: boolean;
    /** Custom download filename */
    downloadFilename?: string;
    /** Enable full-screen preview modal */
    previewable?: boolean;
    /** Called when download is triggered */
    onDownload?: () => void;
    /** Called when preview is opened */
    onPreviewOpen?: () => void;
    /** Called when preview is closed */
    onPreviewClose?: () => void;
}

/**
 * Download image from base64 data
 */
const downloadImage = (
    base64: string,
    mediaType: string,
    filename: string
): void => {
    const link = document.createElement("a");
    link.href = `data:${mediaType};base64,${base64}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Generate a default filename for the image
 */
const generateFilename = (mediaType: string): string => {
    const extension = mediaType.split("/")[1] ?? "png";
    const timestamp = Date.now();
    return `ai-image-${timestamp}.${extension}`;
};

/**
 * Enhanced Image wrapper with download and full-screen preview functionality.
 */
export function Image({
    downloadable = true,
    downloadFilename,
    previewable = true,
    onDownload,
    onPreviewOpen,
    onPreviewClose,
    base64,
    mediaType,
    className,
    alt,
    ...props
}: EnhancedImageProps) {
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const handleDownload = useCallback(
        (event: MouseEvent) => {
            event.stopPropagation();
            if (!base64 || !mediaType) {
                return;
            }

            const filename = downloadFilename ?? generateFilename(mediaType);
            downloadImage(base64, mediaType, filename);
            onDownload?.();
        },
        [base64, mediaType, downloadFilename, onDownload]
    );

    const handlePreviewOpenChange = useCallback(
        (open: boolean) => {
            setIsPreviewOpen(open);
            if (open) {
                onPreviewOpen?.();
            } else {
                onPreviewClose?.();
            }
        },
        [onPreviewOpen, onPreviewClose]
    );

    const imageElement = (
        <BaseImage
            alt={alt}
            base64={base64}
            className={cn(
                previewable &&
                    "cursor-pointer transition-opacity hover:opacity-90",
                className
            )}
            mediaType={mediaType}
            {...props}
        />
    );

    // If neither feature is enabled, return base image
    if (!downloadable && !previewable) {
        return imageElement;
    }

    return (
        <div className="group relative inline-block">
            {previewable ? (
                <Dialog
                    onOpenChange={handlePreviewOpenChange}
                    open={isPreviewOpen}
                >
                    <DialogTrigger asChild>{imageElement}</DialogTrigger>
                    <DialogContent className="max-h-[90vh] max-w-[90vw] overflow-hidden border-none bg-transparent p-0 shadow-none">
                        <DialogTitle className="sr-only">
                            {alt ?? "Image preview"}
                        </DialogTitle>
                        <div className="relative">
                            <img
                                alt={alt ?? "Full size preview"}
                                className="max-h-[85vh] max-w-full rounded-lg object-contain"
                                src={`data:${mediaType};base64,${base64}`}
                            />
                            <div className="absolute top-2 right-2 flex gap-2">
                                {downloadable && (
                                    <Button
                                        className="bg-background/80 backdrop-blur-sm"
                                        onClick={handleDownload}
                                        size="icon-sm"
                                        variant="secondary"
                                    >
                                        <DownloadIcon className="size-4" />
                                        <span className="sr-only">
                                            Download image
                                        </span>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            ) : (
                imageElement
            )}

            {/* Overlay actions for non-preview mode */}
            {!previewable && downloadable && (
                <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                        className="bg-background/80 backdrop-blur-sm"
                        onClick={handleDownload}
                        size="icon-sm"
                        variant="secondary"
                    >
                        <DownloadIcon className="size-4" />
                        <span className="sr-only">Download image</span>
                    </Button>
                </div>
            )}

            {/* Preview hint for previewable images */}
            {previewable && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-black/0 transition-colors group-hover:bg-black/10">
                    <ExpandIcon className="size-8 text-white opacity-0 drop-shadow-lg transition-opacity group-hover:opacity-70" />
                </div>
            )}
        </div>
    );
}

// Re-export types
export type { BaseImageProps };
