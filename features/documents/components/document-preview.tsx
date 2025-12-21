"use client";

import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { Loader } from "@/components/ai-elements/loader";
import type { ArtifactKind, UIArtifact } from "@/features/artifacts";
import { useArtifact } from "@/features/artifacts";
import type { Document } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

import { InlineDocumentSkeleton } from "./document-skeleton";
import { CodePreview } from "./renderers/code-preview";
import { ImagePreview } from "./renderers/image-preview";
import { SheetPreview } from "./renderers/sheet-preview";
import { TextPreview } from "./renderers/text-preview";

// =============================================================================
// ICONS
// =============================================================================

function FileIcon({ size = 16 }: { size?: number }) {
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
                d="M14.5 13.5V6.5V5.41421C14.5 5.149 14.3946 4.89464 14.2071 4.70711L9.79289 0.292893C9.60536 0.105357 9.351 0 9.08579 0H8H3H1.5V1.5V13.5C1.5 14.8807 2.61929 16 4 16H12C13.3807 16 14.5 14.8807 14.5 13.5ZM13 13.5V6.5H9.5H8V5V1.5H3V13.5C3 14.0523 3.44772 14.5 4 14.5H12C12.5523 14.5 13 14.0523 13 13.5ZM9.5 5V2.12132L12.3787 5H9.5ZM5.13 5.00062H4.505V6.25062H5.13H6H6.625V5.00062H6H5.13ZM4.505 8H5.13H11H11.625V9.25H11H5.13H4.505V8ZM5.13 11H4.505V12.25H5.13H11H11.625V11H11H5.13Z"
                fill="currentColor"
                fillRule="evenodd"
            />
        </svg>
    );
}

function ImageIcon({ size = 16 }: { size?: number }) {
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
                d="M14.5 2.5H1.5V9.18933L2.96966 7.71967L3.18933 7.5H3.49999H6.63001H6.93933L6.96966 7.46967L10.4697 3.96967L11.5303 3.96967L14.5 6.93934V2.5ZM8.00066 8.55999L9.53034 10.0897L10.0607 10.62L9.00001 11.6807L8.46968 11.1503L6.31935 9H3.81065L1.53032 11.2803L1.5 11.3106V12.5C1.5 13.0523 1.94772 13.5 2.5 13.5H13.5C14.0523 13.5 14.5 13.0523 14.5 12.5V9.06066L11 5.56066L8.03032 8.53033L8.00066 8.55999ZM4.05312e-06 10.8107V12.5C4.05312e-06 13.8807 1.11929 15 2.5 15H13.5C14.8807 15 16 13.8807 16 12.5V9.56066L16.5607 9L16.0303 8.46967L16 8.43934V2.5V1H14.5H1.5H4.05312e-06V2.5V10.6893L-0.0606689 10.75L4.05312e-06 10.8107Z"
                fill="currentColor"
                fillRule="evenodd"
            />
        </svg>
    );
}

function FullscreenIcon({ size = 16 }: { size?: number }) {
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
                d="M1 5.25V6H2.5V5.25V2.5H5.25H6V1H5.25H2C1.44772 1 1 1.44772 1 2V5.25ZM5.25 14.9994H6V13.4994H5.25H2.5V10.7494V9.99939H1V10.7494V13.9994C1 14.5517 1.44772 14.9994 2 14.9994H5.25ZM15 10V10.75V14C15 14.5523 14.5523 15 14 15H10.75H10V13.5H10.75H13.5V10.75V10H15ZM10.75 1H10V2.5H10.75H13.5V5.25V6H15V5.25V2C15 1.44772 14.5523 1 14 1H10.75Z"
                fill="currentColor"
                fillRule="evenodd"
            />
        </svg>
    );
}

// =============================================================================
// FETCHER
// =============================================================================

const fetcher = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Failed to fetch document");
    }
    return response.json();
};

// =============================================================================
// TYPES
// =============================================================================

type DocumentLike = Pick<Document, "title" | "kind" | "content">;

