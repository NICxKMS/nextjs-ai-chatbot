"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

type ArtifactHeaderProps = {
    title: string;
    kind: string;
    isDirty?: boolean;
    isStreaming?: boolean;
    onClose: () => void;
    actions?: React.ReactNode;
};

// ============================================================================
// Icons (inline for bundle optimization)
// ============================================================================

function CloseIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            height="16"
            viewBox="0 0 16 16"
            width="16"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M4 4L12 12M12 4L4 12"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.5"
            />
        </svg>
    );
}

function getKindIcon(kind: string): string {
    switch (kind) {
        case "code":
            return "⌘";
        case "text":
            return "📄";
        case "image":
            return "🖼️";
        case "sheet":
            return "📊";
        default:
            return "📄";
    }
}

// ============================================================================
// Component
// ============================================================================

export const ArtifactHeader = memo(function ArtifactHeaderImpl({
    title,
    kind,
    isDirty = false,
    isStreaming = false,
    onClose,
    actions,
}: ArtifactHeaderProps) {
    return (
        <header className="flex items-center justify-between border-border border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex min-w-0 items-center gap-3">
                <span aria-hidden="true" className="text-lg">
                    {getKindIcon(kind)}
                </span>
                <h2 className="truncate font-medium text-sm">
                    {title || "Untitled"}
                    {isDirty && (
                        <span
                            className="ml-1 text-muted-foreground"
                            title="Unsaved changes"
                        >
                            <span className="sr-only">Unsaved changes</span>
                            <span aria-hidden="true">•</span>
                        </span>
                    )}
                </h2>
                {isStreaming && (
                    <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 font-medium text-blue-500 text-xs">
                        Streaming
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2">
                {actions}
                <button
                    aria-label="Close artifact panel"
                    className={cn(
                        "rounded-md p-1.5 transition-colors",
                        "text-muted-foreground hover:bg-muted hover:text-foreground",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                    onClick={onClose}
                    type="button"
                >
                    <CloseIcon className="size-4" />
                </button>
            </div>
        </header>
    );
});
