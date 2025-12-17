import type { UseChatHelpers } from "@ai-sdk/react";
import { formatDistance } from "date-fns";
import equal from "fast-deep-equal";
import {
    type Dispatch,
    memo,
    type SetStateAction,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import useSWR, { useSWRConfig } from "swr";
import { useDebounceCallback } from "usehooks-ts";
import {
    AnimatePresence,
    motion,
} from "@/components/providers/motion-provider";
import { useArtifact } from "@/hooks/use-artifact";
import { useWindowSize } from "@/hooks/use-window-size";
import type { ModelMetadata } from "@/lib/ai/model-catalog-types";
import type { Document } from "@/lib/db/schema";
import type { Attachment, ChatMessage, UserVote } from "@/lib/types";
import { fetcher } from "@/lib/utils";
import { ArtifactActions } from "./artifact-actions";
import { ArtifactCloseButton } from "./artifact-close-button";
import { ArtifactErrorBoundary } from "./artifact-error-boundary";
import { ArtifactMessages } from "./artifact-messages";
import type { Artifact as ArtifactDefinition } from "./create-artifact";
import { MultimodalInput } from "./multimodal-input";
import { Toolbar } from "./toolbar";
import { useSidebar } from "./ui/sidebar";
import { VersionFooter } from "./version-footer";
import type { VisibilityType } from "./visibility-selector";

// Re-export type from shared location for backwards compatibility
export type { ArtifactKind } from "@/lib/artifacts/types";
import type { ArtifactKind } from "@/lib/artifacts/types";

// Lazy-loaded artifact definitions cache
let artifactDefinitionsCache: ArtifactDefinition<ArtifactKind>[] | null = null;
let loadingPromise: Promise<ArtifactDefinition<ArtifactKind>[]> | null = null;

/**
 * Lazily load artifact definitions. Returns cached value if already loaded.
 */
export async function loadArtifactDefinitions(): Promise<
    ArtifactDefinition<ArtifactKind>[]
> {
    if (artifactDefinitionsCache) {
        return artifactDefinitionsCache;
    }

    if (loadingPromise) {
        return loadingPromise;
    }

    loadingPromise = Promise.all([
        import("@/artifacts/text/client"),
        import("@/artifacts/code/client"),
        import("@/artifacts/image/client"),
        import("@/artifacts/sheet/client"),
    ]).then(([text, code, image, sheet]) => {
        artifactDefinitionsCache = [
            text.textArtifact,
            code.codeArtifact,
            image.imageArtifact,
            sheet.sheetArtifact,
        ];
        return artifactDefinitionsCache;
    });

    return loadingPromise;
}

/**
 * Get cached artifact definitions synchronously. Returns empty array if not loaded yet.
 * Use loadArtifactDefinitions() to ensure definitions are loaded first.
 */
export function getArtifactDefinitions(): ArtifactDefinition<ArtifactKind>[] {
    return artifactDefinitionsCache ?? [];
}

/**
 * Hook to use lazy-loaded artifact definitions (loads ALL definitions)
 */
export function useArtifactDefinitions(): {
    definitions: ArtifactDefinition<ArtifactKind>[];
    isLoading: boolean;
} {
    const [definitions, setDefinitions] = useState<
        ArtifactDefinition<ArtifactKind>[]
    >(() => artifactDefinitionsCache ?? []);
    const [isLoading, setIsLoading] = useState(!artifactDefinitionsCache);

    useEffect(() => {
        if (artifactDefinitionsCache) {
            setDefinitions(artifactDefinitionsCache);
            setIsLoading(false);
            return;
        }

        loadArtifactDefinitions().then((loaded) => {
            setDefinitions(loaded);
            setIsLoading(false);
        });
    }, []);

    return { definitions, isLoading };
}

// ============================================================================
// Per-Kind Loading (Preferred for individual artifact rendering)
// ============================================================================

// Cache per-kind definitions
const artifactDefinitionsByKind = new Map<
    ArtifactKind,
    ArtifactDefinition<ArtifactKind>
>();
const loadingPromisesByKind = new Map<
    ArtifactKind,
    Promise<ArtifactDefinition<ArtifactKind>>
>();

/**
 * Load a single artifact definition by kind (lazy, cached)
 */
export async function loadArtifactByKind(
    kind: ArtifactKind
): Promise<ArtifactDefinition<ArtifactKind>> {
    const cached = artifactDefinitionsByKind.get(kind);
    if (cached) {
        return cached;
    }

    const loading = loadingPromisesByKind.get(kind);
    if (loading) {
        return loading;
    }

    const promise = (async () => {
        switch (kind) {
            case "code": {
                const mod = await import("@/artifacts/code/client");
                return mod.codeArtifact;
            }
            case "text": {
                const mod = await import("@/artifacts/text/client");
                return mod.textArtifact;
            }
            case "image": {
                const mod = await import("@/artifacts/image/client");
                return mod.imageArtifact;
            }
            case "sheet": {
                const mod = await import("@/artifacts/sheet/client");
                return mod.sheetArtifact;
            }
            default:
                throw new Error(`Unknown artifact kind: ${kind}`);
        }
    })().then((definition) => {
        artifactDefinitionsByKind.set(kind, definition);
        loadingPromisesByKind.delete(kind);
        return definition;
    });

    loadingPromisesByKind.set(kind, promise);
    return promise;
}

/**
 * Sync getter for cached definition by kind
 */
export function getArtifactByKind(
    kind: ArtifactKind
): ArtifactDefinition<ArtifactKind> | undefined {
    return artifactDefinitionsByKind.get(kind);
}

/**
 * Hook for loading a single artifact definition by kind (preferred for rendering)
 */
export function useArtifactDefinition(kind: ArtifactKind): {
    definition: ArtifactDefinition<ArtifactKind> | null;
    isLoading: boolean;
} {
    const [definition, setDefinition] =
        useState<ArtifactDefinition<ArtifactKind> | null>(
            () => getArtifactByKind(kind) ?? null
        );
    const [isLoading, setIsLoading] = useState(() => !getArtifactByKind(kind));

    useEffect(() => {
        let cancelled = false;

        const cached = getArtifactByKind(kind);
        if (cached) {
            setDefinition(cached);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        loadArtifactByKind(kind).then((loaded) => {
            if (!cancelled) {
                setDefinition(loaded);
                setIsLoading(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [kind]);

    return { definition, isLoading };
}

export type UIArtifact = {
    title: string;
    documentId: string;
    kind: ArtifactKind;
    content: string;
    isVisible: boolean;
    status: "streaming" | "idle";
    boundingBox: {
        top: number;
        left: number;
        width: number;
        height: number;
    };
};

function PureArtifact({
    chatId,
    input,
    setInput,
    status,
    stop,
    attachments,
    setAttachments,
    sendMessage,
    messages,
    setMessages,
    regenerate,
    votes,
    isReadonly,
    selectedVisibilityType,
    selectedModelId,
    availableModels,
}: {
    chatId: string;
    input: string;
    setInput: Dispatch<SetStateAction<string>>;
    status: UseChatHelpers<ChatMessage>["status"];
    stop: UseChatHelpers<ChatMessage>["stop"];
    attachments: Attachment[];
    setAttachments: Dispatch<SetStateAction<Attachment[]>>;
    messages: ChatMessage[];
    setMessages: UseChatHelpers<ChatMessage>["setMessages"];
    votes: UserVote[] | undefined;
    sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
    regenerate: UseChatHelpers<ChatMessage>["regenerate"];
    isReadonly: boolean;
    selectedVisibilityType: VisibilityType;
    selectedModelId: string;
    availableModels: ModelMetadata[];
}) {
    const { artifact, setArtifact, metadata, setMetadata } = useArtifact();

    const { data: documents, isLoading: isDocumentsFetching } = useSWR<
        Document[]
    >(
        artifact.documentId !== "init" && artifact.status !== "streaming"
            ? `/api/document?id=${artifact.documentId}`
            : null,
        fetcher
    );

    const [mode, setMode] = useState<"edit" | "diff">("edit");
    const [document, setDocument] = useState<Document | null>(null);
    const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);

    const { open: isSidebarOpen } = useSidebar();

    // Automatically switch to edit mode when streaming starts
    useEffect(() => {
        if (artifact.status === "streaming") {
            setMode("edit");
        }
    }, [artifact.status]);

    useEffect(() => {
        if (documents && documents.length > 0) {
            const mostRecentDocument = documents.at(-1);

            if (mostRecentDocument) {
                setDocument(mostRecentDocument);
                setCurrentVersionIndex(documents.length - 1);
                setArtifact((currentArtifact) => ({
                    ...currentArtifact,
                    content: mostRecentDocument.content ?? "",
                }));
            }
        }
    }, [documents, setArtifact]);

    // Note: mutateDocuments is not called in a useEffect since SWR auto-revalidation
    // handles document updates. The SWR key already depends on artifact.documentId.

    const { mutate } = useSWRConfig();
    const [isContentDirty, setIsContentDirty] = useState(false);
    // Track pending save request for deduplication
    const pendingSaveRef = useRef<AbortController | null>(null);

    const handleContentChange = useCallback(
        (updatedContent: string) => {
            if (!artifact) {
                return;
            }

            // Cancel any pending save to prevent race conditions
            if (pendingSaveRef.current) {
                pendingSaveRef.current.abort();
            }
            const abortController = new AbortController();
            pendingSaveRef.current = abortController;

            mutate<Document[]>(
                `/api/document?id=${artifact.documentId}`,
                async (currentDocuments) => {
                    if (!currentDocuments) {
                        return [];
                    }

                    const currentDocument = currentDocuments.at(-1);

                    if (!currentDocument || !currentDocument.content) {
                        setIsContentDirty(false);
                        return currentDocuments;
                    }

                    if (currentDocument.content !== updatedContent) {
                        try {
                            const response = await fetch(
                                `/api/document?id=${artifact.documentId}`,
                                {
                                    method: "POST",
                                    body: JSON.stringify({
                                        title: artifact.title,
                                        content: updatedContent,
                                        kind: artifact.kind,
                                    }),
                                    signal: abortController.signal,
                                }
                            );

                            setIsContentDirty(false);
                            pendingSaveRef.current = null;

                            // If save failed, don't update cache with optimistic data
                            if (!response.ok) {
                                return currentDocuments;
                            }
                        } catch (error) {
                            // If request was aborted, return current data without updating
                            if (
                                error instanceof Error &&
                                error.name === "AbortError"
                            ) {
                                return currentDocuments;
                            }
                            setIsContentDirty(false);
                            pendingSaveRef.current = null;
                            return currentDocuments;
                        }

                        const newDocument = {
                            ...currentDocument,
                            content: updatedContent,
                            createdAt: new Date(),
                        };

                        return [...currentDocuments, newDocument];
                    }
                    return currentDocuments;
                },
                { revalidate: false }
            );
        },
        [artifact, mutate]
    );

    const debouncedHandleContentChange = useDebounceCallback(
        handleContentChange,
        2000
    );

    const saveContent = useCallback(
        (updatedContent: string, debounce: boolean) => {
            // Skip save if document not loaded yet - content will be set from server when loaded
            if (!document) {
                return;
            }

            if (updatedContent !== document.content) {
                setIsContentDirty(true);

                if (debounce) {
                    debouncedHandleContentChange(updatedContent);
                } else {
                    handleContentChange(updatedContent);
                }
            }
        },
        [document, debouncedHandleContentChange, handleContentChange]
    );

    function getDocumentContentById(index: number) {
        if (!documents) {
            return "";
        }
        if (!documents[index]) {
            return "";
        }
        return documents[index].content ?? "";
    }

    const handleVersionChange = (
        type: "next" | "prev" | "toggle" | "latest"
    ) => {
        if (!documents) {
            return;
        }

        if (type === "latest") {
            setCurrentVersionIndex(documents.length - 1);
            setMode("edit");
        }

        if (type === "toggle") {
            setMode((currentMode) =>
                currentMode === "edit" ? "diff" : "edit"
            );
        }

        if (type === "prev") {
            if (currentVersionIndex > 0) {
                setCurrentVersionIndex((index) => index - 1);
            }
        } else if (
            type === "next" &&
            currentVersionIndex < documents.length - 1
        ) {
            setCurrentVersionIndex((index) => index + 1);
        }
    };

    const [isToolbarVisible, setIsToolbarVisible] = useState(false);

    /*
     * NOTE: if there are no documents, or if
     * the documents are being fetched, then
     * we mark it as the current version.
     */

    const isCurrentVersion =
        documents && documents.length > 0
            ? currentVersionIndex === documents.length - 1
            : true;

    const {
        width: windowWidth,
        height: windowHeight,
        isMobile,
    } = useWindowSize();

    // Use per-kind lazy-loaded artifact definition (loads ONLY the needed artifact)
    const { definition: artifactDefinition, isLoading: isDefinitionsLoading } =
        useArtifactDefinition(artifact.kind);

    useEffect(() => {
        if (artifact.documentId !== "init" && artifactDefinition?.initialize) {
            artifactDefinition.initialize({
                documentId: artifact.documentId,
                setMetadata,
            });
        }
    }, [artifact.documentId, artifactDefinition, setMetadata]);

    return (
        <AnimatePresence initial={false}>
            {artifact.isVisible && (
                <motion.div
                    animate={{ opacity: 1 }}
                    className="fixed top-0 left-0 z-50 flex h-dvh w-dvw flex-row bg-transparent"
                    data-testid="artifact"
                    exit={{ opacity: 0, transition: { delay: 0.4 } }}
                    initial={{ opacity: 1 }}
                >
                    {!isMobile && (
                        <motion.div
                            animate={{ width: windowWidth, right: 0 }}
                            className="fixed h-dvh bg-background"
                            exit={{
                                width: isSidebarOpen
                                    ? windowWidth - 256
                                    : windowWidth,
                                right: 0,
                            }}
                            initial={{
                                width: isSidebarOpen
                                    ? windowWidth - 256
                                    : windowWidth,
                                right: 0,
                            }}
                        />
                    )}

                    {!isMobile && (
                        <motion.div
                            animate={{
                                opacity: 1,
                                x: 0,
                                scale: 1,
                                transition: {
                                    delay: 0.1,
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 30,
                                },
                            }}
                            className="relative h-dvh w-[400px] shrink-0 bg-muted dark:bg-background"
                            exit={{
                                opacity: 0,
                                x: 0,
                                scale: 1,
                                transition: { duration: 0 },
                            }}
                            initial={{ opacity: 0, x: 10, scale: 1 }}
                        >
                            <AnimatePresence>
                                {!isCurrentVersion && (
                                    <motion.div
                                        animate={{ opacity: 1 }}
                                        className="absolute top-0 left-0 z-50 h-dvh w-[400px] bg-zinc-900/50"
                                        exit={{ opacity: 0 }}
                                        initial={{ opacity: 0 }}
                                    />
                                )}
                            </AnimatePresence>

                            <div className="flex h-full flex-col items-center justify-between">
                                <ArtifactMessages
                                    artifactStatus={artifact.status}
                                    availableModels={availableModels}
                                    chatId={chatId}
                                    isReadonly={isReadonly}
                                    messages={messages}
                                    regenerate={regenerate}
                                    setMessages={setMessages}
                                    status={status}
                                    votes={votes}
                                />

                                <div className="relative flex w-full flex-row items-end gap-2 px-4 pb-4">
                                    <MultimodalInput
                                        attachments={attachments}
                                        availableModels={availableModels}
                                        chatId={chatId}
                                        className="bg-background dark:bg-muted"
                                        input={input}
                                        messages={messages}
                                        selectedModelId={selectedModelId}
                                        selectedVisibilityType={
                                            selectedVisibilityType
                                        }
                                        sendMessage={sendMessage}
                                        setAttachments={setAttachments}
                                        setInput={setInput}
                                        setMessages={setMessages}
                                        status={status}
                                        stop={stop}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <motion.div
                        animate={
                            isMobile
                                ? {
                                      opacity: 1,
                                      x: 0,
                                      y: 0,
                                      height: windowHeight,
                                      width: windowWidth
                                          ? windowWidth
                                          : "calc(100dvw)",
                                      borderRadius: 0,
                                      transition: {
                                          delay: 0,
                                          type: "spring",
                                          stiffness: 300,
                                          damping: 30,
                                          duration: 0.8,
                                      },
                                  }
                                : {
                                      opacity: 1,
                                      x: 400,
                                      y: 0,
                                      height: windowHeight,
                                      width: windowWidth
                                          ? windowWidth - 400
                                          : "calc(100dvw-400px)",
                                      borderRadius: 0,
                                      transition: {
                                          delay: 0,
                                          type: "spring",
                                          stiffness: 300,
                                          damping: 30,
                                          duration: 0.8,
                                      },
                                  }
                        }
                        className="fixed flex h-dvh flex-col overflow-y-scroll border-zinc-200 bg-background md:border-l dark:border-zinc-700 dark:bg-muted"
                        exit={{
                            opacity: 0,
                            scale: 0.5,
                            transition: {
                                delay: 0.1,
                                type: "spring",
                                stiffness: 600,
                                damping: 30,
                            },
                        }}
                        initial={
                            isMobile
                                ? {
                                      opacity: 1,
                                      x: artifact.boundingBox.left,
                                      y: artifact.boundingBox.top,
                                      height: artifact.boundingBox.height,
                                      width: artifact.boundingBox.width,
                                      borderRadius: 50,
                                  }
                                : {
                                      opacity: 1,
                                      x: artifact.boundingBox.left,
                                      y: artifact.boundingBox.top,
                                      height: artifact.boundingBox.height,
                                      width: artifact.boundingBox.width,
                                      borderRadius: 50,
                                  }
                        }
                    >
                        <div className="flex flex-row items-start justify-between p-2">
                            <div className="flex flex-row items-start gap-4">
                                <ArtifactCloseButton />

                                <div className="flex flex-col">
                                    <div className="font-medium">
                                        {artifact.title}
                                    </div>

                                    {isContentDirty ? (
                                        <div className="text-muted-foreground text-sm">
                                            Saving changes...
                                        </div>
                                    ) : document ? (
                                        <div className="text-muted-foreground text-sm">
                                            {`Updated ${formatDistance(
                                                new Date(document.createdAt),
                                                new Date(),
                                                {
                                                    addSuffix: true,
                                                }
                                            )}`}
                                        </div>
                                    ) : (
                                        <div className="mt-2 h-3 w-32 animate-pulse rounded-md bg-muted-foreground/20" />
                                    )}
                                </div>
                            </div>

                            <ArtifactActions
                                artifact={artifact}
                                currentVersionIndex={currentVersionIndex}
                                handleVersionChange={handleVersionChange}
                                isCurrentVersion={isCurrentVersion}
                                metadata={metadata}
                                mode={mode}
                                setMetadata={setMetadata}
                            />
                        </div>

                        <div className="h-full max-w-full! items-center overflow-y-scroll bg-background dark:bg-muted">
                            {/* Task 9.12: Wrap artifact rendering in error boundary with fallback UI */}
                            <ArtifactErrorBoundary>
                                {isDefinitionsLoading || !artifactDefinition ? (
                                    <div className="flex h-full items-center justify-center">
                                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground/20 border-t-muted-foreground" />
                                    </div>
                                ) : (
                                    <artifactDefinition.content
                                        content={
                                            isCurrentVersion
                                                ? artifact.content
                                                : getDocumentContentById(
                                                      currentVersionIndex
                                                  )
                                        }
                                        currentVersionIndex={
                                            currentVersionIndex
                                        }
                                        getDocumentContentById={
                                            getDocumentContentById
                                        }
                                        isCurrentVersion={isCurrentVersion}
                                        isInline={false}
                                        isLoading={
                                            isDocumentsFetching &&
                                            !artifact.content
                                        }
                                        metadata={metadata}
                                        mode={mode}
                                        onSaveContent={saveContent}
                                        setMetadata={setMetadata}
                                        status={artifact.status}
                                        suggestions={[]}
                                        title={artifact.title}
                                    />
                                )}
                            </ArtifactErrorBoundary>

                            <AnimatePresence>
                                {isCurrentVersion && (
                                    <Toolbar
                                        artifactKind={artifact.kind}
                                        isToolbarVisible={isToolbarVisible}
                                        sendMessage={sendMessage}
                                        setIsToolbarVisible={
                                            setIsToolbarVisible
                                        }
                                        setMessages={setMessages}
                                        status={status}
                                        stop={stop}
                                    />
                                )}
                            </AnimatePresence>
                        </div>

                        <AnimatePresence>
                            {!isCurrentVersion && (
                                <VersionFooter
                                    currentVersionIndex={currentVersionIndex}
                                    documents={documents}
                                    handleVersionChange={handleVersionChange}
                                />
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export const Artifact = memo(PureArtifact, (prevProps, nextProps) => {
    if (prevProps.status !== nextProps.status) {
        return false;
    }
    if (!equal(prevProps.votes, nextProps.votes)) {
        return false;
    }
    if (prevProps.input !== nextProps.input) {
        return false;
    }
    if (!equal(prevProps.messages, nextProps.messages)) {
        return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
        return false;
    }
    // Check props that affect rendering
    if (prevProps.isReadonly !== nextProps.isReadonly) {
        return false;
    }
    if (prevProps.selectedModelId !== nextProps.selectedModelId) {
        return false;
    }
    if (!equal(prevProps.attachments, nextProps.attachments)) {
        return false;
    }

    return true;
});
