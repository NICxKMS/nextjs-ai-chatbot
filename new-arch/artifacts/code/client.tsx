"use client";

/**
 * Code Artifact Client Component
 * @module new-arch/artifacts/code/client
 *
 * Client-side component for code editing and execution.
 */

import dynamic from "next/dynamic";
import { toast } from "sonner";

import type {
    ArtifactAction,
    ArtifactToolbarItem,
    ConsoleOutput,
    ConsoleOutputContent,
} from "../types";

// =============================================================================
// DYNAMIC IMPORTS
// =============================================================================

const CodeEditor = dynamic(
    () => import("@/components/code-editor").then((m) => m.CodeEditor),
    {
        ssr: false,
        loading: () => (
            <div className="px-3 py-2 text-muted-foreground text-xs">
                Loading editor…
            </div>
        ),
    }
);

// =============================================================================
// PYODIDE INTEGRATION
// =============================================================================

const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js";
let pyodideScriptPromise: Promise<void> | null = null;

type LoadPyodideFn = (options: { indexURL: string }) => Promise<any>;

function loadPyodideScript(): Promise<void> {
    if (pyodideScriptPromise) {
        return pyodideScriptPromise;
    }

    const win = window as unknown as { loadPyodide?: LoadPyodideFn };
    if (typeof win.loadPyodide === "function") {
        return Promise.resolve();
    }

    pyodideScriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = PYODIDE_URL;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Pyodide"));
        document.head.appendChild(script);
    });

    return pyodideScriptPromise;
}

// =============================================================================
// OUTPUT HANDLERS
// =============================================================================

const OUTPUT_HANDLERS = {
    matplotlib: `
import io
import base64
from matplotlib import pyplot as plt

plt.clf()
plt.close('all')
plt.switch_backend('agg')

def setup_matplotlib_output():
    def custom_show():
        if plt.gcf().get_size_inches().prod() * plt.gcf().dpi ** 2 > 25_000_000:
            print("Warning: Plot size too large, reducing quality")
            plt.gcf().set_dpi(100)

        png_buf = io.BytesIO()
        plt.savefig(png_buf, format='png')
        png_buf.seek(0)
        png_base64 = base64.b64encode(png_buf.read()).decode('utf-8')
        print(f'data:image/png;base64,{png_base64}')
        png_buf.close()

        plt.clf()
        plt.close('all')

    plt.show = custom_show
`,
    basic: `
# Basic output capture setup
`,
};

function detectRequiredHandlers(code: string): string[] {
    const handlers: string[] = ["basic"];

    if (code.includes("matplotlib") || code.includes("plt.")) {
        handlers.push("matplotlib");
    }

    return handlers;
}

// =============================================================================
// METADATA TYPE
// =============================================================================

export type CodeArtifactMetadata = {
    outputs: ConsoleOutput[];
};

// =============================================================================
// CODE EXECUTION
// =============================================================================

function generateUUID(): string {
    return crypto.randomUUID();
}

async function executeCode(
    content: string,
    runId: string,
    setMetadata: (
        updater:
            | CodeArtifactMetadata
            | ((prev: CodeArtifactMetadata) => CodeArtifactMetadata)
    ) => void
): Promise<void> {
    const outputContent: ConsoleOutputContent[] = [];

    setMetadata((metadata) => ({
        ...metadata,
        outputs: [
            ...metadata.outputs,
            {
                id: runId,
                contents: [],
                status: "in_progress",
            },
        ],
    }));

    try {
        await loadPyodideScript();

        const win = window as unknown as { loadPyodide: LoadPyodideFn };
        const pyodide = await win.loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/",
        });

        pyodide.setStdout({
            batched: (output: string) => {
                outputContent.push({
                    type: output.startsWith("data:image/png;base64")
                        ? "image"
                        : "text",
                    value: output,
                });
            },
        });

        await pyodide.loadPackagesFromImports(content, {
            messageCallback: (message: string) => {
                setMetadata((metadata) => ({
                    ...metadata,
                    outputs: [
                        ...metadata.outputs.filter((o) => o.id !== runId),
                        {
                            id: runId,
                            contents: [{ type: "text", value: message }],
                            status: "loading_packages",
                        },
                    ],
                }));
            },
        });

        const requiredHandlers = detectRequiredHandlers(content);
        for (const handler of requiredHandlers) {
            if (OUTPUT_HANDLERS[handler as keyof typeof OUTPUT_HANDLERS]) {
                await pyodide.runPythonAsync(
                    OUTPUT_HANDLERS[handler as keyof typeof OUTPUT_HANDLERS]
                );

                if (handler === "matplotlib") {
                    await pyodide.runPythonAsync("setup_matplotlib_output()");
                }
            }
        }

        await pyodide.runPythonAsync(content);

        setMetadata((metadata) => ({
            ...metadata,
            outputs: [
                ...metadata.outputs.filter((o) => o.id !== runId),
                {
                    id: runId,
                    contents: outputContent,
                    status: "completed",
                },
            ],
        }));
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        setMetadata((metadata) => ({
            ...metadata,
            outputs: [
                ...metadata.outputs.filter((o) => o.id !== runId),
                {
                    id: runId,
                    contents: [{ type: "error", value: errorMessage }],
                    status: "failed",
                },
            ],
        }));
    }
}