export type DocumentPreviewProps = {
    /** Whether the chat is in readonly mode */
    isReadonly?: boolean;
    /** Tool result data */
    result?: {
        id?: string;
        title?: string;
        kind?: string;
    };
    /** Tool call arguments */
    args?: {
        title?: string;
        kind?: string;
        id?: string;
    };
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

type LoadingSkeletonProps = {
    artifactKind: ArtifactKind;
};

function LoadingSkeleton({ artifactKind }: LoadingSkeletonProps) {
    return (
        <div className="w-full">
            <div className="flex h-[57px] flex-row items-center justify-between gap-2 rounded-t-2xl border border-b-0 p-4 dark:border-zinc-700 dark:bg-muted">
                <div className="flex flex-row items-center gap-3">
                    <div className="text-muted-foreground">
                        <div className="size-4 animate-pulse rounded-md bg-muted-foreground/20" />
                    </div>
                    <div className="h-4 w-24 animate-pulse rounded-lg bg-muted-foreground/20" />
                </div>
                <div>
                    <FullscreenIcon />
                </div>
            </div>
            {artifactKind === "image" ? (
                <div className="overflow-y-scroll rounded-b-2xl border border-t-0 bg-muted dark:border-zinc-700">
                    <div className="h-[257px] w-full animate-pulse bg-muted-foreground/20" />
                </div>
            ) : (
                <div className="overflow-y-scroll rounded-b-2xl border border-t-0 bg-muted p-8 pt-4 dark:border-zinc-700">
                    <InlineDocumentSkeleton />
                </div>
            )}
        </div>
    );
}

type HitboxLayerProps = {
    hitboxRef: React.RefObject<HTMLDivElement | null>;
    result: DocumentPreviewProps["result"];
    setArtifact: (
        updater: UIArtifact | ((current: UIArtifact) => UIArtifact)
    ) => void;
};

const PureHitboxLayer = memo(function HitboxLayer({
    hitboxRef,
    result,
    setArtifact,
}: HitboxLayerProps) {
    const handleClick = useCallback(
        (event: React.MouseEvent<HTMLElement>) => {
            const boundingBox = event.currentTarget.getBoundingClientRect();

            setArtifact((artifact) =>
                artifact.status === "streaming"
                    ? { ...artifact, isVisible: true }
                    : {
                          ...artifact,
                          title: result?.title ?? "",
                          documentId: result?.id ?? "",
                          kind: (result?.kind as ArtifactKind) ?? "text",
                          isVisible: true,
                          boundingBox: {
                              left: boundingBox.x,
                              top: boundingBox.y,
                              width: boundingBox.width,
                              height: boundingBox.height,
                          },
                      }
            );
        },
        [setArtifact, result]
    );

    return (
        <div
            aria-hidden="true"
            className="absolute top-0 left-0 z-10 size-full rounded-xl"
            onClick={handleClick}
            ref={hitboxRef}
            role="presentation"
        >
            <div className="flex w-full items-center justify-end p-4">
                <div className="absolute top-[13px] right-[9px] rounded-md p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700">
                    <FullscreenIcon />
                </div>
            </div>
        </div>
    );
});

type DocumentHeaderProps = {
    title: string;
    kind: ArtifactKind;
    isStreaming: boolean;
};

const PureDocumentHeader = memo(function DocumentHeader({
    title,
    kind,
    isStreaming,
}: DocumentHeaderProps) {
    return (
        <div className="flex flex-row items-start justify-between gap-2 rounded-t-2xl border border-b-0 p-4 sm:items-center dark:border-zinc-700 dark:bg-muted">
            <div className="flex flex-row items-start gap-3 sm:items-center">
                <div className="text-muted-foreground">
                    {isStreaming ? (
                        <Loader />
                    ) : kind === "image" ? (
                        <ImageIcon />
                    ) : (
                        <FileIcon />
                    )}
                </div>
                <div className="-translate-y-1 font-medium sm:translate-y-0">
                    {title}
                </div>
            </div>
            <div className="w-8" />
        </div>
    );
});

type DocumentContentProps = {
    document: DocumentLike;
};

function DocumentContent({ document }: DocumentContentProps) {
    const containerClassName = cn(
        "h-[257px] overflow-y-scroll rounded-b-2xl border border-t-0 dark:border-zinc-700 dark:bg-muted",
        {
            "p-4 sm:px-14 sm:py-16": document.kind === "text",
            "p-0": document.kind === "code",
            "p-4": document.kind === "sheet" || document.kind === "image",
        }
    );

    const content = document.content ?? "";

    return (
        <div className={containerClassName}>
            {document.kind === "text" ? (
                <TextPreview content={content} />
            ) : document.kind === "code" ? (
                <CodePreview content={content} />
            ) : document.kind === "sheet" ? (
                <SheetPreview content={content} />
            ) : document.kind === "image" ? (
                <ImagePreview content={content} title={document.title} />
            ) : null}
        </div>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Document preview component for inline display in chat.
 * Fetches document by ID and renders preview based on document kind.
 */
export function DocumentPreview({
    isReadonly,
    result,
    args,
}: DocumentPreviewProps) {
    const { artifact, setArtifact } = useArtifact();

    const { data: documents, isLoading: isDocumentsFetching } = useSWR<
        Document[]
    >(result?.id ? `/api/document?id=${result.id}` : null, fetcher);

    const previewDocument = useMemo(() => documents?.[0], [documents]);
    const hitboxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const boundingBox = hitboxRef.current?.getBoundingClientRect();

        if (artifact.documentId && boundingBox) {
            setArtifact((currentArtifact) => ({
                ...currentArtifact,
                boundingBox: {
                    left: boundingBox.x,
                    top: boundingBox.y,
                    width: boundingBox.width,
                    height: boundingBox.height,
                },
            }));
        }
    }, [artifact.documentId, setArtifact]);

    if (isDocumentsFetching) {
        return (
            <LoadingSkeleton
                artifactKind={
                    (result?.kind ?? args?.kind ?? "text") as ArtifactKind
                }
            />
        );
    }

    const document: DocumentLike | null = previewDocument
        ? previewDocument
        : artifact.status === "streaming"
          ? {
                title: artifact.title,
                kind: artifact.kind,
                content: artifact.content,
            }
          : null;

    if (!document) {
        return <LoadingSkeleton artifactKind={artifact.kind} />;
    }

    return (
        <div className="relative w-full cursor-pointer">
            <PureHitboxLayer
                hitboxRef={hitboxRef}
                result={result}
                setArtifact={setArtifact}
            />
            <PureDocumentHeader
                isStreaming={artifact.status === "streaming"}
                kind={document.kind as ArtifactKind}
                title={document.title}
            />
            <DocumentContent document={document} />
        </div>
    );
}
