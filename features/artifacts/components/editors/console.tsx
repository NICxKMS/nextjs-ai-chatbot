"use client";

import {
    type Dispatch,
    type SetStateAction,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type ConsoleOutputContent = {
    type: "text" | "image";
    value: string;
};

export type ConsoleOutput = {
    id: string;
    status: "in_progress" | "loading_packages" | "completed" | "failed";
    contents: ConsoleOutputContent[];
};

export type ConsoleProps = {
    /** Array of console outputs to display */
    consoleOutputs: ConsoleOutput[];
    /** Setter for console outputs */
    setConsoleOutputs: Dispatch<SetStateAction<ConsoleOutput[]>>;
    /** Whether the artifact panel is visible */
    isArtifactVisible?: boolean;
};

// ============================================================================
// Icons
// ============================================================================

function TerminalWindowIcon({ size = 16 }: { size?: number }) {
    return (
        <svg
            height={size}
            strokeLinejoin="round"
            style={{ color: "currentcolor" }}
            viewBox="0 0 16 16"
            width={size}
        >
            <path
                clipRule="evenodd"
                d="M1.5 2.5H14.5V12.5C14.5 13.0523 14.0523 13.5 13.5 13.5H2.5C1.94772 13.5 1.5 13.0523 1.5 12.5V2.5ZM0 1H1.5H14.5H16V2.5V12.5C16 13.8807 14.8807 15 13.5 15H2.5C1.11929 15 0 13.8807 0 12.5V2.5V1ZM4 11.1339L4.44194 10.6919L6.51516 8.61872C6.85687 8.27701 6.85687 7.72299 6.51517 7.38128L4.44194 5.30806L4 4.86612L3.11612 5.75L3.55806 6.19194L5.36612 8L3.55806 9.80806L3.11612 10.25L4 11.1339ZM8 9.75494H8.6225H11.75H12.3725V10.9999H11.75H8.6225H8V9.75494Z"
                fill="currentColor"
                fillRule="evenodd"
            />
        </svg>
    );
}

function CrossSmallIcon({ size = 16 }: { size?: number }) {
    return (
        <svg
            height={size}
            strokeLinejoin="round"
            style={{ color: "currentcolor" }}
            viewBox="0 0 16 16"
            width={size}
        >
            <path
                clipRule="evenodd"
                d="M9.96966 11.0303L10.5 11.5607L11.5607 10.5L11.0303 9.96966L9.06065 7.99999L11.0303 6.03032L11.5607 5.49999L10.5 4.43933L9.96966 4.96966L7.99999 6.93933L6.03032 4.96966L5.49999 4.43933L4.43933 5.49999L4.96966 6.03032L6.93933 7.99999L4.96966 9.96966L4.43933 10.5L5.49999 11.5607L6.03032 11.0303L7.99999 9.06065L9.96966 11.0303Z"
                fill="currentColor"
                fillRule="evenodd"
            />
        </svg>
    );
}

function Loader({ size = 16 }: { size?: number }) {
    return (
        <div className="inline-flex animate-spin items-center justify-center">
            <svg
                height={size}
                strokeLinejoin="round"
                style={{ color: "currentcolor" }}
                viewBox="0 0 16 16"
                width={size}
            >
                <g clipPath="url(#clip0_2393_1490)">
                    <path d="M8 0V4" stroke="currentColor" strokeWidth="1.5" />
                    <path
                        d="M8 16V12"
                        opacity="0.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                    <path
                        d="M3.29773 1.52783L5.64887 4.7639"
                        opacity="0.9"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                    <path
                        d="M12.7023 1.52783L10.3511 4.7639"
                        opacity="0.1"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                    <path
                        d="M12.7023 14.472L10.3511 11.236"
                        opacity="0.4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                    <path
                        d="M3.29773 14.472L5.64887 11.236"
                        opacity="0.6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                    <path
                        d="M15.6085 5.52783L11.8043 6.7639"
                        opacity="0.2"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                    <path
                        d="M0.391602 10.472L4.19583 9.23598"
                        opacity="0.7"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                    <path
                        d="M15.6085 10.4722L11.8043 9.2361"
                        opacity="0.3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                    <path
                        d="M0.391602 5.52783L4.19583 6.7639"
                        opacity="0.8"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    />
                </g>
                <defs>
                    <clipPath id="clip0_2393_1490">
                        <rect fill="white" height="16" width="16" />
                    </clipPath>
                </defs>
            </svg>
        </div>
    );
}

// ============================================================================
// Component
// ============================================================================

export function Console({
    consoleOutputs,
    setConsoleOutputs,
    isArtifactVisible = true,
}: ConsoleProps) {
    const [height, setHeight] = useState<number>(300);
    const [isResizing, setIsResizing] = useState(false);
    const consoleEndRef = useRef<HTMLDivElement>(null);

    const minHeight = 100;
    const maxHeight = 800;

    const startResizing = useCallback(() => {
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback(
        (e: MouseEvent) => {
            if (isResizing) {
                const newHeight = window.innerHeight - e.clientY;
                if (newHeight >= minHeight && newHeight <= maxHeight) {
                    setHeight(newHeight);
                }
            }
        },
        [isResizing]
    );

    useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

    // Scroll to bottom when console outputs change
    useEffect(() => {
        consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        if (!isArtifactVisible) {
            setConsoleOutputs([]);
        }
    }, [isArtifactVisible, setConsoleOutputs]);

    if (consoleOutputs.length === 0) {
        return null;
    }

    return (
        <>
            <div
                aria-label="Resize console"
                aria-orientation="horizontal"
                aria-valuemax={Number(maxHeight)}
                aria-valuemin={Number(minHeight)}
                aria-valuenow={Number(height)}
                className="fixed z-50 h-2 w-full cursor-ns-resize"
                onKeyDown={(e) => {
                    if (e.key === "ArrowUp") {
                        setHeight((prev) => Math.min(prev + 10, maxHeight));
                    } else if (e.key === "ArrowDown") {
                        setHeight((prev) => Math.max(prev - 10, minHeight));
                    }
                }}
                onMouseDown={startResizing}
                role="slider"
                style={{ bottom: height - 4 }}
                tabIndex={0}
            />

            <div
                className={cn(
                    "fixed bottom-0 z-40 flex w-full flex-col overflow-x-hidden overflow-y-scroll border-zinc-200 border-t bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900",
                    {
                        "select-none": isResizing,
                    }
                )}
                style={{ height }}
            >
                <div className="sticky top-0 z-50 flex h-fit w-full flex-row items-center justify-between border-zinc-200 border-b bg-muted px-2 py-1 dark:border-zinc-700">
                    <div className="flex flex-row items-center gap-3 pl-2 text-sm text-zinc-800 dark:text-zinc-50">
                        <div className="text-muted-foreground">
                            <TerminalWindowIcon />
                        </div>
                        <div>Console</div>
                    </div>
                    <button
                        aria-label="Close console"
                        className="size-fit rounded p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        onClick={() => setConsoleOutputs([])}
                        type="button"
                    >
                        <CrossSmallIcon />
                    </button>
                </div>

                <div>
                    {consoleOutputs.map((consoleOutput, index) => (
                        <div
                            className="flex flex-row border-zinc-200 border-b bg-zinc-50 px-4 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
                            key={consoleOutput.id}
                        >
                            <div
                                className={cn("w-12 shrink-0", {
                                    "text-muted-foreground": [
                                        "in_progress",
                                        "loading_packages",
                                    ].includes(consoleOutput.status),
                                    "text-emerald-500":
                                        consoleOutput.status === "completed",
                                    "text-red-400":
                                        consoleOutput.status === "failed",
                                })}
                            >
                                [{index + 1}]
                            </div>
                            {["in_progress", "loading_packages"].includes(
                                consoleOutput.status
                            ) ? (
                                <div className="flex flex-row gap-2">
                                    <div className="mt-0.5 mb-auto size-fit self-center">
                                        <Loader size={16} />
                                    </div>
                                    <div className="text-muted-foreground">
                                        {consoleOutput.status === "in_progress"
                                            ? "Initializing..."
                                            : consoleOutput.status ===
                                                "loading_packages"
                                              ? consoleOutput.contents.map(
                                                    (content) =>
                                                        content.type === "text"
                                                            ? content.value
                                                            : null
                                                )
                                              : null}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex w-full flex-col gap-2 overflow-x-scroll text-zinc-900 dark:text-zinc-50">
                                    {consoleOutput.contents.map(
                                        (content, contentIndex) =>
                                            content.type === "image" ? (
                                                <picture
                                                    key={`${consoleOutput.id}-${contentIndex}`}
                                                >
                                                    <img
                                                        alt="Generated console output"
                                                        className="h-auto w-full max-w-(--breakpoint-toast-mobile) rounded-md object-contain"
                                                        height={300}
                                                        src={content.value}
                                                        style={{
                                                            aspectRatio: "4/3",
                                                        }}
                                                        width={400}
                                                    />
                                                </picture>
                                            ) : (
                                                <div
                                                    className="w-full whitespace-pre-line break-words"
                                                    key={`${consoleOutput.id}-${contentIndex}`}
                                                >
                                                    {content.value}
                                                </div>
                                            )
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    <div ref={consoleEndRef} />
                </div>
            </div>
        </>
    );
}
