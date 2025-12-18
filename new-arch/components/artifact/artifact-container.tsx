"use client";

import { AnimatePresence, motion } from "framer-motion";
import { memo, useCallback, useEffect, useState } from "react";
import type { Suggestion } from "@/lib/data/schema";
import { cn } from "@/lib/utils";
import { ArtifactContent } from "./artifact-content";
import { ArtifactHeader } from "./artifact-header";
import { useArtifactContext } from "./context";

// ============================================================================
// Animation Variants
// ============================================================================

const containerVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.2, ease: "easeOut" },
    },
    exit: {
        opacity: 0,
        x: 20,
        transition: { duration: 0.15, ease: "easeIn" },
    },
};

// ============================================================================
// Types
// ============================================================================

type Document = {
    id: string;
    content: string;
    createdAt: Date;
};

type ArtifactContainerProps = {
    documents?: Document[];
    suggestions?: Suggestion[];
    onSaveContent?: (content: string, debounce: boolean) => void;
    isLoading?: boolean;
    className?: string;
};

// ============================================================================
// Component
// ============================================================================

export const ArtifactContainer = memo(function ArtifactContainerImpl({
    documents = [],
    suggestions = [],
    onSaveContent,
    isLoading = false,
    className,
}: ArtifactContainerProps) {
    const { artifact, metadata, setMetadata, closeArtifact } =
        useArtifactContext();
    const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);
    const [mode, setMode] = useState<"edit" | "diff">("edit");

    // Sync version index with documents
    useEffect(() => {
        if (documents.length > 0) {
            setCurrentVersionIndex(documents.length - 1);
        }
    }, [documents.length]);

    const isCurrentVersion =
        documents.length === 0 || currentVersionIndex === documents.length - 1;

    const handleVersionChange = useCallback(
        (type: "next" | "prev" | "toggle" | "latest") => {
            if (type === "toggle") {
                setMode((m) => (m === "edit" ? "diff" : "edit"));
                return;
            }

            if (type === "latest") {
                setCurrentVersionIndex(documents.length - 1);
                setMode("edit");
                return;
            }

            setCurrentVersionIndex((idx) => {
                if (type === "prev") {
                    return Math.max(0, idx - 1);
                }
                return Math.min(documents.length - 1, idx + 1);
            });
        },
        [documents.length]
    );

    const getDocumentContentById = useCallback(
        (index: number): string => {
            return documents[index]?.content ?? "";
        },
        [documents]
    );

    const handleSave = useCallback(
        (newContent: string, debounce: boolean) => {
            onSaveContent?.(newContent, debounce);
        },
        [onSaveContent]
    );

    const content = isCurrentVersion
        ? artifact.content
        : (documents[currentVersionIndex]?.content ?? "");

    return (
        <AnimatePresence mode="wait">
            {artifact.isVisible && (
                <motion.aside
                    animate="visible"
                    aria-label="Artifact panel"
                    className={cn(
                        "fixed top-0 right-0 bottom-0 z-50",
                        "w-full max-w-2xl",
                        "flex flex-col",
                        "border-border border-l bg-background shadow-xl",
                        className
                    )}
                    exit="exit"
                    initial="hidden"
                    key="artifact-container"
                    variants={containerVariants}
                >
                    <ArtifactHeader
                        isDirty={false}
                        isStreaming={artifact.status === "streaming"}
                        kind={artifact.kind}
                        onClose={closeArtifact}
                        title={artifact.title}
                    />

                    <ArtifactContent
                        content={content}
                        currentVersionIndex={currentVersionIndex}
                        getDocumentContentById={getDocumentContentById}
                        isCurrentVersion={isCurrentVersion}
                        isInline={false}
                        isLoading={isLoading}
                        kind={artifact.kind}
                        metadata={metadata}
                        mode={mode}
                        onSaveContent={handleSave}
                        setMetadata={setMetadata}
                        status={artifact.status}
                        suggestions={suggestions}
                        title={artifact.title}
                    />

                    {!isCurrentVersion && (
                        <footer className="border-border border-t bg-muted/50 px-4 py-2 text-muted-foreground text-sm">
                            Viewing version {currentVersionIndex + 1} of{" "}
                            {documents.length}
                            <button
                                className="ml-2 text-primary hover:underline"
                                onClick={() => handleVersionChange("latest")}
                                type="button"
                            >
                                Go to latest
                            </button>
                        </footer>
                    )}
                </motion.aside>
            )}
        </AnimatePresence>
    );
});
