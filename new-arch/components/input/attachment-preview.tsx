"use client";

import Image from "next/image";
import { memo } from "react";
import { Button } from "../ui/button";
import type { AttachmentPreviewProps } from "./types";

function PureAttachmentPreview({
    attachment,
    isUploading = false,
    onRemove,
}: AttachmentPreviewProps) {
    const { name, url, contentType } = attachment;
    const isImage = contentType?.startsWith("image");

    return (
        <div
            className="group relative size-16 shrink-0 overflow-hidden rounded-lg border bg-muted"
            data-testid="attachment-preview"
        >
            {isImage && url ? (
                <Image
                    alt={name ?? "Attachment preview"}
                    className="size-full object-cover"
                    height={64}
                    sizes="64px"
                    src={url}
                    width={64}
                />
            ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground text-xs">
                    File
                </div>
            )}

            {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <LoadingSpinner />
                </div>
            )}

            {onRemove && !isUploading && (
                <Button
                    aria-label={`Remove ${name}`}
                    className="absolute top-0.5 right-0.5 size-4 rounded-full p-0 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={onRemove}
                    size="sm"
                    variant="destructive"
                >
                    <CrossIcon />
                </Button>
            )}

            <div className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-1 py-0.5 text-[10px] text-white">
                {name}
            </div>
        </div>
    );
}

function LoadingSpinner() {
    return (
        <svg
            className="size-4 animate-spin text-white"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            />
            <path
                className="opacity-75"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                fill="currentColor"
            />
        </svg>
    );
}

function CrossIcon() {
    return (
        <svg
            className="size-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                d="M6 18L18 6M6 6l12 12"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
            />
        </svg>
    );
}

export const AttachmentPreview = memo(PureAttachmentPreview);
