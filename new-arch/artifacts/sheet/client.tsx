"use client";

/**
 * Sheet Artifact Client Component
 * @module new-arch/artifacts/sheet/client
 *
 * Client-side component for spreadsheet editing.
 */

import dynamic from "next/dynamic";
import { toast } from "sonner";

import type { ArtifactAction, ArtifactToolbarItem } from "../types";

// =============================================================================
// DYNAMIC IMPORTS
// =============================================================================

const SpreadsheetEditor = dynamic(
    () => import("@/components/sheet-editor").then((m) => m.SpreadsheetEditor),
    {
        ssr: false,
        loading: () => (
            <div className="p-2 text-muted-foreground text-xs">
                Loading spreadsheet…
            </div>
        ),
    }
);

// =============================================================================
// METADATA TYPE
// =============================================================================

export type SheetArtifactMetadata = Record<string, never>;

// =============================================================================
// CSV UTILITIES
// =============================================================================

/**
 * Parse CSV string into 2D array
 */
function parseCSV(csv: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = "";
    let inQuotes = false;

    for (let i = 0; i < csv.length; i++) {
        const char = csv[i];
        const nextChar = csv[i + 1];

        if (inQuotes) {
            if (char === '"' && nextChar === '"') {
                currentCell += '"';
                i++;
            } else if (char === '"') {
                inQuotes = false;
            } else {
                currentCell += char;
            }
        } else if (char === '"') {
            inQuotes = true;
        } else if (char === ",") {
            currentRow.push(currentCell);
            currentCell = "";
        } else if (char === "\n" || (char === "\r" && nextChar === "\n")) {
            currentRow.push(currentCell);
            rows.push(currentRow);
            currentRow = [];
            currentCell = "";
            if (char === "\r") {
                i++;
            }
        } else if (char !== "\r") {
            currentCell += char;
        }
    }

    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
    }

    return rows;
}

/**
 * Convert 2D array back to CSV string
 */
function toCSV(rows: string[][]): string {
    return rows
        .map((row) =>
            row
                .map((cell) => {
                    if (
                        cell.includes(",") ||
                        cell.includes('"') ||
                        cell.includes("\n")
                    ) {
                        return `"${cell.replace(/"/g, '""')}"`;
                    }
                    return cell;
                })
                .join(",")
        )
        .join("\n");
}

/**
 * Clean CSV by removing empty rows
 */
function cleanCSV(content: string): string {
    const rows = parseCSV(content);
    const nonEmptyRows = rows.filter((row) =>
        row.some((cell) => cell.trim() !== "")
    );
    return toCSV(nonEmptyRows);
}

// =============================================================================
// ARTIFACT CONFIGURATION
// =============================================================================

export const sheetArtifactConfig = {
    kind: "sheet" as const,
    description: "CSV-based spreadsheet data",

    initialize: () => null,

    onStreamPart: (
        streamPart: { type: string; data: string },
        setArtifact: (updater: (draft: any) => any) => void
    ) => {
        if (streamPart.type === "data-sheetDelta") {
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

export const sheetActions: ArtifactAction<SheetArtifactMetadata>[] = [
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
        description: "Copy as .csv",
        onClick: ({ content }) => {
            const cleanedCsv = cleanCSV(content);
            navigator.clipboard.writeText(cleanedCsv);
            toast.success("Copied csv to clipboard!");
        },
    },
];

// =============================================================================
// TOOLBAR
// =============================================================================

export const sheetToolbar: ArtifactToolbarItem<SheetArtifactMetadata>[] = [
    {
        icon: null, // SparklesIcon
        description: "Format and clean data",
        onClick: ({ sendMessage }) => {
            sendMessage({
                role: "user",
                parts: [
                    {
                        type: "text",
                        text: "Can you please format and clean the data?",
                    },
                ],
            });
        },
    },
    {
        icon: null, // LineChartIcon
        description: "Analyze and visualize data",
        onClick: ({ sendMessage }) => {
            sendMessage({
                role: "user",
                parts: [
                    {
                        type: "text",
                        text: "Can you please analyze and visualize the data by creating a new code artifact in python?",
                    },
                ],
            });
        },
    },
];

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export type SheetEditorProps = {
    content: string;
    status: string;
    isCurrentVersion: boolean;
    currentVersionIndex: number;
    onSaveContent: (content: string) => void;
};

/**
 * Sheet artifact content renderer
 */
export function SheetArtifactContent({
    content,
    status,
    isCurrentVersion,
    currentVersionIndex,
    onSaveContent,
}: SheetEditorProps) {
    return (
        <SpreadsheetEditor
            content={content}
            currentVersionIndex={currentVersionIndex}
            isCurrentVersion={isCurrentVersion}
            saveContent={onSaveContent}
            status={status}
        />
    );
}