// =============================================================================
// ARTIFACT CONFIGURATION
// =============================================================================

export const codeArtifactConfig = {
    kind: "code" as const,
    description: "Executable Python code with console output",

    initialize: (setMetadata: (metadata: CodeArtifactMetadata) => void) => {
        setMetadata({ outputs: [] });
    },

    onStreamPart: (
        streamPart: { type: string; data: string },
        setArtifact: (updater: (draft: any) => any) => void
    ) => {
        if (streamPart.type === "data-codeDelta") {
            setArtifact((draft) => ({
                ...draft,
                content: streamPart.data,
                isVisible:
                    draft.status === "streaming" &&
                    draft.content.length > 300 &&
                    draft.content.length < 310
                        ? true
                        : draft.isVisible,
                status: "streaming",
            }));
        }
    },
};

// =============================================================================
// ACTIONS
// =============================================================================

export const codeActions: ArtifactAction<CodeArtifactMetadata>[] = [
    {
        icon: null, // PlayIcon
        label: "Run",
        description: "Execute code",
        onClick: async ({ content, setMetadata }) => {
            const runId = generateUUID();
            await executeCode(content, runId, setMetadata);
        },
    },
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
        description: "Copy code to clipboard",
        onClick: ({ content }) => {
            navigator.clipboard.writeText(content);
            toast.success("Copied to clipboard!");
        },
    },
];

// =============================================================================
// TOOLBAR
// =============================================================================

export const codeToolbar: ArtifactToolbarItem<CodeArtifactMetadata>[] = [
    {
        icon: null, // MessageIcon
        description: "Add comments",
        onClick: ({ sendMessage }) => {
            sendMessage({
                role: "user",
                parts: [
                    {
                        type: "text",
                        text: "Add comments to the code snippet for understanding",
                    },
                ],
            });
        },
    },
    {
        icon: null, // LogsIcon
        description: "Add logs",
        onClick: ({ sendMessage }) => {
            sendMessage({
                role: "user",
                parts: [
                    {
                        type: "text",
                        text: "Add logs to the code snippet for debugging",
                    },
                ],
            });
        },
    },
];

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export type CodeEditorProps = {
    content: string;
    status: string;
    isCurrentVersion: boolean;
    currentVersionIndex: number;
    onSaveContent: (content: string) => void;
    metadata?: CodeArtifactMetadata;
    setMetadata?: (
        updater:
            | CodeArtifactMetadata
            | ((prev: CodeArtifactMetadata) => CodeArtifactMetadata)
    ) => void;
};

/**
 * Code artifact content renderer
 */
export function CodeArtifactContent({
    content,
    status,
    isCurrentVersion,
    currentVersionIndex,
    onSaveContent,
    metadata,
    _setMetadata,
}: CodeEditorProps) {
    return (
        <>
            <div className="px-1">
                <CodeEditor
                    content={content}
                    currentVersionIndex={currentVersionIndex}
                    isCurrentVersion={isCurrentVersion}
                    saveContent={onSaveContent}
                    status={status}
                />
            </div>

            {metadata?.outputs && metadata.outputs.length > 0 && (
                <div className="border-t">
                    {/* Console component would be rendered here */}
                    <div className="p-2 text-muted-foreground text-xs">
                        {metadata.outputs.length} output(s)
                    </div>
                </div>
            )}
        </>
    );
}
