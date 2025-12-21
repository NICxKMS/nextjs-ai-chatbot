"use client";

import {
    ClipboardCopy,
    Download,
    LineChart,
    Redo,
    Sparkles,
    Undo,
} from "lucide-react";
import dynamic from "next/dynamic";
import { parse, unparse } from "papaparse";
import { toast } from "sonner";
import type { ArtifactContentProps } from "../types";
import { Artifact } from "./base";

// ============================================================================
// Dynamic Imports
// ============================================================================

const SheetEditor = dynamic(
    () => import("../components/editors").then((m) => m.SheetEditor),
    {
        ssr: false,
        loading: () => (
            <div className="p-2 text-muted-foreground text-xs">
                Loading spreadsheet…
            </div>
        ),
    }
);

// ============================================================================
// Sheet Artifact Definition
// ============================================================================

export const sheetArtifact = new Artifact<"sheet", undefined>({
    kind: "sheet",
    description: "Useful for working with spreadsheets",
    content: ({
        content,
        status,
        currentVersionIndex,
        isCurrentVersion,
        onSaveContent,
    }: ArtifactContentProps<undefined>) => {
        return (
            <SheetEditor
                content={content}
                isCurrentVersion={isCurrentVersion}
                onContentChange={onSaveContent}
                status={status}
            />
        );
    },
    onStreamPart: ({ streamPart, setArtifact }) => {
        if (streamPart.type === "data-sheetDelta") {
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
            description: "Copy as .csv",
            onClick: ({ content }) => {
                const parsed = parse<string[]>(content, {
                    skipEmptyLines: true,
                });
                const nonEmptyRows = parsed.data.filter((row) =>
                    row.some((cell) => cell.trim() !== "")
                );
                const cleanedCsv = unparse(nonEmptyRows);

                navigator.clipboard.writeText(cleanedCsv);
                toast.success("Copied csv to clipboard!");
            },
        },
        {
            icon: <Download size={18} />,
            description: "Download as .csv",
            onClick: ({ content }) => {
                const parsed = parse<string[]>(content, {
                    skipEmptyLines: true,
                });
                const nonEmptyRows = parsed.data.filter((row) =>
                    row.some((cell) => cell.trim() !== "")
                );
                const cleanedCsv = unparse(nonEmptyRows);

                const blob = new Blob([cleanedCsv], {
                    type: "text/csv;charset=utf-8;",
                });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = "spreadsheet.csv";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
                toast.success("CSV downloaded!");
            },
        },
    ],
    toolbar: [
        {
            icon: <Sparkles size={18} />,
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
            icon: <LineChart size={18} />,
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
    ],
});
