"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Attachment, UploadResult, UseFileUploadReturn } from "../types";

const MAX_CONCURRENT_UPLOADS = 3;

type UseFileUploadOptions = {
    onUploadComplete?: (attachments: Attachment[]) => void;
};

export function useFileUpload(
    options: UseFileUploadOptions = {}
): UseFileUploadReturn {
    const { onUploadComplete } = options;
    const [uploadQueue, setUploadQueue] = useState<string[]>([]);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
        };
    }, []);

    const uploadFile = useCallback(
        async (file: File): Promise<UploadResult | undefined> => {
            const formData = new FormData();
            formData.append("file", file);

            abortControllerRef.current = new AbortController();

            try {
                const response = await fetch("/api/files/upload", {
                    method: "POST",
                    body: formData,
                    signal: abortControllerRef.current.signal,
                });

                if (response.ok) {
                    const data = await response.json();
                    const { url, pathname, contentType, filename } = data;
                    return {
                        url,
                        name: filename ?? pathname ?? file.name,
                        contentType,
                    };
                }

                const { error } = await response.json();
                toast.error(error);
            } catch (error) {
                if (error instanceof Error && error.name === "AbortError") {
                    return;
                }
                toast.error("Failed to upload file, please try again!");
            }
            return;
        },
        []
    );

    const handleFileChange = useCallback(
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(event.target.files || []);
            if (files.length === 0) {
                return;
            }

            setUploadQueue(files.map((file) => file.name));

            try {
                const uploadedAttachments: UploadResult[] = [];

                // Batch uploads to avoid overwhelming server
                for (let i = 0; i < files.length; i += MAX_CONCURRENT_UPLOADS) {
                    const batch = files.slice(i, i + MAX_CONCURRENT_UPLOADS);
                    const batchResults = await Promise.all(
                        batch.map(uploadFile)
                    );
                    const successfulResults = batchResults.filter(
                        (result): result is UploadResult => result !== undefined
                    );
                    uploadedAttachments.push(...successfulResults);
                }

                onUploadComplete?.(uploadedAttachments);
            } catch (error) {
                console.error("Error uploading files:", error);
            } finally {
                setUploadQueue([]);
            }
        },
        [uploadFile, onUploadComplete]
    );

    const clearQueue = useCallback(() => {
        setUploadQueue([]);
        abortControllerRef.current?.abort();
    }, []);

    return {
        uploadQueue,
        uploadFile,
        handleFileChange,
        clearQueue,
    };
}
