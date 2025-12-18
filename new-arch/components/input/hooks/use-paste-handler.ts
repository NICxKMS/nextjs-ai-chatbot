"use client";

import { useCallback, useEffect } from "react";
import type { UsePasteHandlerReturn } from "../types";

type UsePasteHandlerOptions = {
    enabled?: boolean;
    onPasteFiles?: (files: File[]) => void;
    onPasteText?: (text: string) => void;
};

export function usePasteHandler(
    options: UsePasteHandlerOptions = {}
): UsePasteHandlerReturn {
    const { enabled = true, onPasteFiles, onPasteText } = options;

    const handlePaste = useCallback(
        (event: ClipboardEvent) => {
            if (!enabled) {
                return;
            }

            const clipboardData = event.clipboardData;
            if (!clipboardData) {
                return;
            }

            // Handle file paste
            const files = Array.from(clipboardData.files);
            if (files.length > 0 && onPasteFiles) {
                event.preventDefault();
                onPasteFiles(files);
                return;
            }

            // Handle image paste from clipboard items
            const items = Array.from(clipboardData.items);
            const imageItems = items.filter((item) =>
                item.type.startsWith("image/")
            );

            if (imageItems.length > 0 && onPasteFiles) {
                event.preventDefault();
                const imageFiles = imageItems
                    .map((item) => item.getAsFile())
                    .filter((file): file is File => file !== null);
                if (imageFiles.length > 0) {
                    onPasteFiles(imageFiles);
                    return;
                }
            }

            // Handle text paste (let default behavior handle it)
            const text = clipboardData.getData("text/plain");
            if (text && onPasteText) {
                onPasteText(text);
            }
        },
        [enabled, onPasteFiles, onPasteText]
    );

    useEffect(() => {
        if (!enabled) {
            return;
        }

        document.addEventListener("paste", handlePaste);
        return () => {
            document.removeEventListener("paste", handlePaste);
        };
    }, [enabled, handlePaste]);

    return { handlePaste };
}
