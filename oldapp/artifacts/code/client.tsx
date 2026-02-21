import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
    Console,
    type ConsoleOutput,
    type ConsoleOutputContent,
} from "@/components/console";
import { Artifact } from "@/components/create-artifact";
import {
    CopyIcon,
    LogsIcon,
    MessageIcon,
    PlayIcon,
    RedoIcon,
    UndoIcon,
} from "@/components/icons";
import { generateUUID } from "@/lib/utils";

// Pyodide script loading - only loads when Python code is executed
const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js";
let pyodideScriptPromise: Promise<void> | null = null;

// Type for Pyodide loader function
type LoadPyodideFn = (options: { indexURL: string }) => Promise<any>;

function loadPyodideScript(): Promise<void> {
    // Return existing promise if already loading/loaded
    if (pyodideScriptPromise) {
        return pyodideScriptPromise;
    }

    // Check if already loaded
    const win = window as unknown as { loadPyodide?: LoadPyodideFn };
    if (typeof win.loadPyodide === "function") {
        return Promise.resolve();
    }

    // Create and load script
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

const OUTPUT_HANDLERS = {
    matplotlib: `
    import io
    import base64
    from matplotlib import pyplot as plt

    # Clear any existing plots
    plt.clf()
    plt.close('all')

    # Switch to agg backend
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

type Metadata = {
    outputs: ConsoleOutput[];
};

export const codeArtifact = new Artifact<"code", Metadata>({
    kind: "code",
    description:
        "Useful for code generation; Code execution is only available for python code.",
    initialize: ({ setMetadata }) => {
        setMetadata({
            outputs: [],
        });
    },
    onStreamPart: ({ streamPart, setArtifact }) => {
        if (streamPart.type === "data-codeDelta") {
            setArtifact((draftArtifact) => ({
                ...draftArtifact,
                content: streamPart.data,
                isVisible:
                    draftArtifact.status === "streaming" &&
                    draftArtifact.content.length > 300 &&
                    draftArtifact.content.length < 310
                        ? true
                        : draftArtifact.isVisible,
                status: "streaming",
            }));
        }
    },
    content: ({ metadata, setMetadata, ...props }) => {
        return (
            <>
                <div className="px-1">
                    <CodeEditor {...props} />
                </div>

                {metadata?.outputs && (
                    <Console
                        consoleOutputs={metadata.outputs}
                        setConsoleOutputs={() => {
                            setMetadata({
                                ...metadata,
                                outputs: [],
                            });
                        }}
                    />
                )}
            </>
        );
    },
    actions: [
        {
            icon: <PlayIcon size={18} />,
            label: "Run",
            description: "Execute code",
            onClick: async ({ content, setMetadata }) => {
                const runId = generateUUID();
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
                    // Load Pyodide script on-demand (only when Python code is executed)
                    await loadPyodideScript();

                    // Use window.loadPyodide which is loaded dynamically
                    const win = window as unknown as {
                        loadPyodide: LoadPyodideFn;
                    };
                    const currentPyodideInstance = await win.loadPyodide({
                        indexURL:
                            "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/",
                    });

                    currentPyodideInstance.setStdout({
                        batched: (output: string) => {
                            outputContent.push({
                                type: output.startsWith("data:image/png;base64")
                                    ? "image"
                                    : "text",
                                value: output,
                            });
                        },
                    });

                    await currentPyodideInstance.loadPackagesFromImports(
                        content,
                        {
                            messageCallback: (message: string) => {
                                setMetadata((metadata) => ({
                                    ...metadata,
                                    outputs: [
                                        ...metadata.outputs.filter(
                                            (output) => output.id !== runId
                                        ),
                                        {
                                            id: runId,
                                            contents: [
                                                {
                                                    type: "text",
                                                    value: message,
                                                },
                                            ],
                                            status: "loading_packages",
                                        },
                                    ],
                                }));
                            },
                        }
                    );

                    const requiredHandlers = detectRequiredHandlers(content);
                    for (const handler of requiredHandlers) {
                        if (
                            OUTPUT_HANDLERS[
                                handler as keyof typeof OUTPUT_HANDLERS
                            ]
                        ) {
                            await currentPyodideInstance.runPythonAsync(
                                OUTPUT_HANDLERS[
                                    handler as keyof typeof OUTPUT_HANDLERS
                                ]
                            );

                            if (handler === "matplotlib") {
                                await currentPyodideInstance.runPythonAsync(
                                    "setup_matplotlib_output()"
                                );
                            }
                        }
                    }

                    await currentPyodideInstance.runPythonAsync(content);

                    setMetadata((metadata) => ({
                        ...metadata,
                        outputs: [
                            ...metadata.outputs.filter(
                                (output) => output.id !== runId
                            ),
                            {
                                id: runId,
                                contents: outputContent,
                                status: "completed",
                            },
                        ],
                    }));
                } catch (error: any) {
                    setMetadata((metadata) => ({
                        ...metadata,
                        outputs: [
                            ...metadata.outputs.filter(
                                (output) => output.id !== runId
                            ),
                            {
                                id: runId,
                                contents: [
                                    { type: "text", value: error.message },
                                ],
                                status: "failed",
                            },
                        ],
                    }));
                }
            },
        },
        {
            icon: <UndoIcon size={18} />,
            description: "View Previous version",
            onClick: ({ handleVersionChange }) => {
                handleVersionChange("prev");
            },
            isDisabled: ({ currentVersionIndex }) => {
                if (currentVersionIndex === 0) {
                    return true;
                }

                return false;
            },
        },
        {
            icon: <RedoIcon size={18} />,
            description: "View Next version",
            onClick: ({ handleVersionChange }) => {
                handleVersionChange("next");
            },
            isDisabled: ({ isCurrentVersion }) => {
                if (isCurrentVersion) {
                    return true;
                }

                return false;
            },
        },
        {
            icon: <CopyIcon size={18} />,
            description: "Copy code to clipboard",
            onClick: ({ content }) => {
                navigator.clipboard.writeText(content);
                toast.success("Copied to clipboard!");
            },
        },
    ],
    toolbar: [
        {
            icon: <MessageIcon />,
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
            icon: <LogsIcon />,
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
    ],
});
