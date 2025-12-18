"use client";

import dynamic from "next/dynamic";
import { toast } from "sonner";
import type { ArtifactContentProps } from "../types";
import { ArtifactDefinition } from "../types";

// ============================================================================
// Lazy-loaded Sheet Editor (react-data-grid)
// ============================================================================

const SpreadsheetEditor = dynamic(
    () => import("@/components/sheet-editor").then((m) => m.SpreadsheetEditor),
    {
        ssr: false,
        loading: () => (
            <div className="flex-1 animate-pulse p-4">
                <div className="space-y-2">
                    <div className="h-8 rounded bg-muted" />
                    <div className="h-6 rounded bg-muted" />
                    <div className="h-6 rounded bg-muted" />
                    <div className="h-6 rounded bg-muted" />
                    <div className="h-6 rounded bg-muted" />
                </div>
            </div>
        ),
    }
);

// ============================================================================
// Types
// ============================================================================

type SheetMetadata = {
    rowCount: number;
    colCount: number;
};

// ============================================================================
// Sheet Editor Content Component
// ============================================================================

function SheetEditorContent({
    content,
    status,
    onSaveContent,
    isCurrentVersion,
    currentVersionIndex,
}: ArtifactContentProps<SheetMetadata>) {
    const handleChange = (value: string) => {
        if (isCurrentVersion) {
            onSaveContent(value, true);
        }
    };

    return (
        <div className="flex-1 overflow-auto">
            <SpreadsheetEditor
                content={content}
                currentVersionIndex={currentVersionIndex}
                isCurrentVersion={isCurrentVersion}
                saveContent={(val: string, _: boolean) => handleChange(val)}
                status={status}
            />
        </div>
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

// ============================================================================
// Helper Functions
// ============================================================================

function downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "spreadsheet.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ============================================================================
// Artifact Definition
// ============================================================================

export const sheetArtifact = new ArtifactDefinition<"sheet", SheetMetadata>({
    kind: "sheet",
    description: "Spreadsheet editing with CSV support",
    content: SheetEditorContent,

    actions: [
        {
            icon: <CopyIcon />,
            description: "Copy as CSV",
            onClick: async ({ content }) => {
                await navigator.clipboard.writeText(content);
                toast.success("CSV copied to clipboard");
            },
        },
        {
            icon: <DownloadIcon />,
            description: "Download CSV",
            onClick: ({ content }) => {
                downloadCSV(content, `spreadsheet-${Date.now()}.csv`);
                toast.success("CSV downloaded");
            },
        },
    ],

    toolbar: [
        {
            icon: <span>💬</span>,
            description: "Request data modifications",
            onClick: ({ sendMessage: _sendMessage }) => {
                // Request spreadsheet modifications via chat
            },
        },
    ],

    initialize: ({ setMetadata }) => {
        setMetadata({ rowCount: 0, colCount: 0 });
    },

    onStreamPart: ({ streamPart, setArtifact }) => {
        if (streamPart.type === "data-sheetDelta") {
            setArtifact((draft) => ({
                ...draft,
                content: draft.content + (streamPart.data as string),
                status: "streaming",
                isVisible: true,
            }));
        }
    },
});
