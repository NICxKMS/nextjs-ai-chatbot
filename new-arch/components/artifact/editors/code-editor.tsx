"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { toast } from "sonner";
import type { ArtifactContentProps } from "../types";
import { ArtifactDefinition } from "../types";

// ============================================================================
// Lazy-loaded Code Editor
// ============================================================================

const CodeMirrorEditor = dynamic(
    () => import("@/components/code-editor").then((m) => m.CodeEditor),
    {
        ssr: false,
        loading: () => (
            <div className="flex-1 animate-pulse p-4">
                <div className="space-y-2">
                    <div className="h-4 w-3/4 rounded bg-muted" />
                    <div className="h-4 w-1/2 rounded bg-muted" />
                    <div className="h-4 w-5/6 rounded bg-muted" />
                </div>
            </div>
        ),
    }
);

// ============================================================================
// Types
// ============================================================================

type ConsoleOutput = {
    id: string;
    type: "log" | "error" | "result" | "image";
    content: string;
};

type CodeMetadata = {
    outputs: ConsoleOutput[];
    isRunning: boolean;
};

// ============================================================================
// Code Editor Content Component
// ============================================================================

function CodeEditorContent({
    content,
    status,
    onSaveContent,
    isCurrentVersion,
    currentVersionIndex,
    suggestions,
    metadata,
}: ArtifactContentProps<CodeMetadata>) {
    const handleChange = (value: string) => {
        if (isCurrentVersion) {
            onSaveContent(value, true);
        }
    };

    return (
        <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1">
                <CodeMirrorEditor
                    content={content}
                    currentVersionIndex={currentVersionIndex}
                    isCurrentVersion={isCurrentVersion}
                    onSaveContent={handleChange}
                    status={status}
                    suggestions={suggestions}
                />
            </div>
            {metadata?.outputs && metadata.outputs.length > 0 && (
                <div className="max-h-48 overflow-auto border-border border-t bg-muted/30 p-3 font-mono text-sm">
                    {metadata.outputs.map((output) => (
                        <div
                            className={
                                output.type === "error"
                                    ? "text-red-500"
                                    : "text-foreground"
                            }
                            key={output.id}
                        >
                            {output.type === "image" ? (
                                <Image
                                    alt="Output"
                                    className="max-w-full rounded"
                                    height={0}
                                    sizes="100vw"
                                    src={output.content}
                                    style={{ width: "auto", height: "auto" }}
                                    width={0}
                                />
                            ) : (
                                <pre className="whitespace-pre-wrap">
                                    {output.content}
                                </pre>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Icon Components
// ============================================================================

function PlayIcon() {
    return (
        <svg fill="currentColor" height="16" viewBox="0 0 16 16" width="16">
            <path d="M4 2.5v11l9-5.5-9-5.5z" />
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
// Artifact Definition
// ============================================================================

export const codeArtifact = new ArtifactDefinition<"code", CodeMetadata>({
    kind: "code",
    description: "Execute Python code with Pyodide runtime",
    content: CodeEditorContent,

    actions: [
        {
            icon: <PlayIcon />,
            label: "Run",
            description: "Execute Python code",
            onClick: ({ setMetadata }) => {
                setMetadata((m) => ({ ...m, isRunning: true }));
                // Pyodide execution would be handled by a separate service
                toast.info("Code execution requires Pyodide runtime");
                setMetadata((m) => ({ ...m, isRunning: false }));
            },
            isDisabled: ({ metadata }) => metadata?.isRunning ?? false,
        },
        {
            icon: <CopyIcon />,
            description: "Copy code to clipboard",
            onClick: async ({ content }) => {
                await navigator.clipboard.writeText(content);
                toast.success("Copied to clipboard");
            },
        },
    ],

    toolbar: [
        {
            icon: <span>💬</span>,
            description: "Request AI modifications",
            onClick: ({ sendMessage: _sendMessage }) => {
                // Trigger chat with code context
            },
        },
    ],

    initialize: ({ setMetadata }) => {
        setMetadata({ outputs: [], isRunning: false });
    },

    onStreamPart: ({ streamPart, setArtifact }) => {
        if (streamPart.type === "data-codeDelta") {
            setArtifact((draft) => ({
                ...draft,
                content: draft.content + (streamPart.data as string),
                status: "streaming",
            }));
        }
    },
});
